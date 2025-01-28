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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Customer} from '../types/customer';
import {RootStackParamList} from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data for customers
const initialCustomers: Customer[] = [
  {
    id: '1',
    name: 'Alexander Thompson',
    balance: 250.00,
    lastTransaction: 'Today',
  },
  {
    id: '2',
    name: 'Benjamin Walker',
    balance: 85.50,
    lastTransaction: 'Yesterday',
  },
  {
    id: '3',
    name: 'Catherine Martinez',
    balance: 20.75,
    lastTransaction: '2 days ago',
  },
  {
    id: '4',
    name: 'Daniel Richardson',
    balance: 75.25,
    lastTransaction: '3 days ago',
  },
  {
    id: '5',
    name: 'Elizabeth Anderson',
    balance: 150.00,
    lastTransaction: '4 days ago',
  },
];

const CustomersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [sortOrder, setSortOrder] = useState('Alphabetical');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.balance.toString().includes(searchQuery) ||
    customer.lastTransaction.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate('New Transaction', {customer});
  };

  const handleOptionsPress = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowOptions(true);
  };

  const handleViewTransactions = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      navigation.navigate('History', {
        screen: 'CustomerTransactions',
        params: {customer},
      });
    }
    setShowOptions(false);
  };

  const renderCustomerItem = ({item}: {item: Customer}) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => handleCustomerPress(item)}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.lastTransaction}>
          Last transaction: {item.lastTransaction}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <Text style={styles.balance}>${item.balance.toFixed(2)}</Text>
        <TouchableOpacity 
          style={styles.optionsButton}
          onPress={() => handleOptionsPress(item.id)}>
          <Icon name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('New Customer')}>
          <Icon name="person-add-outline" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="grid-outline" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.sortButton}>
        <Icon name="funnel-outline" size={16} color="#333" />
        <Text style={styles.sortButtonText}>{sortOrder}</Text>
        <Icon name="chevron-down" size={16} color="#333" />
      </TouchableOpacity>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleViewTransactions}>
              <Icon name="time-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Transaction Log</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  listContainer: {
    gap: 8,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastTransaction: {
    fontSize: 14,
    color: '#666',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionsButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default CustomersScreen; 