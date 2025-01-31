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
import {TouchableOpacity, ActivityIndicator, View} from 'react-native';
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
import LoginScreen from './src/screens/LoginScreen';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import {RootStackParamList, MainTabParamList} from './src/types/navigation';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Customers'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  const {signOut} = useAuth();
  
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
        options={({navigation}) => ({
          headerRight: () => (
            <TouchableOpacity
              style={{marginRight: 16}}
              onPress={() => navigation.getParent()?.navigate('New Customer')}>
              <Icon name="person-add" size={20} color="#007AFF" />
            </TouchableOpacity>
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
          headerRight: () => (
            <TouchableOpacity
              style={{marginRight: 16}}
              onPress={signOut}>
              <Icon name="log-out-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
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
      ) : (
        <RootStack.Navigator>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{headerShown: false}}
          />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
};

export default App;
