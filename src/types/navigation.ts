import {Customer} from './customer';
import {Transaction} from './transaction';

export type MainTabParamList = {
  Customers: undefined;
  History: { highlightTransactionId?: string } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  'New Customer': undefined;
  'New Transaction': {
    customer: Customer;
    lastTransaction?: Transaction;
  };
  'Customer Profile': {
    customer: Customer;
  };
}; 