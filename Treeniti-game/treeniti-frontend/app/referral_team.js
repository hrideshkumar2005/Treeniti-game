import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');

export default function ReferralTeam() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Backend States ---
  const [profile, setProfile] = useState({});
  const [teamData, setTeamData] = useState({
    totalEarnings: 0,
    networkSize: 0,
    activeRate: 0,
    progress: 0,
    stats: {
      unlockedCount: 0,
      loginRewardsPaid: 0,
      day3RewardsPaid: 0,
      day7RewardsPaid: 0
    }
  });

  const fetchTeamStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resWallet = await fetch(`${BASE_URL}/wallet`, { headers: { 'Authorization': `Bearer ${token}` } });
      const dataW = await resWallet.json();
      
      const resProf = await fetch(`${BASE_URL}/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      const dataP = await resProf.json();
      
      if(dataW.success && dataP.success) {
         setTeamData({ 
            totalEarnings: dataW.wallet.referralAmount || 0, 
            networkSize: dataW.wallet.referralStats?.totalReferred || 0,
            activeRate: dataW.wallet.referralStats?.unlockedCount > 0 ? Math.round((dataW.wallet.referralStats.unlockedCount / dataW.wallet.referralStats.totalReferred) * 100) : 0,
            progress: (dataW.wallet.referralStats?.unlockedCount / 10) || 0, // Just a visual scale
            stats: dataW.wallet.referralStats || {}
         });
         setProfile(dataP.user);
      }
    } catch(e) {}
  };

  useFocusEffect(useCallback(()=>{ fetchTeamStats(); }, []));

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join my Treeniti team! Grow trees & earn cash: https://treeniti.app/refer/${profile.referralCode || 'NETWORK'}`,
      });
    } catch (error) { console.log(error.message); }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team & Referrals</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- 🟢 Earnings Card (Exact Screenshot) --- */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>TOTAL REFERRAL EARNINGS</Text>
          <View style={styles.amountRow}>
             <Text style={styles.currencySymbol}>₹</Text>
             <Text style={styles.earningsAmount}>{teamData.totalEarnings}</Text>
          </View>
          
          <View style={styles.withdrawLimitBox}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.withdrawLimitText}> Minimum withdrawal: ₹50</Text>
          </View>

          <TouchableOpacity style={styles.mainActionBtn} onPress={onShare}>
            <Ionicons name="share-social" size={20} color="#1B5E20" />
            <Text style={styles.mainActionBtnText}>Share Invite Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.mainActionBtn, {marginTop: 12}]}>
            <Text style={styles.mainActionBtnText}>Withdraw Referral Money</Text>
          </TouchableOpacity>
        </View>

        {/* --- ⚪ Milestones Section --- */}
        <Text style={styles.sectionHeading}>Growth Milestones</Text>
        <View style={styles.milestoneCard}>
          <View style={styles.progressBarContainer}>
             <View style={[styles.progressFill, {width: `${Math.min(teamData.progress * 100, 100)}%`}]} />
             <View style={styles.progressYellowTip} />
          </View>
          
          <View style={styles.milestoneRow}>
             <MilestoneItem label="Friend Logins" val="₹5" active={teamData.stats?.loginRewardsPaid > 0} />
             <MilestoneItem label="Active 3 Days" val="₹6" active={teamData.stats?.day3RewardsPaid > 0} />
             <MilestoneItem label="Active 7 Days" val="₹10" active={teamData.stats?.day7RewardsPaid > 0} />
          </View>
        </View>

        {/* --- 🌲 Your Ecosystem (Tree Structure) --- */}
        <Text style={styles.sectionHeading}>Your Ecosystem</Text>
        <View style={styles.ecosystemCard}>
          {/* Tier A - Top Node */}
          <View style={styles.nodeContainer}>
            <View style={styles.topAvatarBorder}>
              <View style={styles.topAvatarInside}>
                <Ionicons name="caret-up-outline" size={24} color="#4DB6AC" />
              </View>
            </View>
            <View style={styles.tierBadge}><Text style={styles.tierBadgeText}>TIER A (YOU)</Text></View>
          </View>

          {/* Connection Curves (Mocked with Dashed lines) */}
          <View style={styles.treeLinesContainer}>
             <Text style={styles.treeDashedLines}>⋰  ⋱</Text>
          </View>

          {/* Tier B - Mid Nodes */}
          <View style={styles.tierBRow}>
             <View style={styles.nodeContainer}>
                <View style={styles.avatarGroup}>
                   <View style={[styles.miniAvatar, {backgroundColor: '#263238'}]} />
                   <View style={[styles.miniAvatar, {backgroundColor: '#111', marginLeft: -15}]} />
                   <View style={[styles.miniAvatar, styles.plusAvatar]}><Text style={styles.plusText}>+8</Text></View>
                </View>
                <Text style={styles.tierBName}>Tier B</Text>
                <Text style={styles.tierBComm}>5% Commission</Text>
             </View>

             <View style={styles.nodeContainer}>
                <View style={styles.avatarGroup}>
                   <View style={[styles.miniAvatar, {backgroundColor: '#111'}]}><Text style={{color:'#fff', fontSize:10}}>B</Text></View>
                   <View style={[styles.miniAvatar, {backgroundColor: '#222', marginLeft: -15}]}><Text style={{color:'#fff', fontSize:10}}>B</Text></View>
                </View>
                <Text style={styles.tierBName}>Tier B</Text>
                <Text style={styles.tierBComm}>5% Commission</Text>
             </View>
          </View>

          {/* Tier C - Network Box */}
          <View style={styles.tierCBox}>
             <Text style={styles.tierCTitle}>Tier C Network</Text>
             <View style={styles.dotRow}>
                {[1,2,3,4,5].map(i => <View key={i} style={styles.dotAvatar} />)}
                <View style={[styles.dotAvatar, {backgroundColor: '#B0BEC5'}]}><Text style={styles.plusText}>+24</Text></View>
             </View>
             <Text style={styles.tierCHint}>Earn 2% on all Tier C growth activity</Text>
          </View>
        </View>

        {/* --- 📊 Stats Grid --- */}
        <View style={styles.statsRow}>
           <View style={styles.statBox}>
              <MaterialCommunityIcons name="google-circles-extended" size={24} color="#1B5E20" />
              <Text style={styles.statLabel}>Network Size</Text>
              <Text style={styles.statValue}>{teamData.networkSize}</Text>
              <Text style={styles.statSub}>+5 this week</Text>
           </View>

           <View style={[styles.statBox, {backgroundColor: '#FFECB3'}]}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#E65100" />
              <Text style={styles.statLabel}>Active Rate</Text>
              <Text style={[styles.statValue, {color: '#E65100'}]}>{teamData.activeRate}%</Text>
              <Text style={styles.statSub}>Top 5% of Referrers</Text>
           </View>
        </View>
      </ScrollView>

      {/* --- 🟢 Optimized Docked Navbar --- */}
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
        <TabItem icon="people" label="Team" active={true} onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

