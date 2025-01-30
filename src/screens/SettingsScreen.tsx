import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as firebase from '../services/firebase';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import {WaterPrices} from '../types/settings';

const SettingsScreen = () => {
  const [regularPrice, setRegularPrice] = useState('1.50');
  const [alkalinePrice, setAlkalinePrice] = useState('2.00');
  const [showOptions, setShowOptions] = useState(false);
  const [priceHistory, setPriceHistory] = useState<WaterPrices[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrices();
    loadPriceHistory();
  }, []);

  const loadPrices = async () => {
    try {
      const prices = await firebase.getWaterPrices();
      setRegularPrice(prices.regularPrice.toFixed(2));
      setAlkalinePrice(prices.alkalinePrice.toFixed(2));
    } catch (error) {
      console.error('Error loading prices:', error);
      Alert.alert('Error', 'Failed to load water prices');
    }
  };

  const loadPriceHistory = async () => {
    try {
      const history = await firebase.getPriceHistory();
      setPriceHistory(history);
    } catch (error) {
      console.error('Error loading price history:', error);
      Alert.alert('Error', 'Failed to load price history');
    }
  };

  const handleSavePrices = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const newRegularPrice = parseFloat(regularPrice);
      const newAlkalinePrice = parseFloat(alkalinePrice);

      if (isNaN(newRegularPrice) || isNaN(newAlkalinePrice)) {
        Alert.alert('Error', 'Please enter valid prices');
        return;
      }

      await firebase.updateWaterPrices(newRegularPrice, newAlkalinePrice);
      Alert.alert('Success', 'Prices updated successfully!');
      loadPriceHistory(); // Reload price history after update
    } catch (error) {
      console.error('Error saving prices:', error);
      Alert.alert('Error', 'Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (loading) return;

    try {
      setLoading(true);
      // Get all data from Firebase
      const [customers, transactions, settings] = await Promise.all([
        firebase.getCustomers(1, 1000), // Get up to 1000 customers
        firebase.getCustomerTransactions('all', 1, 1000), // Get up to 1000 transactions
        Promise.all([
          firebase.getWaterPrices(),
          firebase.getPriceHistory()
        ])
      ]);

      // Prepare data for export
      const exportData = {
        customers: customers.customers,
        transactions: transactions.transactions,
        settings: {
          waterPrices: settings[0],
          priceHistory: settings[1]
        }
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);

      // Create export file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `waterapp_export_${timestamp}.json`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(filePath, jsonData, 'utf8');

      // Share the file
      if (Platform.OS === 'ios') {
        await Share.open({
          url: 'file://' + filePath,
          type: 'application/json',
          filename: fileName,
        });
      }

      setShowOptions(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (loading) return;

    try {
      setLoading(true);
      // Pick JSON file
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.json],
        allowMultiSelection: false,
      });

      const result = results[0];
      if (!result.uri) {
        throw new Error('No file selected');
      }

      // Read file contents
      const fileContent = await RNFS.readFile(result.uri, 'utf8');
      const importedData = JSON.parse(fileContent);

      // Validate imported data structure
      if (!importedData.customers || !importedData.transactions || !importedData.settings) {
        throw new Error('Invalid data format');
      }

      // Import data to Firebase
      await firebase.importData(importedData);

      Alert.alert('Success', 'Data imported successfully!');
      setShowOptions(false);
      
      // Reload data
      loadPrices();
      loadPriceHistory();
      
      // Clear cache to ensure fresh data
      firebase.clearAllCache();
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return;
      }
      console.error('Error importing data:', error);
      Alert.alert('Error', 'Failed to import data. Please ensure the file is in the correct format.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  const renderPriceHistoryItem = (item: WaterPrices) => (
    <View style={styles.historyItem} key={item.updatedAt}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{formatDate(item.updatedAt)}</Text>
      </View>
      <View style={styles.historyPrices}>
        <Text style={styles.historyPrice}>
          Regular: ${item.regularPrice.toFixed(2)}
        </Text>
        <Text style={styles.historyPrice}>
          Alkaline: ${item.alkalinePrice.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const handlePriceIncrement = (type: 'regular' | 'alkaline') => {
    if (type === 'regular') {
      const newPrice = (Math.round((parseFloat(regularPrice) + 0.1) * 10) / 10).toFixed(1);
      setRegularPrice(newPrice);
    } else {
      const newPrice = (Math.round((parseFloat(alkalinePrice) + 0.1) * 10) / 10).toFixed(1);
      setAlkalinePrice(newPrice);
    }
  };

  const handlePriceDecrement = (type: 'regular' | 'alkaline') => {
    if (type === 'regular') {
      const newPrice = Math.max(0, Math.round((parseFloat(regularPrice) - 0.1) * 10) / 10);
      setRegularPrice(newPrice.toFixed(1));
    } else {
      const newPrice = Math.max(0, Math.round((parseFloat(alkalinePrice) - 0.1) * 10) / 10);
      setAlkalinePrice(newPrice.toFixed(1));
    }
  };

  const handlePriceChange = (value: string, type: 'regular' | 'alkaline') => {
    // Remove any non-numeric characters except decimal point
    const cleanedValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedValue.split('.');
    const formattedValue = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleanedValue;
    
    // Format to one decimal place if there's a decimal point
    if (formattedValue.includes('.')) {
      const [whole, decimal] = formattedValue.split('.');
      const formatted = `${whole}.${decimal.slice(0, 1)}`;
      type === 'regular' ? setRegularPrice(formatted) : setAlkalinePrice(formatted);
    } else {
      type === 'regular' ? setRegularPrice(formattedValue) : setAlkalinePrice(formattedValue);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={() => setShowOptions(true)}
            disabled={loading}>
            <Icon name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Water Prices</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Regular Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <TouchableOpacity 
                style={styles.priceButton}
                onPress={() => handlePriceDecrement('regular')}
                disabled={loading}>
                <Icon name="remove" size={24} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.priceWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={regularPrice}
                  onChangeText={(value) => handlePriceChange(value, 'regular')}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
              <TouchableOpacity 
                style={styles.priceButton}
                onPress={() => handlePriceIncrement('regular')}
                disabled={loading}>
                <Icon name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Alkaline Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <TouchableOpacity 
                style={styles.priceButton}
                onPress={() => handlePriceDecrement('alkaline')}
                disabled={loading}>
                <Icon name="remove" size={24} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.priceWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={alkalinePrice}
                  onChangeText={(value) => handlePriceChange(value, 'alkaline')}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
              <TouchableOpacity 
                style={styles.priceButton}
                onPress={() => handlePriceIncrement('alkaline')}
                disabled={loading}>
                <Icon name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSavePrices}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          {priceHistory.map(renderPriceHistoryItem)}
        </View>
      </ScrollView>

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
              onPress={handleExport}
              disabled={loading}>
              <Icon name="download-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleImport}
              disabled={loading}>
              <Icon name="cloud-upload-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Import Data</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  optionsButton: {
    padding: 8,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
  },
  priceButton: {
    padding: 8,
  },
  priceWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#333',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    color: '#333',
    padding: 0,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyPrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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

export default SettingsScreen; 