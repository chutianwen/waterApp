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
import {TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CustomersScreen from './src/screens/CustomersScreen';
import NewCustomerScreen from './src/screens/NewCustomerScreen';
import NewTransactionScreen from './src/screens/NewTransactionScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {AddCustomerButton} from './src/components/AddCustomerButton';
import {RootStackParamList, MainTabParamList} from './src/types/navigation';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Customers'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Customers':
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
        name="Customers"
        component={CustomersScreen}
        options={({ navigation }) => ({
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => navigation.getParent()?.navigate('New Customer')}>
              <Icon name="person-add" size={20} color="#007AFF" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size} color={color} />
          ),
        })}
      />
      <Tab.Screen 
        name="History" 
        component={TransactionScreen}
        options={{
          headerTitle: 'Transaction History',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <NavigationContainer>
        <RootStack.Navigator>
          <RootStack.Group>
            <RootStack.Screen 
              name="Main" 
              component={TabNavigator}
              options={{headerShown: false}}
            />
          </RootStack.Group>

          <RootStack.Group 
            screenOptions={{
              presentation: 'transparentModal',
              animation: 'fade',
              contentStyle: {backgroundColor: 'transparent'},
              headerShown: true,
              headerTransparent: true,
              headerLeft: () => null,
            }}>
            <RootStack.Screen 
              name="New Customer" 
              component={NewCustomerScreen}
              options={({navigation}) => ({
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={{padding: 8}}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                ),
              })}
            />
            <RootStack.Screen 
              name="New Transaction" 
              component={NewTransactionScreen}
              options={({navigation}) => ({
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={{padding: 8}}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                ),
              })}
            />
            <RootStack.Screen 
              name="Customer Profile" 
              component={CustomerProfileScreen}
              options={({navigation}) => ({
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={{padding: 8}}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                ),
              })}
            />
          </RootStack.Group>
        </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default App;
