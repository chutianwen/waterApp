import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import * as firebase from '../services/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Customer Profile'>;

const PAGE_SIZE = 20;

const CustomerProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const {customer} = route.params;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load customer's transactions when screen mounts
  React.useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const result = await firebase.searchTransactions(customer.membershipId, 1, PAGE_SIZE);
      setTransactions(result.transactions);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (!hasMore || loading) return;

    try {
      const result = await firebase.searchTransactions(
        customer.membershipId,
        page + 1,
        PAGE_SIZE
      );
      setTransactions(prev => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      setPage(p => p + 1);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      Alert.alert('Error', 'Failed to load more transactions. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    firebase.clearCache('transactions');
    try {
      const result = await firebase.searchTransactions(customer.membershipId, 1, PAGE_SIZE, true);
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
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
  };

  const renderTransactionItem = ({item, index}: {item: Transaction; index: number}) => {
    const itemKey = `transaction-${index}-${item.createdAt || Date.now()}`;
    return (
      <View key={itemKey} style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>
              {item.type === 'fund' ? 'Fund Added' : 
               `${item.type === 'regular' ? 'Regular' : 'Alkaline'} Water - ${item.gallons || 0} gallons`}
            </Text>
            <Text style={styles.transactionDate}>
              {item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}
            </Text>
          </View>
          <Text style={[styles.amount, item.type === 'fund' && styles.fundAmount]}>
            {item.type === 'fund' ? '+' : '-'}${item.amount.toFixed(2)}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
        <Text style={styles.balance}>
          Balance: ${item.customerBalance.toFixed(2)}
        </Text>
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
      <View style={styles.profileSection}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerId}>#{customer.membershipId}</Text>
        <Text style={styles.balance}>Balance: ${customer.balance.toFixed(2)}</Text>
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {loading && transactions.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item, index) => `transaction-${index}-${item.createdAt || Date.now()}`}
            onEndReached={loadMoreTransactions}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No transactions found</Text>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  balance: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  transactionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  fundAmount: {
    color: '#34C759',
  },
  notes: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default CustomerProfileScreen; 