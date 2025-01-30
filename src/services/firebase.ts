import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {Customer} from '../types/customer';
import {Transaction} from '../types/transaction';
import {Settings, WaterPrices} from '../types/settings';

// Type definitions
type FirestoreDoc = FirebaseFirestoreTypes.DocumentData;
type QuerySnapshot = FirebaseFirestoreTypes.QuerySnapshot<FirestoreDoc>;

// Initialize Firestore
export const db = firestore();

// Collections
export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings',
} as const;

// Cache types
type CacheTypes = {
  customers: Map<string, { data: Customer[]; lastDoc?: FirebaseFirestoreTypes.DocumentSnapshot<FirestoreDoc> }>;
  transactions: Map<string, { data: Transaction[]; lastDoc?: FirebaseFirestoreTypes.DocumentSnapshot<FirestoreDoc> }>;
  searchResults: Map<string, Array<Customer | Transaction>>;
};

// Cache management
const cache: CacheTypes = {
  customers: new Map(),
  transactions: new Map(),
  searchResults: new Map(),
};

// Clear specific cache
export const clearCache = (type: keyof CacheTypes) => {
  cache[type].clear();
};

// Clear all cache
export const clearAllCache = () => {
  Object.values(cache).forEach(cacheMap => cacheMap.clear());
};

// Auth
export const getCurrentUser = () => auth().currentUser;

// Firestore helpers
export const customersRef = () => db.collection(COLLECTIONS.CUSTOMERS);
export const transactionsRef = () => db.collection(COLLECTIONS.TRANSACTIONS);
export const settingsRef = () => db.collection(COLLECTIONS.SETTINGS);

// Timestamp
export const serverTimestamp = firestore.FieldValue.serverTimestamp;

// Helper function to convert Firestore document to typed data
const convertDoc = <T extends FirestoreDoc>(
  doc: FirebaseFirestoreTypes.DocumentSnapshot<FirestoreDoc>
): T & { id: string } => ({
  id: doc.id,
  ...doc.data(),
} as T & { id: string });

// Helper function to generate a random 5-digit number
const generateRandomMembershipId = (): string => {
  // Generate a random number between 10000 and 99999
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return randomNum.toString();
};

// Helper function to check if a membershipId already exists
const isMembershipIdTaken = async (membershipId: string): Promise<boolean> => {
  const snapshot = await customersRef()
    .where('membershipId', '==', membershipId)
    .limit(1)
    .get();
  return !snapshot.empty;
};

// Helper function to get a unique membershipId
const getUniqueMembershipId = async (maxAttempts: number = 10): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const membershipId = generateRandomMembershipId();
    const isTaken = await isMembershipIdTaken(membershipId);
    if (!isTaken) {
      return membershipId;
    }
  }
  throw new Error('Unable to generate unique membershipId after ' + maxAttempts + ' attempts');
};

