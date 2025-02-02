import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Transaction} from '../types/transaction';
import * as firebase from '../services/firebase';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import type {BottomTabNavigationProp, BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;
type RouteProps = BottomTabScreenProps<MainTabParamList, 'History'>['route'];

const PAGE_SIZE = 20;

const TransactionScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  // Handle route params for highlighting transactions
  React.useEffect(() => {
    if (route.params?.highlightTransactionId) {
      setHighlightedTransactionId(route.params.highlightTransactionId);
      // Clear the route params to avoid re-highlighting on tab switches
      navigation.setParams({ highlightTransactionId: undefined });
    }
  }, [route.params?.highlightTransactionId]);

  // Clear highlight after 3 seconds
  React.useEffect(() => {
    if (highlightedTransactionId) {
      const timer = setTimeout(() => {
        setHighlightedTransactionId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTransactionId]);

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

      // Check if we can use cached data
      const cachedData = firebase.getCachedTransactions('', 1);
      if (cachedData && firebase.isCacheValid('', 1)) {
        setTransactions(cachedData.data);
        setHasMore(!!cachedData.lastDoc);
        setPage(1);
        setLoading(false);
        return;
      }

      // If cache is invalid or not available, load from Firebase
      const result = await firebase.searchTransactions('', 1, PAGE_SIZE);
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
    if (!hasMore || loading) return;

    try {
      setLoading(true);

      // Check if we can use cached data for pagination
      const cachedData = firebase.getCachedTransactions('', page + 1);
      if (cachedData && firebase.isCacheValid('', page + 1)) {
        setTransactions([...transactions, ...cachedData.data]);
        setHasMore(!!cachedData.lastDoc);
        setPage(page + 1);
        setLoading(false);
        return;
      }

      // If cache is invalid or not available, load from Firebase
      const result = await firebase.searchTransactions('', page + 1, PAGE_SIZE);
      setTransactions([...transactions, ...result.transactions]);
      setHasMore(result.hasMore);
      setPage(page + 1);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      Alert.alert('Error', 'Failed to load more transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    firebase.clearCache('transactions'); // Clear cache for manual refresh
    try {
      // Always load from Firebase for manual refresh
      const result = await firebase.searchTransactions('', 1, PAGE_SIZE, true);
      setTransactions(result.transactions);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      Alert.alert('Error', 'Failed to refresh transactions. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.getParent()?.navigate('New Transaction', {
      customer: {
        id: transaction.customerId,
        name: transaction.customerName,
        membershipId: transaction.membershipId,
        balance: transaction.customerBalance,
      },
      lastTransaction: transaction
    });
  };

  const renderTransactionItem = ({item}: {item: Transaction}) => {
    if (!item.createdAt) return null;
    
    const isHighlighted = item.id === highlightedTransactionId;
    
    return (
      <TouchableOpacity 
        onPress={() => handleTransactionPress(item)}
        style={[
          styles.transactionItem,
          isHighlighted && styles.highlightedTransaction
        ]}>
        <View style={styles.transactionHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customerName || item.membershipId}</Text>
            <Text style={styles.customerId}>#{item.membershipId}</Text>
            <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
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
            Balance: ${item.customerBalance.toFixed(2)}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
        {isHighlighted && (
          <View style={styles.successBadge}>
            <Icon name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.successText}>Transaction Complete</Text>
          </View>
        )}
      </TouchableOpacity>
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

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => `${item.id || Date.now()}-${item.createdAt || Date.now()}`}
          onEndReached={loadMoreTransactions}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
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
    paddingTop: 16,
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
  highlightedTransaction: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  successBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default TransactionScreen; 