import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Transaction} from '../types/transaction';

// Mock data for transactions
const initialTransactions: Transaction[] = [
  {
    id: '1',
    date: 'Mar 15, 2024',
    time: '2:30 PM',
    waterType: 'Purified Water',
    gallons: 5,
    amount: 25.00,
    customerName: 'Emma Thompson',
    customerBalance: 150.00,
    status: 'Just Completed',
  },
  {
    id: '2',
    date: 'Mar 14, 2024',
    time: '11:45 AM',
    waterType: 'Spring Water',
    gallons: 3,
    amount: 15.00,
    customerName: 'Michael Chen',
    customerBalance: 85.00,
  },
  {
    id: '3',
    date: 'Mar 13, 2024',
    time: '9:15 AM',
    waterType: 'Alkaline Water',
    gallons: 4,
    amount: 24.00,
    customerName: 'Sarah Williams',
    customerBalance: 210.00,
  },
  {
    id: '4',
    date: 'Mar 12, 2024',
    time: '3:20 PM',
    waterType: 'Mineral Water',
    gallons: 6,
    amount: 30.00,
    customerName: 'James Rodriguez',
    customerBalance: 175.00,
  },
  {
    id: '5',
    date: 'Mar 11, 2024',
    time: '1:00 PM',
    waterType: 'Purified Water',
    gallons: 2,
    amount: 10.00,
    customerName: 'Linda Martinez',
    customerBalance: 95.00,
  },
];

const TransactionScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAmount: '',
    maxAmount: '',
    customerName: '',
    startDate: '',
    endDate: '',
  });

  const applyFilters = (transaction: Transaction): boolean => {
    const matchesName = filters.customerName
      ? transaction.customerName.toLowerCase().includes(filters.customerName.toLowerCase())
      : true;

    const matchesMinAmount = filters.minAmount
      ? transaction.amount >= parseFloat(filters.minAmount)
      : true;

    const matchesMaxAmount = filters.maxAmount
      ? transaction.amount <= parseFloat(filters.maxAmount)
      : true;

    return matchesName && matchesMinAmount && matchesMaxAmount;
  };

  const filteredTransactions = transactions.filter(applyFilters);

  const handleUndo = (transactionId: string) => {
    // Implement undo logic here
    console.log('Undo transaction:', transactionId);
  };

  const renderTransactionItem = ({item}: {item: Transaction}) => (
    <View style={[styles.transactionCard, item.status === 'Just Completed' && styles.justCompletedCard]}>
      <View style={styles.transactionHeader}>
        <View>
          {item.status === 'Just Completed' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Just Completed</Text>
            </View>
          )}
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => handleUndo(item.id)}>
            <Icon name="arrow-undo" size={16} color="#FF3B30" />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.waterType}>{item.waterType}</Text>
          <Text style={styles.gallons}>{item.gallons} gallons</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.balanceText}>Balance: ${item.customerBalance.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterForm}>
            <Text style={styles.filterLabel}>Amount Range</Text>
            <View style={styles.rangeInputs}>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                placeholder="Min"
                value={filters.minAmount}
                onChangeText={(text) => setFilters({...filters, minAmount: text})}
                keyboardType="decimal-pad"
              />
              <Text style={styles.rangeSeparator}>to</Text>
              <TextInput
                style={[styles.filterInput, styles.rangeInput]}
                placeholder="Max"
                value={filters.maxAmount}
                onChangeText={(text) => setFilters({...filters, maxAmount: text})}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.filterLabel}>Customer Name</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Enter customer name"
              value={filters.customerName}
              onChangeText={(text) => setFilters({...filters, customerName: text})}
            />

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterButton, styles.resetButton]}
                onPress={() => {
                  setFilters({
                    minAmount: '',
                    maxAmount: '',
                    customerName: '',
                    startDate: '',
                    endDate: '',
                  });
                }}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, styles.applyButton]}
                onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}>
          <Icon name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.transactionList}
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  transactionList: {
    padding: 16,
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  justCompletedCard: {
    backgroundColor: '#EBF5FF',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  undoText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waterType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  gallons: {
    fontSize: 16,
    color: '#666',
  },
  customerInfo: {
    marginTop: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  filterForm: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rangeInput: {
    flex: 1,
    marginBottom: 0,
  },
  rangeSeparator: {
    color: '#666',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#F8F9FA',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  resetButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionScreen; 