// Customer Operations
export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'lastTransaction'>) => {
  try {
    // Generate unique membershipId
    const membershipId = await getUniqueMembershipId();
    
    // Start a batch
    const batch = db.batch();

    // Create customer document
    const customerRef = customersRef().doc();
    const timestamp = serverTimestamp();
    
    batch.set(customerRef, {
      ...customer,
      membershipId,
      id: customerRef.id,
      createdAt: timestamp,
      lastTransaction: timestamp,
    });

    // Create initial transaction if there's an initial balance
    if (customer.balance > 0) {
      const transactionRef = transactionsRef().doc();
      batch.set(transactionRef, {
        customerId: customerRef.id,
        membershipId,
        type: 'fund',
        amount: customer.balance,
        customerBalance: customer.balance,
        notes: 'Initial balance',
        createdAt: timestamp,
      });
    }

    // Commit the batch
    await batch.commit();
    
    clearCache('customers');
    clearCache('transactions');

    const now = new Date().toISOString();
    return {
      ...customer,
      membershipId,
      id: customerRef.id,
      createdAt: now,
      lastTransaction: now,
    } as Customer;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};

export const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
  try {
    await customersRef().doc(customerId).update({
      ...data,
      lastTransaction: serverTimestamp(),
    });
    clearCache('customers');
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const getCustomers = async (
  page: number = 1,
  pageSize: number = 20,
  forceRefresh: boolean = false
): Promise<{
  customers: Customer[];
  hasMore: boolean;
}> => {
  try {
    const cacheKey = `customers_page_${page}`;
    const cachedResult = !forceRefresh && cache.customers.get(cacheKey);
    if (cachedResult) {
      return { 
        customers: cachedResult.data,
        hasMore: !!cachedResult.lastDoc
      };
    }

    let query = customersRef()
      .orderBy('lastTransaction', 'desc')
      .limit(pageSize + 1);

    if (page > 1) {
      const prevPageKey = `customers_page_${page - 1}`;
      const prevPageData = cache.customers.get(prevPageKey);
      if (prevPageData?.lastDoc) {
        query = query.startAfter(prevPageData.lastDoc);
      }
    }

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;
    const customers = docs.map(doc => {
      const data = doc.data();
      const lastTransaction = data.lastTransaction?.toDate?.() || null;
      const createdAt = data.createdAt?.toDate?.() || null;
      return {
        ...convertDoc<Customer>(doc),
        lastTransaction: lastTransaction ? lastTransaction.toISOString() : null,
        createdAt: createdAt ? createdAt.toISOString() : null,
      };
    });
    
    cache.customers.set(cacheKey, {
      data: customers,
      lastDoc: docs[docs.length - 1]
    });

    return { customers, hasMore };
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
};

export const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
  try {
    const cacheKey = `search_${searchTerm}`;
    const cachedResult = cache.searchResults.get(cacheKey);
    if (cachedResult) {
      return cachedResult as Customer[];
    }

    let query;
    const term = searchTerm.trim();
    
    // Check if search term is numeric (for membershipId)
    if (/^\d+$/.test(term)) {
      // Pad the search term to 5 digits if it's shorter
      const paddedTerm = term.padStart(5, '0');
      query = customersRef()
        .where('membershipId', '==', paddedTerm)
        .limit(20);
    } else {
      // Text search on name field - exact case matching
      query = customersRef()
        .where('name', '>=', term)
        .where('name', '<=', term + '\uf8ff')
        .limit(20);
    }

    const snapshot = await query.get();
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      const lastTransaction = data.lastTransaction?.toDate?.() || null;
      const createdAt = data.createdAt?.toDate?.() || null;
      return {
        ...convertDoc<Customer>(doc),
        lastTransaction: lastTransaction ? lastTransaction.toISOString() : null,
        createdAt: createdAt ? createdAt.toISOString() : null,
      };
    });

    cache.searchResults.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
};

// Transaction Operations
export const addTransactionAndUpdateCustomer = async (
  transaction: Omit<Transaction, 'id' | 'createdAt'>,
  customerUpdate: Partial<Customer>
): Promise<{
  transaction: Transaction;
  customer: Customer;
}> => {
  try {
    // Start a batch
    const batch = db.batch();

    // Get customer data
    const customerDoc = await customersRef().doc(transaction.customerId).get();
    const customerData = customerDoc.data();
    if (!customerData) {
      throw new Error('Customer not found');
    }

    // Clean up transaction data by removing undefined values
    const cleanTransaction = Object.entries(transaction).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Add transaction with both IDs
    const transactionRef = transactionsRef().doc();
    batch.set(transactionRef, {
      ...cleanTransaction,
      customerId: transaction.customerId,
      membershipId: customerData.membershipId,
      customerBalance: transaction.customerBalance,
      amount: transaction.amount,
      type: transaction.type,
      createdAt: serverTimestamp(),
    });

    // Update customer
    const customerRef = customersRef().doc(transaction.customerId);
    batch.update(customerRef, {
      ...customerUpdate,
      lastTransaction: serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();

    // Get the updated customer data
    const updatedCustomerDoc = await customerRef.get();
    const updatedCustomer = convertDoc<Customer>(updatedCustomerDoc);

    // Clear relevant caches
    clearCache('transactions');
    clearCache('customers');

    return {
      transaction: {
        ...cleanTransaction,
        customerId: transaction.customerId,
        membershipId: customerData.membershipId,
        customerBalance: transaction.customerBalance,
        amount: transaction.amount,
        type: transaction.type,
        id: transactionRef.id,
        createdAt: new Date().toISOString(),
      } as Transaction,
      customer: updatedCustomer,
    };
  } catch (error) {
    console.error('Error in addTransactionAndUpdateCustomer:', error);
    throw error;
  }
};

export const getCustomerTransactions = async (
  customerId: string,
  page: number = 1,
  pageSize: number = 20,
  forceRefresh: boolean = false
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
}> => {
  try {
    const cacheKey = `transactions_${customerId}_${page}`;
    const cachedResult = !forceRefresh && cache.transactions.get(cacheKey);
    if (cachedResult) {
      return {
        transactions: cachedResult.data,
        hasMore: !!cachedResult.lastDoc
      };
    }

    let query = transactionsRef()
      .orderBy('createdAt', 'desc')
      .limit(pageSize + 1);

    if (customerId !== 'all') {
      query = transactionsRef()
        .where('customerId', '==', customerId)
        .orderBy('createdAt', 'desc')
        .limit(pageSize + 1);
    }

    if (page > 1) {
      const prevPageKey = `transactions_${customerId}_${page - 1}`;
      const prevPageData = cache.transactions.get(prevPageKey);
      if (prevPageData?.lastDoc) {
        query = query.startAfter(prevPageData.lastDoc);
      }
    }

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;
    const transactions = docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      return {
        ...convertDoc<Transaction>(doc),
        createdAt: createdAt.toISOString()
      };
    });

    cache.transactions.set(cacheKey, {
      data: transactions,
      lastDoc: docs[docs.length - 1]
    });

    return { transactions, hasMore };
  } catch (error) {
    console.error('Error getting customer transactions:', error);
    throw error;
  }
};

export const searchTransactions = async (searchTerm: string): Promise<Transaction[]> => {
  try {
    const cacheKey = `search_transactions_${searchTerm}`;
    const cachedResult = cache.searchResults.get(cacheKey);
    if (cachedResult) {
      return cachedResult as Transaction[];
    }

    let query;
    const term = searchTerm.trim();
    
    // If the search term is numeric (for membershipId)
    if (/^\d+$/.test(term)) {
      // Pad the search term to 5 digits if it's shorter
      const paddedTerm = term.padStart(5, '0');
      query = transactionsRef()
        .where('membershipId', '==', paddedTerm)
        .limit(20);
    } else {
      // For non-numeric search, we'll need to first find matching customers
      const customers = await searchCustomers(term);
      if (customers.length === 0) {
        return [];
      }

      // Get transactions for the first matching customer only
      query = transactionsRef()
        .where('customerId', '==', customers[0].id)
        .limit(20);
    }

    const snapshot = await query.get();
    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      return {
        ...convertDoc<Transaction>(doc),
        createdAt: createdAt.toISOString()
      };
    });

    cache.searchResults.set(cacheKey, transactions);
    return transactions;
  } catch (error) {
    console.error('Error searching transactions:', error);
    throw error;
  }
};

