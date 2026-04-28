import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const { t } = useLanguage();
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);

  const [balance, setBalance] = useState({ coins: 0, rupees: 0, referralAmount: 0, pendingRewards: 0 });
  const [transactions, setTransactions] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('transactions'); // 'transactions' or 'withdrawals'
  const [isFlagged, setIsFlagged] = useState(false);
  const [kycStatus, setKycStatus] = useState(false);

  const fetchWalletConfig = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if(!token) return;

      const res = await fetch(`${BASE_URL}/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) {
         setBalance({ 
           coins: data.totalCoins || 0, 
           rupees: data.wallet?.earnings || 0,
           referralAmount: data.wallet?.referralAmount || 0,
           pendingRewards: data.wallet?.pendingRewards || 0
         });
         setTransactions(data.recentTransactions || []);
         setWithdrawalHistory(data.wallet?.withdrawalHistory || []);
      }
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(()=>{ fetchWalletConfig(); }, []));

  const handleWithdrawal = async () => {
      const minWithdraw = config?.minWithdrawalRupees || 10;
      if(balance.rupees < minWithdraw) return Alert.alert("Error", `Minimum withdrawal amount is ₹${minWithdraw}.`);
      if(!upiId.trim()) return Alert.alert("Error", "Please enter a valid UPI ID.");
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/wallet/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: balance.rupees, upiId: upiId, accountName: accountName })
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Success", data.message);
            setUpiId("");
            fetchWalletConfig();
        } else {
            Alert.alert("Failed", data.error);
        }
      } catch (e) {
         Alert.alert("Error", "Network issue.");
      }
      setLoading(false);
  };

  const handleConvert = async () => {
      const conversionRate = config?.conversionRate || 100;
      if(balance.coins < conversionRate) return Alert.alert("Error", `Minimum ${conversionRate} Coins required to convert to real Cash.`);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/wallet/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ coinsToConvert: balance.coins })
        });
        const data = await res.json();
        if(data.success) {
            Alert.alert("Conversion Successful!", data.message);
            fetchWalletConfig();
        } else {
            Alert.alert("Failed", data.error);
        }
      } catch (e) { }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.wallet}</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
        
        {/* --- 🟢 Balance Card (Exact Screenshot) --- */}
        <LinearGradient colors={['#0F380F', '#1B5E20']} style={styles.balanceCard}>
          <View style={styles.cardTop}>
            <Text style={styles.balanceLabel}>{t.totalBalance}</Text>
            <MaterialCommunityIcons name="bell-ring" size={20} color="#FFC107" />
          </View>
          
          <Text style={styles.coinAmount}>{balance.coins} <Text style={styles.coinUnit}>{t.coins}</Text></Text>
          
          <View style={styles.rupeeRow}>
            <View style={styles.rupeeLine} />
            <Text style={styles.rupeeAmount}>₹{balance.rupees}</Text>
            <Text style={styles.earningLabel}> ({t.mainWallet})</Text>
          </View>

          {/* SRS 3.13 Required Sections */}
          <View style={styles.srsSectionsRow}>
            <View style={styles.srsSectionItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="people" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.srsSectionLabel}> {t.referralEarnings || "Referral Bonus"}</Text>
              </View>
              <Text style={styles.srsSectionValue}>₹{balance.referralAmount}</Text>
            </View>
            <View style={styles.srsDivider} />
            <View style={styles.srsSectionItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.srsSectionLabel}> {t.pendingRewards || "Locked Rewards"}</Text>
              </View>
              <Text style={styles.srsSectionValue}>₹{balance.pendingRewards}</Text>
            </View>
          </View>

          <View style={styles.conversionInfoRow}>
             <View style={styles.rateBadge}>
                <Ionicons name="information-circle-outline" size={12} color="#FFD700" />
                <Text style={styles.conversionRateText}> {config?.conversionRate || 100} Coins = ₹1.00 Real Cash</Text>
             </View>
             <TouchableOpacity style={styles.convertBtn} activeOpacity={0.8} onPress={handleConvert}>
                <LinearGradient colors={['#FFD700', '#FFA000']} style={styles.convertBtnGradient}>
                  <Ionicons name="swap-horizontal" size={14} color="#1B5E20" />
                  <Text style={styles.convertBtnText}> {t.convertAll}</Text>
                </LinearGradient>
             </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* --- 💸 Withdraw Section --- */}
        <View style={styles.sectionHeader}>
           <View style={styles.indicator} /><Text style={styles.sectionTitle}>{t.withdrawUpi}</Text>
        </View>

        <View style={styles.withdrawCard}>
           <Text style={styles.inputLabel}>{t.fullName}</Text>
           <View style={[styles.inputContainer, {marginBottom: 15}]}>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: John Doe" 
                value={accountName} 
                onChangeText={setAccountName} 
              />
              <Ionicons name="person-outline" size={20} color="#999" />
           </View>

           <Text style={styles.inputLabel}>{t.enterUpi}</Text>
           <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="example@upi" 
                value={upiId} 
                onChangeText={setUpiId} 
              />
              <MaterialCommunityIcons name="at" size={20} color="#999" />
           </View>
           
           <TouchableOpacity 
              style={[styles.withdrawNowBtn, (isFlagged || balance.rupees < (config?.minWithdrawalRupees || 10)) && {backgroundColor: '#ccc'}]} 
              onPress={isFlagged ? () => Alert.alert("Verification Required", "Your account is under routine security review. Rewards are temporarily locked but you can continue growing your trees!") : handleWithdrawal}
              disabled={loading || balance.rupees < (config?.minWithdrawalRupees || 10)}
           >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.withdrawText}>{isFlagged ? "Verification Pending 🔒" : (balance.rupees < (config?.minWithdrawalRupees || 10) ? `Min. ₹${config?.minWithdrawalRupees || 10} Required` : `${t.withdrawNow} (₹${balance.rupees})   →`)}</Text>}
           </TouchableOpacity>
           <Text style={{fontSize: 9, color: '#999', marginTop: 10, textAlign: 'center'}}>
             Disclaimer: UPI ID must be linked to your own bank account (KYC compliant). Manual verification may take up to 24-48 hours.
           </Text>
        </View>

        {/* --- 🕒 History Section --- */}
        <View style={styles.historyTabsHeader}>
           <TouchableOpacity onPress={() => setHistoryTab('transactions')} style={[styles.historyTabBtn, historyTab === 'transactions' && styles.historyTabActive]}>
              <Text style={[styles.historyTabText, historyTab === 'transactions' && styles.historyTabTextActive]}>{t.transactions || "Transactions"}</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setHistoryTab('withdrawals')} style={[styles.historyTabBtn, historyTab === 'withdrawals' && styles.historyTabActive]}>
              <Text style={[styles.historyTabText, historyTab === 'withdrawals' && styles.historyTabTextActive]}>{t.withdrawals || "Withdrawals"}</Text>
           </TouchableOpacity>
        </View>

        {historyTab === 'transactions' ? (
          <>
            <View style={styles.historyHeader}>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={styles.indicator} /><Text style={styles.sectionTitle}>Transaction History</Text>
               </View>
               <TouchableOpacity onPress={() => router.push('/transactions')}><Text style={styles.viewAll}>VIEW ALL</Text></TouchableOpacity>
            </View>

            {transactions.length === 0 ? <Text style={{textAlign: 'center', marginTop: 10}}>No transactions yet.</Text> : transactions.map(item => (
              <View key={item._id} style={styles.historyItem}>
                <View style={[styles.iconCircle, {backgroundColor: item.type === 'Debit' ? '#FFF3E0' : '#E8F5E9'}]}>
                   <Ionicons name={item.type === 'Debit' ? 'wallet-outline' : 'leaf-outline'} size={20} color="#1B5E20" />
                </View>
                <View style={styles.itemInfo}>
                   <Text style={styles.itemTitle}>{item.source}</Text>
                   <Text style={styles.itemSub}>{item.notes}</Text>
                </View>
                <View style={styles.itemRight}>
                   <Text style={[styles.itemAmount, {color: item.type === 'Debit' && !(item.amountCash > 0 && item.amountCoins > 0) ? '#000' : '#2E7D32', textAlign: 'right'}]}>
                     {item.amountCash > 0 && item.amountCoins > 0 
                         ? (item.type === 'Debit' ? `- ${item.amountCoins} Coins\n+ ₹${item.amountCash}` : `+ ₹${item.amountCash}\n+ ${item.amountCoins} Coins`)
                         : (item.amountCash > 0 ? `${item.type === 'Credit' ? '+' : '-'} ₹${item.amountCash}` : `${item.type === 'Credit' ? '+' : '-'} ${item.amountCoins} Coins`)
                     }
                   </Text>
                   <Text style={styles.itemDate}>{new Date(item.date).toDateString()}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.historyHeader}>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={styles.indicator} /><Text style={styles.sectionTitle}>Withdrawal History</Text>
               </View>
            </View>

            {withdrawalHistory.length === 0 ? <Text style={{textAlign: 'center', marginTop: 10}}>No withdrawals yet.</Text> : withdrawalHistory.map(item => (
              <View key={item._id} style={styles.historyItem}>
                <View style={[styles.iconCircle, {backgroundColor: item.status === 'Approved' ? '#E8F5E9' : (item.status === 'Rejected' ? '#FFEBEE' : '#FFF3E0')}]}>
                   <MaterialIcons name={item.status === 'Approved' ? 'check-circle' : (item.status === 'Rejected' ? 'cancel' : 'pending')} size={20} color={item.status === 'Approved' ? '#2E7D32' : (item.status === 'Rejected' ? '#C62828' : '#E65100')} />
                </View>
                <View style={styles.itemInfo}>
                   <Text style={styles.itemTitle}>UPI Withdrawal</Text>
                   <Text style={styles.itemSub}>{item.upiId}</Text>
                </View>
                <View style={styles.itemRight}>
                   <Text style={[styles.itemAmount, {color: '#000'}]}>₹{item.amount}</Text>
                   <Text style={[styles.itemDate, {color: item.status === 'Approved' ? '#2E7D32' : (item.status === 'Rejected' ? '#C62828' : '#E65100')}]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* --- 🛡️ Security Section --- */}
        <View style={styles.securityRow}>
           <View style={[styles.secCard, {backgroundColor: '#FFECB3'}]}>
              <MaterialCommunityIcons name="lock-clock" size={28} color="#E65100" style={{opacity: 0.3, position: 'absolute', right: 10, top: 10}}/>
              <Text style={styles.secHeading}>24h Processing</Text>
              <Text style={styles.secSub}>Typical withdrawal time</Text>
           </View>
           <View style={[styles.secCard, {backgroundColor: '#FFEBEE'}]}>
              <MaterialIcons name="verified-user" size={28} color="#D32F2F" style={{opacity: 0.1, position: 'absolute', right: 10, top: 10}}/>
              <Text style={styles.secHeading}>100% Secure</Text>
              <Text style={styles.secSub}>Encrypted transactions</Text>
           </View>
        </View>

      </ScrollView>

      {/* --- 🟢 BOTTOM NAVBAR (Same as Home) --- */}
      <View style={[styles.bottomTab, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />
        
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.9} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="camera" size={26} color="#fff" />
            <Text style={styles.centerText}>PHOTO{"\n"}UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label="Fertilize" onPress={() => router.push('/plant')} />
        <TabItem icon="cash-outline" label="Earn" onPress={() => router.push('/earn')} />
      </View>
    </SafeAreaView>
  );
}

// Sub components
const TabItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF7' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  
  // Balance Card
  balanceCard: { margin: 15, borderRadius: 35, padding: 25, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#fff', fontSize: 10, opacity: 0.7, fontWeight: 'bold', letterSpacing: 0.5 },
  coinAmount: { color: '#fff', fontSize: 42, fontWeight: 'bold', marginTop: 10 },
  coinUnit: { fontSize: 18, fontWeight: 'normal', opacity: 0.9 },
  rupeeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  rupeeLine: { width: 30, height: 2, backgroundColor: '#FFC107', marginRight: 10 },
  rupeeAmount: { color: '#FFC107', fontSize: 24, fontWeight: 'bold' },
  earningLabel: { color: '#fff', fontSize: 10, opacity: 0.7, fontWeight: '500' },
  srsSectionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginTop: 20 },
  srsSectionItem: { alignItems: 'flex-start' },
  srsSectionLabel: { color: '#fff', fontSize: 10, opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' },
  srsSectionValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  srsDivider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center' },
  conversionInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20 },
  rateBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  conversionRateText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  convertBtn: { borderRadius: 15, overflow: 'hidden', elevation: 5 },
  convertBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
  convertBtnText: { color: '#1B5E20', fontSize: 11, fontWeight: 'bold' },

  // Withdraw Box
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, marginTop: 15 },
  indicator: { width: 4, height: 18, backgroundColor: '#1B5E20', borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  withdrawCard: { backgroundColor: '#fff', margin: 15, borderRadius: 30, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 10, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDEDED', borderRadius: 12, paddingHorizontal: 15, height: 55 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  withdrawNowBtn: { backgroundColor: '#1B3C1B', height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  withdrawText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // History Tabs
  historyTabsHeader: { flexDirection: 'row', marginHorizontal: 20, marginTop: 15, backgroundColor: '#EDEDED', borderRadius: 15, padding: 4 },
  historyTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  historyTabActive: { backgroundColor: '#fff', elevation: 2 },
  historyTabText: { fontSize: 13, color: '#000', fontWeight: '600' }, // Changed to black
  historyTabTextActive: { color: '#000', fontWeight: 'bold' }, // Changed to bold black

  // History Main
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15, marginBottom: 10 },
  viewAll: { fontSize: 10, fontWeight: 'bold', color: '#1B5E20' },
  historyItem: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 12, borderRadius: 25, padding: 15, alignItems: 'center', elevation: 2 },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemSub: { fontSize: 10, color: '#777', marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: 14, fontWeight: 'bold' },
  itemDate: { fontSize: 8, color: '#999', marginTop: 4, textTransform: 'uppercase' },

  // Security Row
  securityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 20 },
  secCard: { width: '48%', padding: 20, borderRadius: 25, overflow: 'hidden' },
  secHeading: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  secSub: { fontSize: 9, color: '#666', marginTop: 4 },

  // Navbar
  bottomTab: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 10 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#F7FAF7' },
  centerText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
