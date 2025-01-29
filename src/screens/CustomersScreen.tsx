import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Customer} from '../types/customer';
import {RootStackParamList} from '../types/navigation';
import * as storage from '../services/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CustomersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('Alphabetical');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Load customers when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadCustomers = async () => {
        try {
          setLoading(true);
          // Always fetch fresh data from storage
          const loadedCustomers = await storage.getCustomers();
          setCustomers(loadedCustomers);
        } catch (error) {
          console.error('Error loading customers:', error);
          Alert.alert('Error', 'Failed to load customers. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      loadCustomers();
      return () => {
        // Clean up any subscriptions or pending operations
      };
    }, [])
  );

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    const name = customer.name.toLowerCase();
    
    // For single character search, match only the start of the name
    if (query.length === 1) {
      return name.startsWith(query);
    }
    
    // For longer searches, use includes and check all fields
    return (
      name.includes(query) ||
      (customer.uniqueId?.includes(searchQuery) ?? false) ||
      customer.balance.toString().includes(searchQuery) ||
      (customer.lastTransaction || '').toLowerCase().includes(query)
    );
  });

  const handleCustomerPress = (customer: Customer) => {
    // Fetch latest customer data before navigating
    const refreshedCustomer = customers.find(c => c.id === customer.id);
    navigation.navigate('New Transaction', {
      customer: refreshedCustomer || customer,
      lastTransaction: undefined
    });
  };

  const handleOptionsPress = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowOptions(true);
  };

  const handleViewTransactions = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      navigation.navigate('History', {
        screen: 'TransactionList',
        params: {
          customer
        }
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
        <Text style={styles.customerId}>#{item.uniqueId}</Text>
        <Text style={styles.lastTransaction}>
          Last transaction: {formatDate(item.lastTransaction) || 'None'}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <Text style={styles.balance}>${(item.balance || 0).toFixed(2)}</Text>
        <TouchableOpacity 
          style={styles.optionsButton}
          onPress={() => handleOptionsPress(item.id)}>
          <Icon name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Add date formatting function
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

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
            placeholder="Search by name, ID, or balance"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          )}
        />
      )}

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
    marginBottom: 16,
  },
  searchInputContainer: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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
  },
  customerId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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