import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function MenuScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: 'User', mobile: '', coins: 0 });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserData({ name: data.user.name, mobile: data.user.mobile, coins: data.user.walletCoins });
      }
    } catch (e) {}
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: async () => {
        await AsyncStorage.clear();
        router.replace('/login');
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* User Card */}
        <TouchableOpacity style={styles.userCard} onPress={() => router.push('/profile')}>
          <Image source={require('../assets/user.png')} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userMobile}>{userData.mobile}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* --- 🛡️ Main UI Logic (SRS 3.17) --- */}
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>GAMIFICATION & SOCIAL</Text>
            <MenuItem icon="people" label="My Team (Referral Tree)" route="/referral_team" color="#4CAF50" />
            <MenuItem icon="megaphone" label="सूचना बोर्ड (Home Feed)" route="/notice" color="#FF9800" />
            <MenuItem icon="stats-chart" label="Rank Board (Leaderboard)" route="/leaderboard" color="#2196F3" />
            <MenuItem icon="flash" label="Daily Mission & Spin" route="/missions" color="#F44336" />
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionLabel}>MY ASSETS</Text>
            <MenuItem icon="wallet" label="My Income (Wallet Summary)" route="/wallet" color="#1B5E20" />
            <MenuItem icon="ribbon" label="Download Tree Certificate" route="/certificate" color="#9C27B0" />
            <MenuItem icon="camera" label="Real Plantation Upload" route="/real_tree" color="#3F51B5" />
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionLabel}>SUPPORT & LEGAL</Text>
            <MenuItem icon="chatbubble-ellipses" label="Feedback & Complaints" route="/feedback" color="#009688" />
            <MenuItem icon="help-buoy" label="Help Us" route="/help" color="#607D8B" />
            <MenuItem icon="information-circle" label="About Us" route="/about_team" color="#795548" />
            <MenuItem icon="document-text" label="Terms & Conditions" route="/terms" color="#455A64" />
            <MenuItem icon="shield-checkmark" label="Privacy Policy" route="/privacy" color="#455A64" />
        </View>

        <View style={styles.footer}>
            <Text style={styles.footerText}>Treeniti v2.5.0</Text>
            <Text style={styles.footerSub}>Making India Green Again</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, label, route, color }) => {
    const router = useRouter();
    return (
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push(route)}>
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#eee" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20' },
  scroll: { padding: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 25, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userMobile: { fontSize: 13, color: '#777', marginTop: 2 },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 11, color: '#999', fontWeight: 'bold', letterSpacing: 1, marginBottom: 15, marginLeft: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 10, paddingBottom: 20 },
  footerText: { fontSize: 12, color: '#ccc', fontWeight: 'bold' },
  footerSub: { fontSize: 10, color: '#ddd', marginTop: 2 }
});
