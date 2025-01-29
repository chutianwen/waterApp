import { Customer } from '../types/customer';
import { Transaction } from '../types/transaction';
import { Settings } from '../types/settings';

interface ExportData {
  customers: Customer[];
  transactions: Transaction[];
  settings: Settings;
  exportDate: string;
  version: string;
}

// Export data to a single JSON file
export const exportToJSON = (data: {
  customers: Customer[];
  transactions: Transaction[];
  settings: Settings;
}): string => {
  const exportData: ExportData = {
    ...data,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };

  // Convert dates to ISO strings for proper serialization
  exportData.customers = exportData.customers.map(customer => ({
    ...customer,
    createdAt: customer.createdAt || new Date().toISOString(),
    lastTransaction: customer.lastTransaction || new Date().toISOString(),
  }));

  exportData.transactions = exportData.transactions.map(transaction => ({
    ...transaction,
    createdAt: transaction.createdAt || new Date().toISOString(),
  }));

  if (exportData.settings.waterPrices) {
    exportData.settings.waterPrices = {
      ...exportData.settings.waterPrices,
      updatedAt: exportData.settings.waterPrices.updatedAt || new Date().toISOString(),
    };
  }

  exportData.settings.priceHistory = exportData.settings.priceHistory.map(price => ({
    ...price,
    updatedAt: price.updatedAt || new Date().toISOString(),
  }));

  return JSON.stringify(exportData, null, 2);
};

// Import data from JSON file
export const importFromJSON = (jsonString: string): {
  customers: Customer[];
  transactions: Transaction[];
  settings: Settings;
} => {
  try {
    const data = JSON.parse(jsonString) as ExportData;

    // Validate data structure
    if (!data.customers || !data.transactions || !data.settings) {
      throw new Error('Invalid data format');
    }

    // Convert string values to appropriate types and ensure date fields are proper Date objects
    const customers = data.customers.map(customer => ({
      ...customer,
      balance: parseFloat(String(customer.balance)),
      createdAt: customer.createdAt || new Date().toISOString(),
      lastTransaction: customer.lastTransaction || new Date().toISOString(),
    }));

    const transactions = data.transactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(String(transaction.amount)),
      customerBalance: parseFloat(String(transaction.customerBalance)),
      gallons: transaction.gallons ? parseFloat(String(transaction.gallons)) : undefined,
      createdAt: transaction.createdAt || new Date().toISOString(),
    }));

    const settings: Settings = {
      waterPrices: data.settings.waterPrices ? {
        regularPrice: parseFloat(String(data.settings.waterPrices.regularPrice)),
        alkalinePrice: parseFloat(String(data.settings.waterPrices.alkalinePrice)),
        updatedAt: data.settings.waterPrices.updatedAt || new Date().toISOString(),
      } : null,
      priceHistory: data.settings.priceHistory.map(price => ({
        regularPrice: parseFloat(String(price.regularPrice)),
        alkalinePrice: parseFloat(String(price.alkalinePrice)),
        updatedAt: price.updatedAt || new Date().toISOString(),
      })),
    };

    return {
      customers,
      transactions,
      settings,
    };
  } catch (error) {
    console.error('Error parsing import data:', error);
    throw new Error('Failed to parse import data. Please ensure the file is in the correct format.');
  }
}; 