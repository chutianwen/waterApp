import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ToastAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import {RootStackParamList} from '../types/navigation';
import * as firebase from '../services/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'New Transaction'>;

type TransactionType = Transaction['type'];

const NewTransactionScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const {customer, lastTransaction} = route.params;

  const [transactionType, setTransactionType] = useState<TransactionType>('regular');
  const [gallons, setGallons] = useState(5);
  const [fundAmount, setFundAmount] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [note, setNote] = useState('');
  const [regularPrice, setRegularPrice] = useState(1.50);
  const [alkalinePrice, setAlkalinePrice] = useState(2.00);
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  const [loading, setLoading] = useState(false);
  
  // Load saved prices when component mounts or comes into focus
  React.useEffect(() => {
    const loadPrices = async () => {
      try {
        const prices = await firebase.getWaterPrices();
        setRegularPrice(prices.regularPrice);
        setAlkalinePrice(prices.alkalinePrice);
      } catch (error) {
        console.error('Error loading prices:', error);
      }
    };

    loadPrices();
  }, []);
  
  // Different prices for different water types
  const pricePerGallon = transactionType === 'alkaline' ? alkalinePrice : regularPrice;
  const calculatedAmount = transactionType === 'fund' ? 
    parseFloat(fundAmount) || 0 : 
    gallons * pricePerGallon;
  
  const totalAmount = transactionType === 'fund' ? 
    parseFloat(fundAmount) || 0 : 
    adjustedAmount ? parseFloat(adjustedAmount) : calculatedAmount;

  const isBalanceSufficient = transactionType === 'fund' || currentCustomer.balance >= totalAmount;
  const requiredFunds = !isBalanceSufficient ? (totalAmount - currentCustomer.balance).toFixed(2) : '0';

  // Update amount when calculated amount changes
  React.useEffect(() => {
    if (!adjustedAmount || parseFloat(adjustedAmount) === calculatedAmount) {
      setAdjustedAmount(calculatedAmount.toFixed(2));
    }
  }, [calculatedAmount]);

  // Update balance when customer prop changes
  React.useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  const handleIncrement = () => {
    setGallons(prev => {
      const newGallons = prev + 1;
      const newAmount = (newGallons * pricePerGallon).toFixed(2);
      setAdjustedAmount(newAmount);
      return newGallons;
    });
  };

  const handleDecrement = () => {
    if (gallons > 1) {
      setGallons(prev => {
        const newGallons = prev - 1;
        const newAmount = (newGallons * pricePerGallon).toFixed(2);
        setAdjustedAmount(newAmount);
        return newGallons;
      });
    }
  };

  // Update amount when gallons or price changes
  React.useEffect(() => {
    if (transactionType !== 'fund') {
      const newAmount = (gallons * pricePerGallon).toFixed(2);
      setAdjustedAmount(newAmount);
    }
  }, [gallons, pricePerGallon, transactionType]);

  // Update amount when transaction type changes
  React.useEffect(() => {
    if (transactionType === 'fund') {
      setAdjustedAmount('');
    } else {
      const newAmount = (gallons * pricePerGallon).toFixed(2);
      setAdjustedAmount(newAmount);
    }
  }, [transactionType]);

  const checkDuplicateTransaction = () => {
    if (!lastTransaction) return false;

    const timeDiff = Date.now() - new Date(lastTransaction.createdAt).getTime();
    const isWithin5Minutes = timeDiff < 5 * 60 * 1000;

    if (isWithin5Minutes) {
      if (
        transactionType !== 'fund' &&
        lastTransaction.type === transactionType &&
        lastTransaction.amount === totalAmount
      ) {
        return true;
      }
    }
    return false;
  };

  const handleCompleteTransaction = () => {
    if (transactionType === 'fund' && (!fundAmount || parseFloat(fundAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid fund amount');
      return;
    }

    // Check if customer has sufficient balance for water purchase
    if (!isBalanceSufficient) {
      Alert.alert(
        'Insufficient Balance',
        `This customer's balance ($${currentCustomer.balance.toFixed(2)}) is not sufficient for this transaction ($${totalAmount.toFixed(2)}).\n\nRequired additional funds: $${requiredFunds}`,
        [
          {
            text: 'Add Funds',
            onPress: () => setTransactionType('fund'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
      return;
    }

    const isDuplicate = checkDuplicateTransaction();
    if (isDuplicate) {
      Alert.alert(
        'Possible Duplicate',
        'This appears to be a duplicate of a recent transaction. Do you want to proceed?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Proceed',
            onPress: () => createTransaction(),
          },
        ],
      );
    } else {
      createTransaction();
    }
  };

  const createTransaction = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const newBalance = currentCustomer.balance + (transactionType === 'fund' ? totalAmount : -totalAmount);
      
      const newTransaction = {
        customerId: currentCustomer.id,
        type: transactionType,
        amount: totalAmount,
        customerBalance: newBalance,
        notes: note.trim(),
        gallons: transactionType === 'fund' ? undefined : gallons,
      };

      // Create transaction record and update customer in a batch
      const { transaction: createdTransaction, customer: updatedCustomer } = await firebase.addTransactionAndUpdateCustomer(
        newTransaction,
        {
          balance: newBalance,
          lastTransaction: new Date().toISOString(),
        }
      );

      // Update local state and navigation params
      setCurrentCustomer(updatedCustomer);
      navigation.setParams({ 
        customer: updatedCustomer,
        lastTransaction: createdTransaction 
      });

      // Show success message
      if (transactionType === 'fund') {
        Alert.alert('Success', `$${totalAmount.toFixed(2)} added to ${currentCustomer.name}'s balance.`);
        setFundAmount('');
        setNote('');
      } else {
        const waterType = transactionType === 'regular' ? 'Regular' : 'Alkaline';
        const message = `${gallons} gallons of ${waterType} Water purchased for $${totalAmount.toFixed(2)}`;
        
        if (Platform.OS === 'android') {
          ToastAndroid.showWithGravityAndOffset(
            message,
            ToastAndroid.LONG,
            ToastAndroid.TOP,
            0,
            100
          );
        } else {
          Alert.alert('Success', message);
        }

        // Reset form
        setGallons(5);
        setNote('');
        setAdjustedAmount('');
      }

      // Clear Firebase cache to ensure fresh data
      firebase.clearCache('customers');
      firebase.clearCache('transactions');

    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to complete transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Please select a customer first</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.customerName}>{currentCustomer.name}</Text>
          <Text style={styles.customerId}>#{currentCustomer.membershipId}</Text>
          <Text style={styles.balance}>
            Balance: ${currentCustomer.balance.toFixed(2)}
          </Text>
        </View>

        <View style={styles.transactionTypeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'regular' && styles.selectedType,
            ]}
            onPress={() => setTransactionType('regular')}
            disabled={loading}>
            <Text
              style={[
                styles.typeText,
                transactionType === 'regular' && styles.selectedTypeText,
              ]}>
              Regular Water
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'alkaline' && styles.selectedType,
            ]}
            onPress={() => setTransactionType('alkaline')}
            disabled={loading}>
            <Text
              style={[
                styles.typeText,
                transactionType === 'alkaline' && styles.selectedTypeText,
              ]}>
              Alkaline Water
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'fund' && styles.selectedType,
            ]}
            onPress={() => setTransactionType('fund')}
            disabled={loading}>
            <Text
              style={[
                styles.typeText,
                transactionType === 'fund' && styles.selectedTypeText,
              ]}>
              Add Funds
            </Text>
          </TouchableOpacity>
        </View>

        {transactionType === 'fund' ? (
          <View style={styles.fundContainer}>
            <Text style={styles.label}>Amount to Add</Text>
            <View style={styles.fundInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.fundInput}
                value={fundAmount}
                onChangeText={(value) => {
                  setFundAmount(value);
                  setAdjustedAmount(value); // Keep both values in sync for fund type
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>
        ) : (
          <View style={styles.gallonsContainer}>
            <Text style={styles.label}>Gallons</Text>
            <View style={styles.gallonsInputContainer}>
              <TouchableOpacity
                style={styles.gallonsButton}
                onPress={handleDecrement}
                disabled={gallons <= 1 || loading}>
                <Icon
                  name="remove"
                  size={24}
                  color={gallons <= 1 ? '#CCC' : '#007AFF'}
                />
              </TouchableOpacity>
              <Text style={styles.gallonsText}>{gallons}</Text>
              <TouchableOpacity
                style={styles.gallonsButton}
                onPress={handleIncrement}
                disabled={loading}>
                <Icon name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceText}>
              ${pricePerGallon.toFixed(2)} per gallon
            </Text>
          </View>
        )}

        {/* Only show amount container for water purchases, not for fund additions */}
        {transactionType !== 'fund' && (
          <View style={styles.amountContainer}>
            <Text style={styles.label}>Total Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={adjustedAmount}
                onChangeText={setAdjustedAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>
        )}

        <View style={styles.noteContainer}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            multiline
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.completeButton, loading && styles.completeButtonDisabled]}
          onPress={handleCompleteTransaction}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Transaction</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balance: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#007AFF',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedTypeText: {
    color: '#FFF',
  },
  gallonsContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  gallonsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
  },
  gallonsButton: {
    padding: 8,
  },
  gallonsText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  priceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  fundContainer: {
    marginBottom: 24,
  },
  fundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#333',
    marginRight: 4,
  },
  fundInput: {
    flex: 1,
    fontSize: 20,
    color: '#333',
    padding: 0,
  },
  amountContainer: {
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    color: '#333',
    padding: 0,
  },
  noteContainer: {
    marginBottom: 24,
  },
  noteInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NewTransactionScreen; 