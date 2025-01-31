import React from 'react';
import {TouchableOpacity, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AddCustomerButton = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 16,
      }}
      onPress={() => navigation.navigate('New Customer')}>
      <Icon name="person-add-outline" size={24} color="#007AFF" />
      <Text style={{color: '#007AFF', fontSize: 16, fontWeight: '600'}}>
        
      </Text>
    </TouchableOpacity>
  );
}; 