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
import {RootStackParamList, MainTabParamList} from './src/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const HistoryStack = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="TransactionList" 
        component={TransactionScreen}
        options={{
          headerTitle: 'Transaction History',
        }}
      />
    </MainStack.Navigator>
  );
};

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
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{
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
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        <RootStack.Group>
          <RootStack.Screen name="Main" component={TabNavigator} />
        </RootStack.Group>

        <RootStack.Group screenOptions={{
          presentation: 'modal',
          headerShown: true,
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
