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
import * as firebase from '../services/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CustomersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Load customers when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInitialData();
      return () => {
        // Clean up
        setCustomers([]);
        setPage(1);
        setHasMore(true);
      };
    }, [])
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const result = await firebase.getCustomers(1, 20);
      setCustomers(result.customers);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCustomers = async () => {
    if (!hasMore || loading || isSearching) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const result = await firebase.getCustomers(nextPage, 20);
      setCustomers(prev => [...prev, ...result.customers]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    
    if (!text.trim()) {
      setIsSearching(false);
      await loadInitialData();
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      const results = await firebase.searchCustomers(text.trim());
      setCustomers(results);
      setHasMore(false); // No pagination for search results
    } catch (error) {
      console.error('Error searching customers:', error);
      Alert.alert('Error', 'Failed to search customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate('New Transaction', {
      customer,
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

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'New Customer') {
      return 'No transactions yet';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'No transactions yet';
      }
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return 'No transactions yet';
    }
  };

  const renderCustomerItem = ({item}: {item: Customer}) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => handleCustomerPress(item)}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerId}>#{item.uniqueId}</Text>
        <Text style={styles.lastTransaction}>
          {formatDate(item.lastTransaction)}
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

  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
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
            placeholder="Search by name or #ID"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading && customers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomerItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          onEndReached={loadMoreCustomers}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default CustomersScreen; 