export interface Customer {
  id: string;
  membershipId: string; // 5-digit unique identifier
  name: string;
  phone?: string;
  balance: number;
  lastTransaction?: string;
  createdAt?: string;
  notes?: string;
} 