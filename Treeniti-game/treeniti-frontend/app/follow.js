import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';
import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function FollowUs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);
  const [claiming, setClaiming] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUser(data.user);
    } catch (e) {}
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const rewards = config?.socialRewards || { YouTube: 150, Instagram: 150, WhatsApp: 150 };
  const links = config?.socialLinks || { 
    YouTube: 'https://youtube.com', 
    Instagram: 'https://instagram.com', 
    WhatsApp: 'https://wa.me' 
  };

  const handleSocialAction = async (platform) => {
    const url = links[platform];
    if (!url) {
      Alert.alert("Available Soon", `The admin hasn't set the ${platform} link yet.`);
      return;
    }

    // Open the Link
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Could not open the link.");
      return;
    }

    // Wait a bit and then allow claiming
    setClaiming(platform);
    setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/rewards/social`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ platform })
        });
        const data = await res.json();
        
        if (data.success) {
          Alert.alert("Success! 🎉", data.message);
          fetchProfile(); // Update coin balance
        } else {
          Alert.alert("Claim Info", data.error || "You might need to follow first.");
        }
      } catch (err) {
        Alert.alert("Network Error", "Verification failed.");
      } finally {
        setClaiming(null);
      }
    }, 2000); // 2 second delay before verification
  };

  const isClaimed = (platform) => user?.claimedSocials?.includes(platform);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- 🟢 Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.followUs || "Follow Us & Earn Extra"}</Text>
        <View style={styles.coinBadge}>
          <FontAwesome5 name="coins" size={12} color="#FBC02D" />
          <Text style={styles.coinText}> {user?.walletCoins || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 📢 Missions Header --- */}
        <View style={styles.missionHeaderRow}>
          <Text style={styles.missionTitle}>{language === 'hi' ? 'सोशल मिशन' : 'Social Missions'}</Text>
          <Text style={styles.missionCount}>3 {language === 'hi' ? 'कार्य उपलब्ध' : 'TASKS AVAILABLE'}</Text>
        </View>

        {/* --- 📝 Mission List --- */}
        <View style={styles.listContainer}>
          
           {/* Task 1: YouTube */}
          <MissionCard 
            icon={<Ionicons name="logo-youtube" size={28} color="#FF0000" />}
            title={language === 'hi' ? 'TREENITI TV को सब्सक्राइब करें' : "Subscribe to TREENITI TV"}
            reward={rewards.YouTube || 150}
            onPress={() => handleSocialAction('YouTube')}
            completed={isClaimed('YouTube')}
            loading={claiming === 'YouTube'}
            t={t}
          />

          {/* Task 2: Instagram */}
          <MissionCard 
            icon={<Ionicons name="logo-instagram" size={28} color="#E1306C" />}
            title={language === 'hi' ? 'हमें इंस्टाग्राम पर फॉलो करें' : "Follow us on Instagram"}
            reward={rewards.Instagram || 150}
            onPress={() => handleSocialAction('Instagram')}
            completed={isClaimed('Instagram')}
            loading={claiming === 'Instagram'}
            t={t}
          />

          {/* Task 3: WhatsApp */}
          <MissionCard 
            icon={<Ionicons name="logo-whatsapp" size={28} color="#25D366" />}
            title={language === 'hi' ? 'व्हाट्सएप स्टेटस पर शेयर करें' : "Share on WhatsApp Status"}
            reward={rewards.WhatsApp || 50}
            onPress={() => handleSocialAction('WhatsApp')}
            completed={isClaimed('WhatsApp')}
            loading={claiming === 'WhatsApp'}
            t={t}
          />

        </View>

      </ScrollView>

      {/* --- 🟢 Fixed Bottom Navbar --- */}
      <View style={[styles.bottomTab, { height: 70 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />
        
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.9} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="camera" size={26} color="#fff" />
            <Text style={styles.centerText}>PHOTO{"\n"}UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label={t.fertilize || "Fertilize"} onPress={() => router.push('/plant')} />
        <TabItem icon="cash-outline" label={t.earn || "Earn"} onPress={() => router.push('/earn')} />
      </View>

    </SafeAreaView>
  );
}

 // --- Mission Card Helper Component ---
const MissionCard = ({ icon, title, reward, onPress, completed, loading, t }) => (
  <View style={[styles.card, completed && { opacity: 0.7 }]}>
    <View style={styles.iconCircle}>
      {icon}
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.rewardRow}>
        <FontAwesome5 name="coins" size={12} color="#FBC02D" />
        <Text style={styles.rewardText}> {t.get || 'Get'} {reward} {t.coins || 'Coins'}</Text>
      </View>
    </View>
    <TouchableOpacity 
      style={[styles.claimBtn, completed && { backgroundColor: '#4CAF50' }]} 
      activeOpacity={0.7} 
      onPress={onPress}
      disabled={completed || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.claimBtnText}>{completed ? (t.claimed || "Claimed") : (t.claim || "Claim")}</Text>
      )}
    </TouchableOpacity>
  </View>
);

// --- Tab Item Helper ---
const TabItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, justifyContent: 'space-between' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', flex: 1, marginLeft: 10 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, elevation: 2 },
  coinText: { fontSize: 13, fontWeight: 'bold', color: '#1B5E20' },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 180 },

  missionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 25, marginTop: 10 },
  missionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1B3C1B' },
  missionCount: { fontSize: 11, fontWeight: 'bold', color: '#666', letterSpacing: 0.5 },

  listContainer: { width: '100%' },
  
  // --- Mission Card Styles ---
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 50, // Pure rounded pill shape like screenshot
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center' },
  rewardText: { fontSize: 12, fontWeight: 'bold', color: '#8B6B23' }, // Brownish gold
  
  claimBtn: {
    backgroundColor: '#1B3C1B',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    marginRight: 5,
  },
  claimBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // --- Navbar Styles ---
  bottomTab: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 10 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#fff' },
  centerText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
