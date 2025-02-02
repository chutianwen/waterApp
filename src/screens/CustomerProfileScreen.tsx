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
import Icon from 'react-native-vector-icons/Ionicons';
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
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderTransactionItem = ({item, index}: {item: Transaction; index: number}) => {
    const itemKey = `transaction-${index}-${item.createdAt || Date.now()}`;
    return (
      <View key={itemKey} style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={styles.typeContainer}>
              <Icon 
                name={item.type === 'fund' ? 'wallet-outline' : 'water-outline'} 
                size={20} 
                color={item.type === 'fund' ? '#34C759' : '#007AFF'} 
                style={styles.typeIcon}
              />
              <Text style={[
                styles.transactionType,
                item.type === 'fund' ? styles.fundType : styles.waterType
              ]}>
                {item.type === 'fund' ? 'Fund Added' : 
                 `${item.type === 'regular' ? 'Regular' : 'Alkaline'} Water`}
              </Text>
            </View>
            {item.type !== 'fund' && (
              <Text style={styles.gallons}>{item.gallons} gallons</Text>
            )}
            <Text style={styles.transactionDate}>
              {item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}
            </Text>
          </View>
          <Text style={[styles.amount, item.type === 'fund' ? styles.fundAmount : styles.debitAmount]}>
            {item.type === 'fund' ? '+' : '-'}${item.amount.toFixed(2)}
          </Text>
        </View>
        {item.notes && (
          <View style={styles.notesContainer}>
            <Icon name="chatbox-outline" size={16} color="#8E8E93" style={styles.notesIcon} />
            <Text style={styles.notes}>{item.notes}</Text>
          </View>
        )}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance after transaction:</Text>
          <Text style={styles.balanceAmount}>${item.customerBalance.toFixed(2)}</Text>
        </View>
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
        <View style={styles.nameSection}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerId}>#{customer.membershipId}</Text>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Current Balance</Text>
          <Text style={styles.balance}>${customer.balance.toFixed(2)}</Text>
        </View>
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
              <View style={styles.emptyContainer}>
                <Icon name="document-text-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  nameSection: {
    marginBottom: 16,
  },
  customerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  customerId: {
    fontSize: 17,
    color: '#8E8E93',
    letterSpacing: -0.4,
  },
  balanceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  balanceTitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
    letterSpacing: -0.24,
  },
  balance: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  transactionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginHorizontal: 16,
    marginVertical: 16,
    letterSpacing: -0.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionItem: {
    backgroundColor: '#FFF',
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
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeIcon: {
    marginRight: 6,
  },
  transactionType: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  waterType: {
    color: '#007AFF',
  },
  fundType: {
    color: '#34C759',
  },
  gallons: {
    fontSize: 15,
    color: '#3C3C43',
    marginBottom: 4,
    letterSpacing: -0.24,
  },
  transactionDate: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  amount: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  debitAmount: {
    color: '#FF3B30',
  },
  fundAmount: {
    color: '#34C759',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  notesIcon: {
    marginRight: 6,
  },
  notes: {
    flex: 1,
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  balanceLabel: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loader: {
    marginTop: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 12,
    letterSpacing: -0.4,
  },
});

export default CustomerProfileScreen; 