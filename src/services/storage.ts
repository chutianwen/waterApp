import { Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '../types/customer';
import { Transaction } from '../types/transaction';
import { Settings, WaterPrices } from '../types/settings';

// Constants for collection names (same as Firebase)
export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings',
} as const;

// Types for our collections
type CollectionTypes = {
  [COLLECTIONS.CUSTOMERS]: Record<string, Customer>;
  [COLLECTIONS.TRANSACTIONS]: Record<string, Transaction>;
  [COLLECTIONS.SETTINGS]: Settings;
};

// Base directory for our JSON files
const BASE_DIR = Platform.select({
  ios: `${RNFS.DocumentDirectoryPath}/waterapp_data`,
  android: `${RNFS.DocumentDirectoryPath}/waterapp_data`,
})!;

// Ensure base directory exists
const initStorage = async () => {
  const exists = await RNFS.exists(BASE_DIR);
  if (!exists) {
    await RNFS.mkdir(BASE_DIR);
  }
};

// Helper functions
const getCollectionPath = (collection: string) => `${BASE_DIR}/${collection}.json`;

const generateUniqueId = async (): Promise<string> => {
  const customers = (await readCollection(COLLECTIONS.CUSTOMERS)) || {};
  const existingIds = new Set(Object.values(customers).map(c => c.uniqueId));
  
  // Keep generating until we find a unique one
  while (true) {
    // Generate a random 4-digit number
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existingIds.has(id)) {
      return id;
    }
  }
};

const readCollection = async <T extends keyof CollectionTypes>(
  collection: T
): Promise<CollectionTypes[T] | null> => {
  try {
    const path = getCollectionPath(collection);
    const exists = await RNFS.exists(path);
    if (!exists) {
      return null;
    }
    const content = await RNFS.readFile(path, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading collection ${collection}:`, error);
    return null;
  }
};

const writeCollection = async <T extends keyof CollectionTypes>(
  collection: T,
  data: CollectionTypes[T]
) => {
  try {
    await initStorage();
    const path = getCollectionPath(collection);
    await RNFS.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing collection ${collection}:`, error);
    throw error;
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Customer Operations
export const addCustomer = async (customer: Omit<Customer, 'id' | 'uniqueId'>): Promise<Customer> => {
  await initStorage(); // Ensure storage directory exists
  const customers = (await readCollection(COLLECTIONS.CUSTOMERS)) || {};
  const id = generateId();
  const uniqueId = await generateUniqueId();
  const timestamp = new Date().toISOString();
  const newCustomer = { 
    ...customer, 
    id,
    uniqueId,
    createdAt: timestamp // Add createdAt for sorting
  };
  
  // Initialize customers object if it doesn't exist
  if (!customers[id]) {
    customers[id] = newCustomer;
    await writeCollection(COLLECTIONS.CUSTOMERS, customers);
  }
  
  return newCustomer;
};

export const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
  await initStorage(); // Ensure storage directory exists
  const customers = (await readCollection(COLLECTIONS.CUSTOMERS)) || {};
  
  if (!customers[customerId]) {
    throw new Error('Customer not found');
  }
  
  customers[customerId] = { 
    ...customers[customerId], 
    ...data,
    lastTransaction: data.lastTransaction || new Date().toISOString()
  };
  
  await writeCollection(COLLECTIONS.CUSTOMERS, customers);
  return customers[customerId];
};

export const getCustomers = async (): Promise<Customer[]> => {
  const customers = (await readCollection(COLLECTIONS.CUSTOMERS)) || {};
  return Object.values(customers).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
};

export const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
  const customers = await getCustomers();
  const term = searchTerm.toLowerCase();
  return customers.filter(customer => 
    customer.name.toLowerCase().includes(term)
  );
};

// Transaction Operations
export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
  await initStorage(); // Ensure storage directory exists
  const transactions = (await readCollection(COLLECTIONS.TRANSACTIONS)) || {};
  const customers = (await readCollection(COLLECTIONS.CUSTOMERS)) || {};
  
  const id = generateId();
  const timestamp = new Date().toISOString();
  const newTransaction = { 
    ...transaction, 
    id,
    createdAt: timestamp 
  };

  // Update transaction collection
  transactions[id] = newTransaction;
  await writeCollection(COLLECTIONS.TRANSACTIONS, transactions);

  // Update customer balance and last transaction
  if (customers[transaction.customerId]) {
    customers[transaction.customerId] = {
      ...customers[transaction.customerId],
      balance: transaction.customerBalance,
      lastTransaction: timestamp
    };
    await writeCollection(COLLECTIONS.CUSTOMERS, customers);
  } else {
    console.error('Customer not found:', transaction.customerId);
  }

  return newTransaction;
};

