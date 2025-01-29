import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Transaction} from '../types/transaction';
import * as storage from '../services/storage';
import {useRoute} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';
import {Customer} from '../types/customer';

type TransactionScreenRouteProp = RouteProp<RootStackParamList, 'History'>;

const PAGE_SIZE = 20;

const TransactionScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const route = useRoute<TransactionScreenRouteProp>();

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInitialData();
    }, [])
  );

  const loadInitialData = async () => {
    setPage(1);
    setHasMore(true);
    await loadData(1, true);
  };

  const loadData = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      // Load customers first
      const loadedCustomers = await storage.getCustomers();
      setCustomers(loadedCustomers);

      // Then load transactions
      let loadedTransactions;
      const customerId = route.params?.params?.customer?.id;
      
      if (customerId) {
        // Load transactions for specific customer
        loadedTransactions = await storage.getCustomerTransactions(customerId, pageNum, PAGE_SIZE);
      } else {
        // Load all transactions for the main history tab
        loadedTransactions = await storage.getCustomerTransactions('all', pageNum, PAGE_SIZE);
      }

      // Sort transactions by date (most recent first)
      loadedTransactions.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Filter transactions based on search query
      const filteredTransactions = filterTransactions(loadedTransactions);

      if (isRefresh || pageNum === 1) {
        setTransactions(filteredTransactions);
      } else {
        setTransactions(prev => [...prev, ...filteredTransactions]);
      }

      setHasMore(filteredTransactions.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTransactions = (transactionList: Transaction[]): Transaction[] => {
    if (!searchQuery.trim()) return transactionList;

    const query = searchQuery.toLowerCase().trim();
    return transactionList.filter(transaction => {
      const customer = customers.find(c => c.id === transaction.customerId);
      if (!customer) return false;

      // Search by customer name
      const nameMatch = customer.name.toLowerCase().includes(query);
      
      // Search by customer ID
      const idMatch = customer.uniqueId.includes(query);
      
      // Search by amount
      const amountString = transaction.amount.toFixed(2);
      const amountMatch = amountString.includes(query);
      
      // Search by transaction type
      const typeMatch = transaction.type.toLowerCase().includes(query);
      
      // Search by date
      const date = new Date(transaction.createdAt || 0);
      const dateString = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).toLowerCase();
      const dateMatch = dateString.includes(query);

      return nameMatch || idMatch || amountMatch || typeMatch || dateMatch;
    });
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage);
    }
  };

  const handleRefresh = () => {
    loadInitialData();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    loadInitialData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  const renderTransactionItem = ({item}: {item: Transaction}) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View>
          <Text style={styles.date}>{formatDate(item.createdAt || '')}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt || '')}</Text>
        </View>
        <Text style={[styles.amount, item.type === 'fund' && styles.fundAmount]}>
          {item.type === 'fund' ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.detailsLeft}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {customers.find(c => c.id === item.customerId)?.name || 'Unknown Customer'}
            </Text>
            <Text style={styles.customerId}>
              #{customers.find(c => c.id === item.customerId)?.uniqueId || ''}
            </Text>
          </View>
          <Text style={styles.type}>
            {item.type === 'fund' ? 'Fund Added' : 
             `${item.type === 'regular' ? 'Regular' : 'Alkaline'} Water - ${item.gallons || 0} gallons`}
          </Text>
        </View>
        <Text style={styles.balance}>
          Balance: ${item.customerBalance.toFixed(2)}
        </Text>
      </View>
      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {route.params?.params?.customer ? `${route.params.params.customer.name}'s Transactions` : 'Transaction History'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, amount, or date"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading && page === 1 ? (
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
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
  listContainer: {
    gap: 12,
  },
  transactionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsLeft: {
    flex: 1,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  customerId: {
    fontSize: 14,
    color: '#666',
  },
  type: {
    fontSize: 14,
    color: '#666',
  },
  balance: {
    fontSize: 14,
    color: '#666',
  },
  fundAmount: {
    color: '#34C759',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default TransactionScreen; 