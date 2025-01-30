import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Transaction} from '../types/transaction';
import * as firebase from '../services/firebase';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {Customer} from '../types/customer';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TransactionScreenRouteProp = RouteProp<RootStackParamList, 'History'>;

const PAGE_SIZE = 20;

const TransactionScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const route = useRoute<TransactionScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInitialData();
      return () => {
        // Clean up
        setTransactions([]);
        setPage(1);
        setHasMore(true);
      };
    }, [])
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load customers for name display
      const loadedCustomers = await firebase.getCustomers(1, 100);
      setCustomers(loadedCustomers.customers);

      // Load transactions
      const customerId = route.params?.params?.customer?.id;
      const result = await firebase.getCustomerTransactions(customerId || 'all', 1, PAGE_SIZE);
      setTransactions(result.transactions);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (!hasMore || loading || isSearching) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const customerId = route.params?.params?.customer?.id;
      const result = await firebase.getCustomerTransactions(customerId || 'all', nextPage, PAGE_SIZE);
      setTransactions(prev => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more transactions:', error);
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
      const results = await firebase.searchTransactions(text.trim());
      setTransactions(results);
      setHasMore(false); // No pagination for search results
    } catch (error) {
      console.error('Error searching transactions:', error);
      Alert.alert('Error', 'Failed to search transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderTransactionItem = ({item}: {item: Transaction}) => {
    const customer = customers.find(c => c.id === item.customerId);
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {customer?.name || 'Unknown Customer'}
            </Text>
            <Text style={styles.customerId}>
              #{item.membershipId || ''}
            </Text>
            <Text style={styles.time}>{item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}</Text>
          </View>
          <Text style={[styles.amount, item.type === 'fund' && styles.fundAmount]}>
            {item.type === 'fund' ? '+' : '-'}${item.amount.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.detailsLeft}>
            <Text style={styles.type}>
              {item.type === 'fund' ? 'Fund Added' : 
               `${item.type === 'regular' ? 'Regular' : 'Alkaline'} Water - ${item.gallons || 0} gallons`}
            </Text>
          </View>
          <Text style={styles.newBalance}>
            New Balance: ${item.customerBalance.toFixed(2)}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
      </View>
    );
  };

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
      <Text style={styles.title}>Transaction History</Text>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name or membership ID"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id || ''}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreTransactions}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
    marginTop: 8,
    marginHorizontal: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
    color: '#8E8E93',
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '400',
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
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  transactionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  customerId: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
    letterSpacing: -0.24,
  },
  time: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  amount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: -0.5,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  detailsLeft: {
    flex: 1,
  },
  type: {
    fontSize: 15,
    color: '#3C3C43',
    letterSpacing: -0.24,
  },
  newBalance: {
    fontSize: 15,
    color: '#3C3C43',
    marginLeft: 12,
    letterSpacing: -0.24,
    fontWeight: '500',
  },
  fundAmount: {
    color: '#34C759',
  },
  notes: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    letterSpacing: -0.24,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default TransactionScreen; 