// Settings Operations
export const updateWaterPrices = async (regularPrice: number, alkalinePrice: number) => {
  try {
    const timestamp = serverTimestamp();
    const priceData = {
      regularPrice,
      alkalinePrice,
      updatedAt: timestamp,
    };

    const batch = db.batch();

    // Update current prices
    batch.set(settingsRef().doc('waterPrices'), priceData, {merge: true});

    // Add to price history
    batch.set(settingsRef().doc('waterPrices').collection('history').doc(), priceData);

    await batch.commit();
  } catch (error) {
    console.error('Error updating water prices:', error);
    throw error;
  }
};

export const getWaterPrices = async (): Promise<WaterPrices> => {
  try {
    const doc = await settingsRef().doc('waterPrices').get();
    return doc.data() as WaterPrices || {
      regularPrice: 1.50,
      alkalinePrice: 2.00,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting water prices:', error);
    throw error;
  }
};

export const getPriceHistory = async (): Promise<WaterPrices[]> => {
  try {
    const snapshot = await settingsRef()
      .doc('waterPrices')
      .collection('history')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => convertDoc<WaterPrices>(doc));
  } catch (error) {
    console.error('Error getting price history:', error);
    throw error;
  }
};

// Import Operations
export const importData = async (data: {
  customers: Customer[];
  transactions: Transaction[];
  settings: {
    waterPrices: WaterPrices;
    priceHistory: WaterPrices[];
  };
}) => {
  try {
    const batch = db.batch();

    // Import customers
    for (const customer of data.customers) {
      const customerRef = customersRef().doc(customer.id);
      batch.set(customerRef, customer);
    }

    // Import transactions
    for (const transaction of data.transactions) {
      const transactionRef = transactionsRef().doc(transaction.id);
      batch.set(transactionRef, transaction);
    }

    // Import water prices
    const waterPricesRef = settingsRef().doc('waterPrices');
    batch.set(waterPricesRef, data.settings.waterPrices);

    // Import price history
    const historyRef = waterPricesRef.collection('history');
    for (const price of data.settings.priceHistory) {
      const priceRef = historyRef.doc();
      batch.set(priceRef, price);
    }

    // Commit all changes
    await batch.commit();

    // Clear all caches
    clearAllCache();
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
};

// Refresh functions
export const refreshCustomers = async (): Promise<{
  customers: Customer[];
  hasMore: boolean;
}> => {
  try {
    // Clear the customers cache
    clearCache('customers');
    
    // Fetch first page of customers
    return await getCustomers(1);
  } catch (error) {
    console.error('Error refreshing customers:', error);
    throw error;
  }
};

export const refreshTransactions = async (customerId: string = 'all'): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
}> => {
  try {
    // Clear the transactions cache
    clearCache('transactions');
    
    // Fetch first page of transactions
    return await getCustomerTransactions(customerId, 1);
  } catch (error) {
    console.error('Error refreshing transactions:', error);
    throw error;
  }
}; 