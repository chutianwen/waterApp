import firestore from '@react-native-firebase/firestore';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';

// Collections
const CUSTOMERS = 'customers';
const TRANSACTIONS = 'transactions';
const SETTINGS = 'settings';

// Customer Operations
export const addCustomer = async (customer: Customer) => {
  try {
    const docRef = await firestore().collection(CUSTOMERS).add(customer);
    return {
      ...customer,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};

export const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
  try {
    await firestore().collection(CUSTOMERS).doc(customerId).update(data);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const getCustomers = async () => {
  try {
    const snapshot = await firestore().collection(CUSTOMERS).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
};

export const searchCustomers = async (searchTerm: string) => {
  try {
    const snapshot = await firestore()
      .collection(CUSTOMERS)
      .orderBy('name')
      .startAt(searchTerm)
      .endAt(searchTerm + '\uf8ff')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];
  } catch (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
};

// Transaction Operations
export const addTransaction = async (transaction: Transaction) => {
  try {
    // Start a batch
    const batch = firestore().batch();

    // Add transaction
    const transactionRef = firestore().collection(TRANSACTIONS).doc();
    batch.set(transactionRef, {
      ...transaction,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    // Update customer balance
    const customerRef = firestore().collection(CUSTOMERS).doc(transaction.customerId);
    batch.update(customerRef, {
      balance: transaction.customerBalance,
      lastTransaction: new Date().toISOString(),
    });

    // Commit the batch
    await batch.commit();

    return {
      ...transaction,
      id: transactionRef.id,
    };
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const getCustomerTransactions = async (customerId: string) => {
  try {
    const snapshot = await firestore()
      .collection(TRANSACTIONS)
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
  } catch (error) {
    console.error('Error getting customer transactions:', error);
    throw error;
  }
};

// Settings Operations
export const updateWaterPrices = async (regularPrice: number, alkalinePrice: number) => {
  try {
    await firestore().collection(SETTINGS).doc('waterPrices').set({
      regularPrice,
      alkalinePrice,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  } catch (error) {
    console.error('Error updating water prices:', error);
    throw error;
  }
};

export const getWaterPrices = async () => {
  try {
    const doc = await firestore().collection(SETTINGS).doc('waterPrices').get();
    return doc.data() || {regularPrice: 1.50, alkalinePrice: 2.00};
  } catch (error) {
    console.error('Error getting water prices:', error);
    throw error;
  }
};

export const getPriceHistory = async () => {
  try {
    const snapshot = await firestore()
      .collection(SETTINGS)
      .doc('waterPrices')
      .collection('history')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting price history:', error);
    throw error;
  }
}; 