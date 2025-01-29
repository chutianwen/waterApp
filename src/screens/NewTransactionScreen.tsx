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

  const isBalanceSufficient = transactionType === 'fund' || customer.balance >= totalAmount;
  const requiredFunds = !isBalanceSufficient ? (totalAmount - customer.balance).toFixed(2) : '0';

  // Update amount when calculated amount changes
  React.useEffect(() => {
    if (!adjustedAmount || parseFloat(adjustedAmount) === calculatedAmount) {
      setAdjustedAmount(calculatedAmount.toFixed(2));
    }
  }, [calculatedAmount]);

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
        `This customer's balance ($${customer.balance.toFixed(2)}) is not sufficient for this transaction ($${totalAmount.toFixed(2)}).\n\nRequired additional funds: $${requiredFunds}`,
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
        customerId: customer.id,
        type: transactionType as Transaction['type'],
        amount: totalAmount,
        customerBalance: customer.balance + (transactionType === 'fund' ? totalAmount : -totalAmount),
        notes: note,
        gallons: transactionType === 'fund' ? undefined : gallons,
      };

      // Always create a transaction record
      await storage.addTransaction(newTransaction);

      // For fund transactions, also update the customer's balance
      if (transactionType === 'fund') {
        await storage.updateCustomer(customer.id, {
          balance: customer.balance + totalAmount,
          lastTransaction: new Date().toISOString(),
        });
      }

      // Reset form for next transaction
      if (transactionType === 'fund') {
        setFundAmount('');
      } else {
        setGallons(5);
        setAdjustedAmount('');
      }
      setNote('');

      Alert.alert(
        'Success',
        'Transaction completed successfully!\nYou can start a new transaction or close this screen.',
        [
          {
            text: 'OK',
            style: 'default',
            onPress: () => navigation.goBack(),
          },
        ],
      );
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
      <ScrollView style={styles.container}>
        {/* Customer Profile Section */}
        <View style={styles.profileContainer}>
          <Image
            style={styles.profileImage}
            source={{uri: 'https://placekitten.com/100/100'}}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{customer.name}</Text>
            <Text style={[
              styles.profileBalance,
              !isBalanceSufficient && styles.insufficientBalance
            ]}>
              Balance: ${customer.balance.toFixed(2)}
              {!isBalanceSufficient && (transactionType === 'regular' || transactionType === 'alkaline') && (
                <Text style={styles.warningText}>
                  {`\nNeeds $${requiredFunds} more for this transaction`}
                </Text>
              )}
            </Text>
          </View>
        </View>

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
              Regular Water
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
              Alkaline Water
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transactionTypeButton,
              transactionType === 'fund' && styles.fundTypeButton,
            ]}
            onPress={() => setTransactionType('fund')}>
            <Icon 
              name="wallet-outline" 
              size={24} 
              color={transactionType === 'fund' ? '#FFF' : '#666'} 
            />
            <Text
              style={[
                styles.transactionTypeText,
                transactionType === 'fund' && styles.transactionTypeTextActive,
              ]}>
              Add Fund
            </Text>
          </TouchableOpacity>
        </View>

        {transactionType !== 'fund' ? (
          <>
            {/* Gallons Input */}
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

            {/* Adjusted Amount Input */}
            <Text style={styles.sectionTitle}>Amount (Adjustable)</Text>
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
          </>
        ) : (
          <>
            {/* Fund Amount Input */}
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

        {/* Price Calculation */}
        <View style={styles.priceContainer}>
          <Text style={styles.sectionTitle}>
            {transactionType === 'fund' ? 'Summary' : 'Price Calculation'}
          </Text>
          {transactionType !== 'fund' && (
            <>
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
            </>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>
              {transactionType === 'fund' ? 'Fund Amount:' : 'Final Amount:'}
            </Text>
            <Text style={[styles.totalValue, transactionType === 'fund' && styles.fundTotalValue]}>
              ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Note Input */}
        <Text style={styles.sectionTitle}>Add Note (Optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Enter any additional notes here..."
          value={note}
          onChangeText={setNote}
          multiline
        />
      </ScrollView>

      {/* Complete Transaction Button - Outside ScrollView */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.completeButton, 
            transactionType === 'fund' && styles.fundCompleteButton
          ]}
          onPress={handleCompleteTransaction}>
          <Text style={styles.completeButtonText}>
            Complete {transactionType === 'fund' ? 'Fund Load' : 'Purchase'}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInfo: {
    marginLeft: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileBalance: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  transactionTypeContainer: {
    flexDirection: 'column',
    marginBottom: 24,
    gap: 12,
  },
  transactionTypeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  transactionTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  fundTypeButton: {
    backgroundColor: '#34C759',
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
    marginBottom: 24,
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
  priceContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
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
  fundTotalValue: {
    color: '#34C759',
  },
  fundCompleteButton: {
    backgroundColor: '#34C759',
  },
  insufficientBalance: {
    color: '#FF3B30',
  },
  warningText: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
});

export default NewTransactionScreen; 