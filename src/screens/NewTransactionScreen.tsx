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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import {RootStackParamList} from '../types/navigation';
import * as storage from '../services/storage';

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
  
  // Load saved prices when component mounts or comes into focus
  React.useEffect(() => {
    const loadPrices = async () => {
      try {
        const prices = await storage.getWaterPrices();
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

    const timeDiff = Date.now() - new Date(lastTransaction.date).getTime();
    const isWithin5Minutes = timeDiff < 5 * 60 * 1000;

    if (isWithin5Minutes) {
      const currentWaterType = transactionType === 'regular' ? 'Regular Water' : 'Alkaline Water';
      if (
        transactionType !== 'fund' &&
        lastTransaction.waterType === currentWaterType &&
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
    try {
      const newTransaction = {
        customerId: currentCustomer.id,
        type: transactionType as Transaction['type'],
        amount: totalAmount,
        customerBalance: currentCustomer.balance + (transactionType === 'fund' ? totalAmount : -totalAmount),
        notes: note,
        gallons: transactionType === 'fund' ? undefined : gallons,
      };

      // Create transaction record
      const createdTransaction = await storage.addTransaction(newTransaction);

      // For fund transactions, update customer's balance
      if (transactionType === 'fund') {
        const updatedCustomer = await storage.updateCustomer(currentCustomer.id, {
          balance: currentCustomer.balance + totalAmount,
          lastTransaction: new Date().toISOString(),
        });
        
        // Update local state
        setCurrentCustomer(updatedCustomer);
        
        // Update route params to ensure parent screens have latest data
        if (route.params) {
          navigation.setParams({ 
            customer: updatedCustomer,
            lastTransaction: createdTransaction 
          });
        }
        
        // Show success message and reset form
        Alert.alert('Success', `$${totalAmount.toFixed(2)} added to ${currentCustomer.name}'s balance.`);
        setFundAmount('');
        setNote('');
      } else {
        // For water purchases
        const updatedCustomer = await storage.updateCustomer(currentCustomer.id, {
          balance: currentCustomer.balance - totalAmount,
          lastTransaction: new Date().toISOString(),
        });

        // Update route params to ensure parent screens have latest data
        if (route.params) {
          navigation.setParams({ 
            customer: updatedCustomer,
            lastTransaction: createdTransaction 
          });
        }

        const waterType = transactionType === 'regular' ? 'Regular' : 'Alkaline';
        const message = `${gallons} gallons of ${waterType} Water purchased for $${totalAmount.toFixed(2)}`;
        
        // Show toast message
        if (Platform.OS === 'android') {
          ToastAndroid.showWithGravityAndOffset(
            message,
            ToastAndroid.LONG,
            ToastAndroid.TOP,
            0,
            100
          );
        } else {
          // For iOS, we'll still use Alert but it will be brief
          Alert.alert('Success', message);
        }

        // Navigate back to History screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to complete transaction. Please try again.');
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Customer Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentCustomer.name}</Text>
            <Text style={[
              styles.profileBalance,
              !isBalanceSufficient && styles.insufficientBalance
            ]}>
              Balance: ${currentCustomer.balance.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Transaction Type Selection */}
          <Text style={styles.sectionTitle}>Select Transaction Type</Text>
          <View style={styles.transactionTypeContainer}>
            <TouchableOpacity
              style={[
                styles.transactionTypeButton,
                transactionType === 'regular' && styles.transactionTypeButtonActive,
              ]}
              onPress={() => setTransactionType('regular')}>
              <Icon 
                name="water-outline" 
                size={24} 
                color={transactionType === 'regular' ? '#FFF' : '#666'} 
              />
              <Text
                style={[
                  styles.transactionTypeText,
                  transactionType === 'regular' && styles.transactionTypeTextActive,
                ]}>
                Regular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.transactionTypeButton,
                transactionType === 'alkaline' && styles.transactionTypeButtonActive,
              ]}
              onPress={() => setTransactionType('alkaline')}>
              <Icon 
                name="water" 
                size={24} 
                color={transactionType === 'alkaline' ? '#FFF' : '#666'} 
              />
              <Text
                style={[
                  styles.transactionTypeText,
                  transactionType === 'alkaline' && styles.transactionTypeTextActive,
                ]}>
                Alkaline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.transactionTypeButton,
                transactionType === 'fund' && styles.transactionTypeButtonActive,
              ]}
              onPress={() => setTransactionType('fund')}>
              <Icon 
                name="cash-outline" 
                size={24} 
                color={transactionType === 'fund' ? '#FFF' : '#666'} 
              />
              <Text
                style={[
                  styles.transactionTypeText,
                  transactionType === 'fund' && styles.transactionTypeTextActive,
                ]}>
                Add Funds
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transaction Details */}
          {transactionType !== 'fund' ? (
            <>
              <Text style={styles.sectionTitle}>Gallons</Text>
              <View style={styles.gallonsContainer}>
                <TouchableOpacity style={styles.gallonButton} onPress={handleDecrement}>
                  <Text style={styles.gallonButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.gallonInputContainer}>
                  <Text style={styles.gallonInput}>{gallons}</Text>
                </View>
                <TouchableOpacity style={styles.gallonButton} onPress={handleIncrement}>
                  <Text style={styles.gallonButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Amount</Text>
              <View style={styles.fundInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.fundInput}
                  value={adjustedAmount}
                  onChangeText={setAdjustedAmount}
                  keyboardType="decimal-pad"
                  placeholder={calculatedAmount.toFixed(2)}
                />
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price per gallon:</Text>
                  <Text style={styles.priceValue}>${pricePerGallon.toFixed(2)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total gallons:</Text>
                  <Text style={styles.priceValue}>{gallons}</Text>
                </View>
                {adjustedAmount && parseFloat(adjustedAmount) !== calculatedAmount && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Original amount:</Text>
                    <Text style={styles.priceValue}>${calculatedAmount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Final Amount:</Text>
                  <Text style={[styles.totalValue, {color: '#007AFF'}]}>${totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Fund Amount</Text>
              <View style={styles.fundInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.fundInput}
                  value={fundAmount}
                  onChangeText={setFundAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add any notes here..."
            multiline
          />
        </View>

        {/* Complete Button - Always at bottom */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            transactionType === 'fund' && styles.fundCompleteButton,
          ]}
          onPress={handleCompleteTransaction}>
          <Text style={styles.completeButtonText}>
            {transactionType === 'fund' ? 'Add Funds' : 'Complete Purchase'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 20,
  },
  profileContainer: {
    marginBottom: 24,
  },
  profileInfo: {
    alignItems: 'flex-start',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileBalance: {
    fontSize: 16,
    color: '#666',
  },
  mainContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  transactionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  transactionTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  transactionTypeText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16,
  },
  transactionTypeTextActive: {
    color: '#FFF',
  },
  gallonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  gallonButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallonButtonText: {
    fontSize: 24,
    color: '#333',
  },
  gallonInputContainer: {
    flex: 1,
    alignItems: 'center',
  },
  gallonInput: {
    fontSize: 24,
    fontWeight: '500',
  },
  fundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#333',
    marginRight: 8,
  },
  fundInput: {
    flex: 1,
    fontSize: 24,
    color: '#333',
    padding: 0,
  },
  priceContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    color: '#666',
  },
  priceValue: {
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  noteInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    height: 48,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fundCompleteButton: {
    backgroundColor: '#34C759',
  },
  insufficientBalance: {
    color: '#FF3B30',
  },
});

export default NewTransactionScreen; 