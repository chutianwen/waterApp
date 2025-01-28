export interface Transaction {
  id: string;
  date: string;
  time: string;
  waterType: string;
  gallons: number;
  amount: number;
  customerName: string;
  customerBalance: number;
  status?: 'Just Completed' | 'Completed';
} 