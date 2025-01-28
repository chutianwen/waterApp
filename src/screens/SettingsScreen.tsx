import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

export const STORAGE_KEYS = {
  REGULAR_WATER_PRICE: 'regularWaterPrice',
  ALKALINE_WATER_PRICE: 'alkalineWaterPrice',
  PRICE_HISTORY: 'priceHistory',
};

type PriceHistory = {
  id: string;
  date: string;
  regularPrice: string;
  alkalinePrice: string;
};

const SettingsScreen = () => {
  const [regularPrice, setRegularPrice] = useState('1.50');
  const [alkalinePrice, setAlkalinePrice] = useState('2.00');
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);

  // Load saved prices and history when component mounts
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [savedRegularPrice, savedAlkalinePrice, savedHistory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.REGULAR_WATER_PRICE),
          AsyncStorage.getItem(STORAGE_KEYS.ALKALINE_WATER_PRICE),
          AsyncStorage.getItem(STORAGE_KEYS.PRICE_HISTORY),
        ]);
        
        if (savedRegularPrice) setRegularPrice(savedRegularPrice);
        if (savedAlkalinePrice) setAlkalinePrice(savedAlkalinePrice);
        if (savedHistory) setPriceHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      // Validate prices
      const regularPriceNum = parseFloat(regularPrice);
      const alkalinePriceNum = parseFloat(alkalinePrice);

      if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
        Alert.alert('Error', 'Please enter a valid price for regular water');
        return;
      }

      if (isNaN(alkalinePriceNum) || alkalinePriceNum <= 0) {
        Alert.alert('Error', 'Please enter a valid price for alkaline water');
        return;
      }

      // Save prices
      await AsyncStorage.setItem(STORAGE_KEYS.REGULAR_WATER_PRICE, regularPrice);
      await AsyncStorage.setItem(STORAGE_KEYS.ALKALINE_WATER_PRICE, alkalinePrice);

      // Add to history
      const newHistory: PriceHistory = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        regularPrice,
        alkalinePrice,
      };

      const updatedHistory = [newHistory, ...priceHistory].slice(0, 50); // Keep last 50 changes
      await AsyncStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(updatedHistory));
      setPriceHistory(updatedHistory);

      Alert.alert('Success', 'Prices updated successfully');
    } catch (error) {
      console.error('Error saving prices:', error);
      Alert.alert('Error', 'Failed to save prices');
    }
  };

  const renderHistoryItem = ({item}: {item: PriceHistory}) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Icon name="time-outline" size={16} color="#666" />
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <View style={styles.historyPrices}>
        <Text style={styles.historyPrice}>Regular: ${item.regularPrice}</Text>
        <Text style={styles.historyPrice}>Alkaline: ${item.alkalinePrice}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Water Prices</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Regular Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={regularPrice}
                onChangeText={setRegularPrice}
                keyboardType="decimal-pad"
                placeholder="1.50"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Alkaline Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={alkalinePrice}
                onChangeText={setAlkalinePrice}
                keyboardType="decimal-pad"
                placeholder="2.00"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          {priceHistory.length === 0 ? (
            <Text style={styles.emptyHistory}>No price changes yet</Text>
          ) : (
            <FlatList
              data={priceHistory}
              renderItem={renderHistoryItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  historyPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyPrice: {
    fontSize: 14,
    color: '#333',
  },
  emptyHistory: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default SettingsScreen; 