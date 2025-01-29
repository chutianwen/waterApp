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
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Transaction} from '../types/transaction';
import * as storage from '../services/storage';
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
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const route = useRoute<TransactionScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();

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
        loadedTransactions = await storage.getCustomerTransactions(customerId, pageNum, PAGE_SIZE);
      } else {
        loadedTransactions = await storage.getCustomerTransactions('all', pageNum, PAGE_SIZE);
      }

      // Sort transactions by date (most recent first)
      loadedTransactions.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      if (isRefresh || pageNum === 1) {
        setAllTransactions(loadedTransactions);
        setTransactions(searchQuery ? filterTransactions(loadedTransactions) : loadedTransactions);
      } else {
        setAllTransactions(prev => [...prev, ...loadedTransactions]);
        const newTransactions = [...transactions, ...loadedTransactions];
        setTransactions(searchQuery ? filterTransactions(newTransactions) : newTransactions);
      }

      setHasMore(loadedTransactions.length === PAGE_SIZE);
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

      // For ID search (starts with #)
      if (query.startsWith('#')) {
        return customer.uniqueId.toLowerCase().includes(query.slice(1).toLowerCase());
      }

      // For amount search (starts with $)
      if (query.startsWith('$')) {
        const searchAmount = query.slice(1);
        const transactionAmount = Math.abs(transaction.amount).toFixed(2);
        return transactionAmount.includes(searchAmount);
      }

      // For name search (default)
      return customer.name.toLowerCase().includes(query);
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
    if (!text.trim()) {
      setTransactions(allTransactions);
    } else {
      setTransactions(filterTransactions(allTransactions));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
              #{customer?.uniqueId || ''}
            </Text>
            <Text style={styles.time}>{formatDate(item.createdAt || '')}</Text>
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
    if (!loading || refreshing) return null;
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
            placeholder="Search by name, #ID, or $amount"
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
    paddingTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 0,
    gap: 8,
  },
  transactionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  customerId: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
    color: '#666',
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  detailsLeft: {
    flex: 1,
  },
  type: {
    fontSize: 13,
    color: '#666',
  },
  newBalance: {
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
  },
  fundAmount: {
    color: '#34C759',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default TransactionScreen; 