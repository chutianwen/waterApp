import {Customer} from './customer';

export type RootStackParamList = {
  Customers: undefined;
  'New Customer': undefined;
  'New Transaction': {
    customer: Customer;
    lastTransaction?: {
      date: string;
      amount: number;
      waterType: string;
    };
  };
  History: {
    screen?: string;
    params?: {
      customer?: Customer;
      searchTerm?: string;
    };
  };
  Settings: undefined;
}; 