// Sub components
const MilestoneItem = ({ label, val, active }) => (
  <View style={styles.milestoneItem}>
     <View style={[styles.mCircle, active && styles.mCircleActive]} />
     <Text style={[styles.mLabel, !active && {color: '#999'}]}>{label}</Text>
     <Text style={[styles.mVal, !active && {color: '#CCC'}]}>{val}</Text>
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
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F4F8F4' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  scrollContent: { paddingBottom: 150 },

  // Earnings Card
  earningsCard: { 
    backgroundColor: '#1B3C1B', 
    margin: 15, 
    borderRadius: 40, 
    padding: 30, 
    alignItems: 'center', 
    elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10
  },
  earningsLabel: { color: '#A5D6A7', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  currencySymbol: { color: '#FFC107', fontSize: 32, fontWeight: 'bold', marginRight: 10 },
  earningsAmount: { color: '#fff', fontSize: 50, fontWeight: 'bold' },
  withdrawLimitBox: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  withdrawLimitText: { color: '#fff', fontSize: 10 },
  mainActionBtn: { backgroundColor: '#FFC107', width: '100%', paddingVertical: 14, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  mainActionBtnText: { color: '#1B3C1B', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },

  // Milestones
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginLeft: 20, marginTop: 10, marginBottom: 15 },
  milestoneCard: { backgroundColor: '#fff', marginHorizontal: 15, borderRadius: 30, padding: 20, elevation: 2 },
  progressBarContainer: { height: 12, backgroundColor: '#E8F5E9', borderRadius: 6, flexDirection: 'row', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1B3C1B' },
  progressYellowTip: { height: '100%', width: 10, backgroundColor: '#FFC107' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  milestoneItem: { alignItems: 'center', flex: 1 },
  mCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0E0E0', marginBottom: 8 },
  mCircleActive: { backgroundColor: '#1B5E20' },
  mLabel: { fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  mVal: { fontSize: 8, color: '#666', marginTop: 2 },

  // Ecosystem Tree
  ecosystemCard: { backgroundColor: '#fff', marginHorizontal: 15, borderRadius: 35, padding: 25, alignItems: 'center', elevation: 2 },
  topAvatarBorder: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: '#FFC107', padding: 3 },
  topAvatarInside: { flex: 1, backgroundColor: '#111', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  tierBadge: { backgroundColor: '#1B3C1B', paddingHorizontal: 15, paddingVertical: 4, borderRadius: 10, marginTop: -15 },
  tierBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  treeLinesContainer: { paddingVertical: 5 },
  treeDashedLines: { color: '#1B5E20', fontSize: 30, opacity: 0.5 },
  tierBRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 5 },
  avatarGroup: { flexDirection: 'row', marginBottom: 10 },
  miniAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  plusAvatar: { backgroundColor: '#A5D6A7', marginLeft: -15 },
  plusText: { fontSize: 10, fontWeight: 'bold', color: '#1B3C1B' },
  tierBName: { fontSize: 12, fontWeight: 'bold' },
  tierBComm: { fontSize: 8, color: '#999' },
  tierCBox: { backgroundColor: '#F5FAF5', width: '100%', borderRadius: 25, padding: 15, marginTop: 20, alignItems: 'center' },
  tierCTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 12 },
  dotRow: { flexDirection: 'row', alignItems: 'center' },
  dotAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFCCBC', marginRight: 5, justifyContent: 'center', alignItems: 'center' },
  tierCHint: { fontSize: 8, color: '#AAA', marginTop: 12, fontStyle: 'italic' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 20 },
  statBox: { width: '48%', backgroundColor: '#E8F5E9', padding: 20, borderRadius: 30, alignItems: 'flex-start' },
  statLabel: { fontSize: 12, fontWeight: 'bold', color: '#1B5E20', marginTop: 10 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20', marginVertical: 2 },
  statSub: { fontSize: 9, color: '#666' },

  // Bottom Tab
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#6DBE71',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 1, fontWeight: '700', textAlign: 'center' },
  centerBtn: { marginTop: -20, alignItems: 'center' },
  centerBtnInner: { width: 54, height: 54, backgroundColor: '#1B3C1B', borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#F4F8F4' },
  centerText: { fontSize: 6.5, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -1 },
});
