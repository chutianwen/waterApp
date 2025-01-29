import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';

// Initialize Firestore
export const db = firestore();

// Collections
export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
};

// Auth
export const getCurrentUser = () => auth().currentUser;

// Firestore helpers
export const customersRef = () => db.collection(COLLECTIONS.CUSTOMERS);
export const transactionsRef = () => db.collection(COLLECTIONS.TRANSACTIONS);

// Timestamp
export const serverTimestamp = firestore.FieldValue.serverTimestamp;

// Customer Operations
export const addCustomer = async (customer: Customer) => {
  try {
    const docRef = await customersRef().add(customer);
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
    await customersRef().doc(customerId).update(data);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const getCustomers = async () => {
  try {
    const snapshot = await customersRef().get();
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
    const snapshot = await customersRef()
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
    const batch = db.batch();

    // Add transaction
    const transactionRef = transactionsRef().doc();
    batch.set(transactionRef, {
      ...transaction,
      createdAt: serverTimestamp(),
    });

    // Update customer balance
    const customerRef = customersRef().doc(transaction.customerId);
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
    const snapshot = await transactionsRef()
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
    await db.collection('settings').doc('waterPrices').set({
      regularPrice,
      alkalinePrice,
      updatedAt: serverTimestamp(),
    }, {merge: true});
  } catch (error) {
    console.error('Error updating water prices:', error);
    throw error;
  }
};

export const getWaterPrices = async () => {
  try {
    const doc = await db.collection('settings').doc('waterPrices').get();
    return doc.data() || {regularPrice: 1.50, alkalinePrice: 2.00};
  } catch (error) {
    console.error('Error getting water prices:', error);
    throw error;
  }
};

export const getPriceHistory = async () => {
  try {
    const snapshot = await db
      .collection('settings')
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