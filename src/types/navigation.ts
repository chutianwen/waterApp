import {Customer} from './customer';
import {Transaction} from './transaction';

export type RootStackParamList = {
  Main: undefined;
  TransactionList: undefined;
  Customers: undefined;
  'New Customer': undefined;
  'New Transaction': {
    customer: Customer;
    lastTransaction?: Transaction;
  };
  History: {
    params?: {
      customer?: Customer;
      searchTerm?: string;
    };
  };
  'Customer Profile': {
    customer: Customer;
  };
  Settings: undefined;
}; 