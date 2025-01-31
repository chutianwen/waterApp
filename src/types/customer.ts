export type Customer = {
  id: string;
  name: string;
  membershipId: string;
  balance: number;
  lastTransaction?: string;
  createdAt?: string;
  updatedAt?: string;
  nameLowerCase?: string;
}; 