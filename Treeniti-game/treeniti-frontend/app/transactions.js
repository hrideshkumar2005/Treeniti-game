import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/wallet/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.log('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={[styles.iconCircle, { backgroundColor: item.type === 'Debit' ? '#FFF3E0' : '#E8F5E9' }]}>
        <Ionicons name={item.type === 'Debit' ? 'wallet-outline' : 'leaf-outline'} size={20} color="#1B5E20" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.source}</Text>
        <Text style={styles.itemSub}>{item.notes}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemAmount, { color: item.type === 'Debit' && !(item.amountCash > 0 && item.amountCoins > 0) ? '#000' : '#2E7D32', textAlign: 'right' }]}>
                 {item.amountCash > 0 && item.amountCoins > 0 
                     ? (item.type === 'Debit' ? `- ${item.amountCoins} Coins\n+ ₹${item.amountCash}` : `+ ₹${item.amountCash}\n+ ${item.amountCoins} Coins`)
                     : (item.amountCash > 0 ? `${item.type === 'Credit' ? '+' : '-'} ₹${item.amountCash}` : `${item.type === 'Credit' ? '+' : '-'} ${item.amountCoins} Coins`)
                 }
        </Text>
        <Text style={styles.itemDate}>{new Date(item.date).toDateString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#666' }}>No transactions found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF7' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between', backgroundColor: '#fff', elevation: 2 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  
  // History Items
  historyItem: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginHorizontal: 15, 
    marginBottom: 12, 
    borderRadius: 20, 
    padding: 15, 
    alignItems: 'center', 
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 
  },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemSub: { fontSize: 10, color: '#777', marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: 14, fontWeight: 'bold' },
  itemDate: { fontSize: 8, color: '#999', marginTop: 4, textTransform: 'uppercase' },
});
