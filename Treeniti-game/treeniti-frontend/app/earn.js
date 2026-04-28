import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');

export default function EarnMore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loadingAd, setLoadingAd] = useState(false);
  const [showLB, setShowLB] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/auth/config/public`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) setConfig(data.config);
    } catch(e) {}
  };

  const fetchLB = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/leaderboard/global`, { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        if(data.success && data.leaders) setLeaderboard(data.leaders);
        setShowLB(true);
    } catch(e) {
        Alert.alert("Error", "Could not load leaderboard data.");
    }
  };

  const showAdPolicy = () => {
      Alert.alert(
          "Reward Information",
          "1. Rewards are for app engagement and environmental awareness.\n2. Custom videos are managed by the admin.\n3. Virtual coins have no intrinsic value outside this ecosystem.\n4. Deceptive practices will result in a ban."
      );
  };

  const watchAdTrigger = async () => {
     if(!config || !config.rewardedVideoLink) {
         Alert.alert("Available Soon", "The admin hasn't set an active reward video yet. Please check back later.");
         return;
     }

     setLoadingAd(true);
     
     // 🔗 Step 1: Open the Admin's configured Video Link
     try {
         await Linking.openURL(config.rewardedVideoLink);
     } catch(e) {
         Alert.alert("Error", "Could not open the video link. Please contact support.");
         setLoadingAd(false);
         return;
     }

     // ⏳ Step 2: Simulated/Wait Period (Admin-configured)
     // Use the time specified by admin or fallback to 30s
     const waitTime = (config.rewardWaitTimeSec || 30) * 1000;
     
     setTimeout(async () => {
         setLoadingAd(false);
          try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${BASE_URL}/wallet/claim-ad`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              if(data.success) Alert.alert("Reward Claimed!", data.message);
              else Alert.alert("Wait!", data.error || "Please wait a bit longer to claim.");
          } catch(e) {
              Alert.alert("Network Error", "Reward verification failed.");
          }
     }, waitTime); 
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earn More Rewards</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.policyBadge} onPress={showAdPolicy}>
            <Ionicons name="information-circle-outline" size={14} color="#5D4037" />
            <Text style={styles.policyText}>  Custom Ad Policy (Reward: {config?.rewardedAdCoins || 10} Coins)</Text>
        </TouchableOpacity>

        <View style={styles.listContainer}>
          <ActionCard 
            icon={<MaterialCommunityIcons name="newspaper-variant-outline" size={26} color="#fff" />}
            iconBg="#E53935" 
            title="Read Daily Articles"
            btnText="Read"
            onPress={() => router.push('/articles')} 
          />

          <ActionCard 
            icon={<Ionicons name="play-circle" size={28} color="#fff" />}
            iconBg="#8E24AA" 
            title="Watch Special Video"
            btnText={loadingAd ? "Waiting..." : "Watch"}
            onPress={watchAdTrigger}
          />

           <ActionCard 
            icon={<Ionicons name="trophy" size={24} color="#fff" />}
            iconBg="#FF8F00" 
            title="Global Leaderboard"
            btnText="View List"
            onPress={fetchLB}
          />



          <ActionCard 
            icon={<Ionicons name="cart-outline" size={28} color="#444" />}
            iconBg="#CFD8DC" 
            title="Treenit Store"
            btnText="Store"
            onPress={() => router.push('/products')}
          />
        </View>
      </ScrollView>

      {/* Leaderboard Modal */}
      <Modal visible={showLB} transparent={true} animationType="slide" onRequestClose={()=>setShowLB(false)}>
          <View style={styles.modalBg}>
             <View style={styles.modalCard}>
                 <Text style={styles.modalTitle}>🏆 Global Ranking</Text>
                 <ScrollView style={{width: '100%', marginTop: 20}}>
                     {(leaderboard || []).map((u, i) => (
                         <View key={i} style={styles.lbRow}>
                             <Text style={styles.lbRank}>#{i+1}</Text>
                             <View style={{flex: 1}}>
                                <Text style={styles.lbName}>{u.name || "User"}</Text>
                                <Text style={{fontSize: 10, color: '#999'}}>{(u.mobile || u.mobileNumber || "0000000000").substring(0,6)}****</Text>
                             </View>
                             <Text style={styles.lbCoins}>{u.walletCoins || u.score || 0} 🪙</Text>
                         </View>
                     ))}
                 </ScrollView>
                 <TouchableOpacity style={styles.closeBtn} onPress={()=>setShowLB(false)}>
                     <Text style={{color: '#fff', fontWeight: 'bold'}}>Close</Text>
                 </TouchableOpacity>
             </View>
          </View>
      </Modal>

      {/* Optimized Fixed Bottom Navbar */}
      <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.85} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="camera" size={26} color="#fff" />
            <Text style={styles.centerText}>UPLOAD</Text>
          </View>
        </TouchableOpacity>
        <TabItem icon="leaf-outline" label="Fertilize" onPress={() => router.push('/plant')} />
        <TabItem icon="cash" label="Earn" active={true} onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

const ActionCard = ({ icon, iconBg, title, btnText, onPress }) => (
  <View style={styles.card}>
    <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.rewardRow}>
        <FontAwesome5 name="coins" size={12} color="#FBC02D" />
        <Text style={styles.rewardText}> Earn Rewards</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.actionBtnText}>{btnText}</Text>
    </TouchableOpacity>
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity 
    style={styles.tabBtn} 
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={[styles.tabIconCircle, active && { backgroundColor: '#fff' }]}>
      <Ionicons name={icon} size={20} color={active ? "#1B5E20" : "#fff"} />
    </View>
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  policyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', padding: 10, borderRadius: 10, marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FBC02D' },
  policyText: { fontSize: 11, fontWeight: 'bold', color: '#5D4037' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 150 },
  listContainer: { width: '100%', marginTop: 10 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 12, alignItems: 'center', marginBottom: 20, elevation: 3 },
  iconCircle: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rewardText: { fontSize: 12, fontWeight: 'bold', color: '#8B6B23' }, 
  actionBtn: { backgroundColor: '#1B3C1B', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  bottomTab: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 1, fontWeight: '700', textAlign: 'center' },
  centerBtn: { marginTop: -20, alignItems: 'center' },
  centerBtnInner: { width: 54, height: 54, backgroundColor: '#1B3C1B', borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#F4F8F4' },
  centerText: { fontSize: 6.5, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20' },
  lbRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  lbRank: { fontWeight: 'bold', width: 40, color: '#FBC02D' },
  lbName: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  lbCoins: { fontWeight: 'bold', color: '#1B5E20' },
  closeBtn: { marginTop: 20, backgroundColor: '#1B5E20', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 }
});
