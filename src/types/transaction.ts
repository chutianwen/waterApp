export interface Transaction {
  id?: string;
  customerId: string;
  customerBalance: number;
  amount: number;
  type: 'regular' | 'alkaline' | 'fund';
  gallons?: number;
  createdAt?: string;
  notes?: string;
} 