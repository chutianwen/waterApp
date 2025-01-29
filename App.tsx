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
import Icon from 'react-native-vector-icons/Ionicons';
import {TouchableOpacity} from 'react-native';

import CustomersScreen from './src/screens/CustomersScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import NewTransactionScreen from './src/screens/NewTransactionScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NewCustomerScreen from './src/screens/NewCustomerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HistoryStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TransactionList" 
        component={TransactionScreen}
        options={{headerShown: false}}
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
        headerShown: false,
      })}>
      <Tab.Screen 
        name="CustomersList" 
        component={CustomersScreen}
        options={{title: 'Customers'}}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{title: 'History'}} 
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={TabNavigator} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
