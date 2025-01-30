import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const formatLastTransaction = (dateString?: string) => {
  if (!dateString) {
    return 'No transactions yet';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'No transactions yet';
    }
    return `Last transaction: ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return 'No transactions yet';
  }
};

const renderItem = ({item}: {item: Customer}) => (
  <TouchableOpacity 
    style={styles.customerItem}
    onPress={() => handleCustomerPress(item)}>
    <View style={styles.customerInfo}>
      <Text style={styles.customerName}>{item.name}</Text>
      <Text style={styles.customerId}>#{item.uniqueId}</Text>
      <Text style={styles.lastTransaction}>
        {formatLastTransaction(item.lastTransaction)}
      </Text>
    </View>
    <View style={styles.rightContainer}>
      <Text style={styles.balance}>${item.balance.toFixed(2)}</Text>
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={(e) => {
          e.stopPropagation();
          handleMorePress(item);
        }}>
        <Icon name="ellipsis-vertical" size={20} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerId: {
    fontSize: 16,
    color: '#8E8E93',
  },
  lastTransaction: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moreButton: {
    padding: 5,
  },
});

export default renderItem; 