export const getCustomerTransactions = async (
  customerId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<Transaction[]> => {
  const transactions = (await readCollection(COLLECTIONS.TRANSACTIONS)) || {};
  const allTransactions = Object.values(transactions);
  
  // If customerId is 'all', return all transactions, otherwise filter by customerId
  const filteredTransactions = customerId === 'all' ? 
    allTransactions : 
    allTransactions.filter(t => t.customerId === customerId);

  // Sort by date, most recent first
  const sortedTransactions = filteredTransactions.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Calculate pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return sortedTransactions.slice(start, end);
};

// Settings Operations
export const updateWaterPrices = async (regularPrice: number, alkalinePrice: number) => {
  const settings = (await readCollection(COLLECTIONS.SETTINGS)) || {
    waterPrices: null,
    priceHistory: []
  };
  
  const timestamp = new Date().toISOString();
  const newPrices: WaterPrices = {
    regularPrice,
    alkalinePrice,
    updatedAt: timestamp
  };

  // Update current prices
  settings.waterPrices = newPrices;

  // Add to price history
  settings.priceHistory = [newPrices, ...settings.priceHistory].slice(0, 50);
  
  await writeCollection(COLLECTIONS.SETTINGS, settings);
};

export const getWaterPrices = async (): Promise<WaterPrices> => {
  const settings = await readCollection(COLLECTIONS.SETTINGS);
  const defaultPrices: WaterPrices = {
    regularPrice: 1.50,
    alkalinePrice: 2.00,
    updatedAt: new Date().toISOString()
  };
  
  return settings?.waterPrices || defaultPrices;
};

export const getPriceHistory = async (): Promise<WaterPrices[]> => {
  const settings = await readCollection(COLLECTIONS.SETTINGS);
  return settings?.priceHistory || [];
};

// Backup and Restore Operations
interface BackupData {
  customers: Record<string, Customer>;
  transactions: Record<string, Transaction>;
  settings: Settings;
  backupDate: string;
  version: string;
}

export const exportData = async (): Promise<string> => {
  try {
    // Read all collections
    const customers = await readCollection(COLLECTIONS.CUSTOMERS) || {};
    const transactions = await readCollection(COLLECTIONS.TRANSACTIONS) || {};
    const settings = await readCollection(COLLECTIONS.SETTINGS) || {
      waterPrices: null,
      priceHistory: []
    };

    const backupData: BackupData = {
      customers,
      transactions,
      settings,
      backupDate: new Date().toISOString(),
      version: '1.0'
    };

    // Create backup file
    const backupFileName = `waterapp_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = `${RNFS.DocumentDirectoryPath}/${backupFileName}`;
    
    await RNFS.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

    // Share the file
    if (Platform.OS === 'ios') {
      const base64 = await RNFS.readFile(backupPath, 'base64');
      return `data:application/json;base64,${base64}`;
    }
    return backupPath;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};

export const importData = async (data: {
  customers: Record<string, Customer>;
  transactions: Record<string, Transaction>;
  settings: Settings;
} | string): Promise<void> => {
  try {
    let backupData: BackupData;
    
    if (typeof data === 'string') {
      // Handle string input (file path)
      const content = await RNFS.readFile(data, 'utf8');
      backupData = JSON.parse(content) as BackupData;
    } else {
      // Handle direct data input
      backupData = {
        customers: data.customers,
        transactions: data.transactions,
        settings: data.settings,
        backupDate: new Date().toISOString(),
        version: '1.0'
      };
    }

    // Validate backup data structure
    if (!backupData.customers || !backupData.transactions || !backupData.settings) {
      throw new Error('Invalid backup file format');
    }

    // Write all collections
    await writeCollection(COLLECTIONS.CUSTOMERS, backupData.customers);
    await writeCollection(COLLECTIONS.TRANSACTIONS, backupData.transactions);
    await writeCollection(COLLECTIONS.SETTINGS, backupData.settings);
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Failed to import data');
  }
}; 