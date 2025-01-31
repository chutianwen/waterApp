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
  const [showEditName, setShowEditName] = useState(false);
  const [editingName, setEditingName] = useState('');
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

  const handleViewCustomerProfile = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
        navigation.navigate('Customer Profile', { customer });
      setShowOptions(false);
    }
  };

  const handleEditName = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      setEditingName(customer.name);
      setShowEditName(true);
      setShowOptions(false);
    }
  };

  const handleSaveName = async () => {
    if (!selectedCustomerId || !editingName.trim()) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    try {
      setLoading(true);
      await firebase.updateCustomer(selectedCustomerId, { 
        name: editingName.trim(),
        membershipId: customer.membershipId,
        balance: customer.balance,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setCustomers(prevCustomers =>
        prevCustomers.map(c =>
          c.id === selectedCustomerId
            ? { ...c, name: editingName.trim() }
            : c
        )
      );
      
      setShowEditName(false);
      setEditingName('');
      Alert.alert('Success', 'Customer name updated successfully');
    } catch (error) {
      console.error('Error updating customer name:', error);
      Alert.alert('Error', 'Failed to update customer name');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.customerId}>#{item.membershipId}</Text>
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

  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchQuery(''); // Clear search
    setIsSearching(false);
    firebase.clearCache('customers'); // Clear cache
    try {
      const result = await firebase.getCustomers(1, 20, true); // Force refresh
      setCustomers(result.customers);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Error refreshing customers:', error);
      Alert.alert('Error', 'Failed to refresh customers. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderOptionsModal = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;

    return (
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
              onPress={handleViewCustomerProfile}>
              <Icon name="time-outline" size={24} color="#333" />
              <Text style={styles.optionText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleEditName}>
              <Icon name="create-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Edit Name</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or membership ID"
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
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          )}
        />
      )}

      {renderOptionsModal()}

      <Modal
        visible={showEditName}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditName(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditName(false)}>
          <View style={styles.editNameContainer}>
            <Text style={styles.editNameTitle}>Edit Customer Name</Text>
            <TextInput
              style={styles.editNameInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Enter new name"
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.editNameButtons}>
              <TouchableOpacity
                style={[styles.editNameButton, styles.cancelButton]}
                onPress={() => setShowEditName(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editNameButton, styles.saveButton]}
                onPress={handleSaveName}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  searchContainer: {
    marginBottom: 16,
    marginTop: 16,
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
  editNameContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  editNameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  editNameInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  editNameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editNameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomersScreen; 