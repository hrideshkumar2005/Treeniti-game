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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.followUs || "Social Rewards"}</Text>
        <View style={styles.coinBadge}>
          <View style={styles.coinDot} />
          <Text style={styles.coinText}>{user?.walletCoins || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 📢 Missions Header --- */}
        <View style={styles.missionHeaderRow}>
          <View>
            <Text style={styles.missionTitle}>{language === 'hi' ? 'सोशल मिशन' : 'Social Missions'}</Text>
            <Text style={styles.missionSub}>Follow our official handles to get instant coins</Text>
          </View>
          <View style={styles.countPill}>
             <Text style={styles.missionCount}>3 TASKS</Text>
          </View>
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

const TabItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF8' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F5F0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1B5E20', flex: 1, marginLeft: 15, letterSpacing: 0.5 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9' },
  coinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBC02D', marginRight: 8 },
  coinText: { fontSize: 14, fontWeight: 'bold', color: '#1B5E20' },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 180 },

  missionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  missionTitle: { fontSize: 24, fontWeight: '900', color: '#1B3C1B' },
  missionSub: { fontSize: 12, color: '#666', marginTop: 4 },
  countPill: { backgroundColor: '#1B5E20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  missionCount: { fontSize: 10, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },

  listContainer: { width: '100%' },
  
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#2C3E50', marginBottom: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center' },
  rewardText: { fontSize: 13, fontWeight: 'bold', color: '#B8860B' }, 
  
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
