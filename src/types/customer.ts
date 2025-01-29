export interface Customer {
  id: string;
  uniqueId: string; // 4-digit unique identifier
  name: string;
  phone?: string;
  balance: number;
  lastTransaction?: string;
  createdAt?: string;
  notes?: string;
} 