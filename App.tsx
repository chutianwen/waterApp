/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import CustomersScreen from './src/screens/CustomersScreen';
import NewCustomerScreen from './src/screens/NewCustomerScreen';
import NewTransactionScreen from './src/screens/NewTransactionScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {RootStackParamList} from './src/types/navigation';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const HistoryStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TransactionList" 
        component={TransactionScreen}
        options={{
          headerTitle: 'Transaction History',
        }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'CustomersList':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
      })}>
      <Tab.Screen 
        name="CustomersList" 
        component={CustomersScreen}
        options={{
          title: 'Customers',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{
          title: 'History',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
        />
        <Stack.Screen 
          name="New Customer" 
          component={NewCustomerScreen}
          options={({navigation}) => ({
            presentation: 'modal',
            headerShown: true,
            headerLeft: () => null,
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{padding: 8}}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="New Transaction" 
          component={NewTransactionScreen}
          options={({navigation}) => ({
            presentation: 'modal',
            headerShown: true,
            headerLeft: () => null,
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{padding: 8}}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="Customer Profile" 
          component={CustomerProfileScreen}
          options={({navigation}) => ({
            presentation: 'modal',
            headerShown: true,
            headerLeft: () => null,
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{padding: 8}}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
