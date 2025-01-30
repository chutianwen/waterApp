import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as firebase from '../services/firebase';

const SettingsScreen = () => {
  const [regularPrice, setRegularPrice] = useState(1.50);
  const [alkalinePrice, setAlkalinePrice] = useState(2.00);
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Array<{
    regularPrice: number;
    alkalinePrice: number;
    updatedAt: string;
  }>>([]);

  // Load saved prices when component mounts
  useEffect(() => {
    loadPrices();
    loadPriceHistory();
  }, []);

  const loadPrices = async () => {
    try {
      const prices = await firebase.getWaterPrices();
      setRegularPrice(prices.regularPrice);
      setAlkalinePrice(prices.alkalinePrice);
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
      await firebase.updateWaterPrices(regularPrice, alkalinePrice);
      Alert.alert('Success', 'Water prices updated successfully');
      loadPriceHistory(); // Refresh price history after update
    } catch (error) {
      console.error('Error saving prices:', error);
      Alert.alert('Error', 'Failed to update water prices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Water Prices</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.label}>Regular Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={regularPrice.toFixed(2)}
                onChangeText={(value) => {
                  const price = parseFloat(value);
                  if (!isNaN(price)) {
                    setRegularPrice(price);
                  }
                }}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.label}>Alkaline Water (per gallon)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={alkalinePrice.toFixed(2)}
                onChangeText={(value) => {
                  const price = parseFloat(value);
                  if (!isNaN(price)) {
                    setAlkalinePrice(price);
                  }
                }}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSavePrices}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Prices</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          {priceHistory.map((price, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {formatDate(price.updatedAt)}
              </Text>
              <View style={styles.historyPrices}>
                <Text style={styles.historyPrice}>
                  Regular: ${price.regularPrice.toFixed(2)}
                </Text>
                <Text style={styles.historyPrice}>
                  Alkaline: ${price.alkalinePrice.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  priceContainer: {
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
    padding: 12,
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
    marginTop: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyPrice: {
    fontSize: 16,
    color: '#333',
  },
});

export default SettingsScreen; 