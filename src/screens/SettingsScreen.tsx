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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as storage from '../services/storage';
import * as dataUtils from '../services/csvUtils';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import {WaterPrices} from '../types/settings';

export const STORAGE_KEYS = {
  REGULAR_WATER_PRICE: 'regularWaterPrice',
  ALKALINE_WATER_PRICE: 'alkalineWaterPrice',
};

const SettingsScreen = () => {
  const [regularPrice, setRegularPrice] = useState('1.50');
  const [alkalinePrice, setAlkalinePrice] = useState('2.00');
  const [showOptions, setShowOptions] = useState(false);
  const [priceHistory, setPriceHistory] = useState<WaterPrices[]>([]);

  useEffect(() => {
    loadPrices();
    loadPriceHistory();
  }, []);

  const loadPrices = async () => {
    try {
      const prices = await storage.getWaterPrices();
      setRegularPrice(prices.regularPrice.toFixed(2));
      setAlkalinePrice(prices.alkalinePrice.toFixed(2));
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };

  const loadPriceHistory = async () => {
    try {
      const history = await storage.getPriceHistory();
      setPriceHistory(history);
    } catch (error) {
      console.error('Error loading price history:', error);
    }
  };

  const handleSavePrices = async () => {
    try {
      const newRegularPrice = parseFloat(regularPrice);
      const newAlkalinePrice = parseFloat(alkalinePrice);

      if (isNaN(newRegularPrice) || isNaN(newAlkalinePrice)) {
        Alert.alert('Error', 'Please enter valid prices');
        return;
      }

      await storage.updateWaterPrices(newRegularPrice, newAlkalinePrice);
      Alert.alert('Success', 'Prices updated successfully!');
      loadPriceHistory(); // Reload price history after update
    } catch (error) {
      console.error('Error saving prices:', error);
      Alert.alert('Error', 'Failed to update prices');
    }
  };

  const handleExport = async () => {
    try {
      // Get all data
      const customers = await storage.getCustomers();
      const transactions = await storage.getCustomerTransactions('all');
      const settings = {
        waterPrices: await storage.getWaterPrices(),
        priceHistory: await storage.getPriceHistory(),
      };

      // Convert to JSON
      const jsonData = dataUtils.exportToJSON({customers, transactions, settings});

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
    }
  };

  const handleImport = async () => {
    try {
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

      // Convert JSON to data structure
      const importedData = dataUtils.importFromJSON(fileContent);

      // Convert data to the format expected by storage
      const storageData = {
        customers: importedData.customers.reduce((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {} as Record<string, Customer>),
        transactions: importedData.transactions.reduce((acc, transaction) => {
          acc[transaction.id!] = transaction;
          return acc;
        }, {} as Record<string, Transaction>),
        settings: importedData.settings,
      };

      // Import data
      await storage.importData(storageData);

      Alert.alert('Success', 'Data imported successfully!');
      setShowOptions(false);
      loadPrices(); // Reload prices
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return;
      }
      console.error('Error importing data:', error);
      Alert.alert('Error', 'Failed to import data. Please ensure the file is in the correct format.');
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
            onPress={() => setShowOptions(true)}>
            <Icon name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Water Prices</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Regular Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={regularPrice}
                onChangeText={(value) => handlePriceChange(value, 'regular')}
                keyboardType="decimal-pad"
                placeholder="0.0"
              />
              <View style={styles.priceButtons}>
                <TouchableOpacity 
                  style={styles.priceButton}
                  onPress={() => handlePriceIncrement('regular')}>
                  <Icon name="chevron-up" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.priceButton}
                  onPress={() => handlePriceDecrement('regular')}>
                  <Icon name="chevron-down" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Alkaline Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={alkalinePrice}
                onChangeText={(value) => handlePriceChange(value, 'alkaline')}
                keyboardType="decimal-pad"
                placeholder="0.0"
              />
              <View style={styles.priceButtons}>
                <TouchableOpacity 
                  style={styles.priceButton}
                  onPress={() => handlePriceIncrement('alkaline')}>
                  <Icon name="chevron-up" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.priceButton}
                  onPress={() => handlePriceDecrement('alkaline')}>
                  <Icon name="chevron-down" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSavePrices}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          <View style={styles.historyContainer}>
            {priceHistory.map(renderPriceHistoryItem)}
          </View>
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
              onPress={handleExport}>
              <Icon name="download-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleImport}>
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
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
    padding: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  priceButtons: {
    flexDirection: 'column',
    marginLeft: 8,
  },
  priceButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  historyContainer: {
    gap: 12,
  },
  historyItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
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
});

export default SettingsScreen; 