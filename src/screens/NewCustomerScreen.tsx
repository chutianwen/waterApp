import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import * as firebase from '../services/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NewCustomerScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [name, setName] = useState('');
  const [initialFund, setInitialFund] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const { customer, initialTransactionId } = await firebase.addCustomer({
        name: name.trim(),
        balance: Number(initialFund) || 0,
        membershipId: '',
      });

      // Clear Firebase cache to ensure fresh data
      firebase.clearCache('customers');
      firebase.clearCache('transactions');

      // Navigate to History tab with highlight if there's an initial transaction
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            params: {
              screen: 'History',
              params: initialTransactionId ? { 
                highlightTransactionId: initialTransactionId 
              } : undefined
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Customer</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Customer Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter customer name"
            autoCapitalize="words"
            autoFocus
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Initial Fund</Text>
          <View style={styles.fundInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.fundInput}
              value={initialFund}
              onChangeText={setInitialFund}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Customer</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  fundInputContainer: {
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
  fundInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewCustomerScreen; 