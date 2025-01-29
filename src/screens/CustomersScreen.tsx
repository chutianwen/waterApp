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
          const loadedCustomers = await storage.getCustomers();
          setCustomers(loadedCustomers);
        } catch (error) {
          console.error('Error loading customers:', error);
        } finally {
          setLoading(false);
        }
      };

      loadCustomers();
    }, [])
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.uniqueId.includes(searchQuery) ||
    customer.balance.toString().includes(searchQuery) ||
    (customer.lastTransaction || '').toLowerCase().includes(searchQuery.toLowerCase())
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
        <View style={styles.nameContainer}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerId}>#{item.uniqueId}</Text>
        </View>
        <Text style={styles.lastTransaction}>
          Last transaction: {item.lastTransaction || 'None'}
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
            placeholder="Search by name, ID, balance or transaction"
            value={searchQuery}
            onChangeText={setSearchQuery}
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomersScreen; 