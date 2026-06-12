import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Alert, Linking, ActivityIndicator, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
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
  const [coinsToAnimate, setCoinsToAnimate] = useState([]);
  const badgeScale = useRef(new Animated.Value(1)).current;

  const playCoinSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/coin_collect.mp3')
      );
      await sound.playAsync();
      setTimeout(() => {
        sound.unloadAsync().catch(() => {});
      }, 2500);
    } catch (e) {
      console.log("Audio play error:", e);
    }
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
      playsInSilentModeIOS: true,
      shouldRouteThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
    }).catch(e => console.log("Audio mode error:", e));
  }, []);

  const triggerCoinAnimation = (startX = width / 2 - 12, startY = Dimensions.get('window').height / 2) => {
    playCoinSound();
    const coinCount = 12;
    startX = width / 2 - 12; // Force strictly to the horizontal center of the screen
    const targetX = width - 65; 
    const targetY = Platform.OS === 'ios' ? 50 : 60; 

    const newCoins = Array.from({ length: coinCount }).map((_, index) => {
      const angle = (index / coinCount) * 2 * Math.PI;
      const burstDist = 25 + Math.random() * 40;
      const burstX = startX + Math.cos(angle) * burstDist;
      const burstY = startY + Math.sin(angle) * burstDist;

      return {
        id: `${Date.now()}-${index}`,
        anim: new Animated.ValueXY({ x: startX, y: startY }),
        burstX,
        burstY,
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
        startX,
        startY
      };
    });

    setCoinsToAnimate(prev => [...prev, ...newCoins]);

    newCoins.forEach((coin, index) => {
      Animated.parallel([
        Animated.timing(coin.anim, {
          toValue: { x: coin.burstX, y: coin.burstY },
          duration: 350,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true
        }),
        Animated.timing(coin.scale, {
          toValue: 1.2,
          duration: 250,
          useNativeDriver: true
        }),
        Animated.timing(coin.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        Animated.sequence([
          Animated.delay(120 + index * 80), // Cascade delay
          Animated.parallel([
            Animated.timing(coin.anim, {
              toValue: { x: targetX, y: targetY },
              duration: 1600 + Math.random() * 400,
              easing: Easing.bezier(0.2, 0.8, 0.2, 1),
              useNativeDriver: true
            }),
            Animated.timing(coin.scale, {
              toValue: 0.7,
              duration: 1600,
              useNativeDriver: true
            }),
            Animated.timing(coin.opacity, {
              toValue: 0,
              delay: 1400,
              duration: 200,
              useNativeDriver: true
            })
          ])
        ]).start(() => {
          setCoinsToAnimate(prev => prev.filter(c => c.id !== coin.id));
          Animated.sequence([
            Animated.timing(badgeScale, {
              toValue: 1.25,
              duration: 80,
              useNativeDriver: true
            }),
            Animated.timing(badgeScale, {
              toValue: 1.0,
              duration: 80,
              useNativeDriver: true
            })
          ]).start();
        });
      });
    });
  };

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
        const res = await fetch(`${BASE_URL}/auth/rewards/social`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ platform })
        });
        const data = await res.json();
        
        if (data.success) {
          triggerCoinAnimation(width / 2, Dimensions.get('window').height / 2);
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
        <Animated.View style={[styles.coinBadge, { transform: [{ scale: badgeScale }] }]}>
          <FontAwesome5 name="coins" size={14} color="#FBC02D" style={{ marginRight: 6 }} />
          <Text style={styles.coinText}>{user?.walletCoins || 0}</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 📢 Missions Header --- */}
        <View style={styles.missionHeaderRow}>
          <View>
            <Text style={styles.missionTitle}>{language === 'hi' ? 'सोशल मिशन' : 'Social Missions'}</Text>
            <Text style={styles.missionSub}>Follow our official handles to get instant coins</Text>
          </View>
          <View style={styles.countPill}>
             <Text style={styles.missionCount}>6 TASKS</Text>
          </View>
        </View>

        {/* --- 📝 Mission List --- */}
        <View style={styles.listContainer}>
          {[
            { id: 'YouTube', title: language === 'hi' ? 'TREENITI TV को सब्सक्राइब करें' : "Subscribe to TREENITI TV", icon: <Ionicons name="logo-youtube" size={28} color="#FF0000" />, brandColor: '#FF0000' },
            { id: 'Facebook', title: language === 'hi' ? 'फेसबुक पेज को लाइक करें' : "Like Facebook Page", icon: <Ionicons name="logo-facebook" size={28} color="#1877F2" />, brandColor: '#1877F2' },
            { id: 'Instagram', title: language === 'hi' ? 'इंस्टाग्राम पर फॉलो करें' : "Follow us on Instagram", icon: <Ionicons name="logo-instagram" size={28} color="#E1306C" />, brandColor: '#E1306C' },
            { id: 'X', title: language === 'hi' ? 'X (ट्विटर) पर फॉलो करें' : "Follow on X (Twitter)", icon: <Ionicons name="logo-twitter" size={28} color="#000000" />, brandColor: '#000000' },
            { id: 'WhatsApp', title: language === 'hi' ? 'व्हाट्सएप स्टेटस शेयर करें' : "Share WhatsApp Status", icon: <Ionicons name="logo-whatsapp" size={28} color="#25D366" />, brandColor: '#25D366' },
            { id: 'Telegram', title: language === 'hi' ? 'टेलीग्राम चैनल ज्वाइन करें' : "Join Telegram Channel", icon: <Ionicons name="paper-plane" size={28} color="#0088cc" />, brandColor: '#0088cc' },
          ].map((mission) => (
            <MissionCard 
              key={mission.id}
              icon={mission.icon}
              title={mission.title}
              reward={rewards[mission.id] || 50}
              onPress={() => handleSocialAction(mission.id)}
              completed={isClaimed(mission.id)}
              loading={claiming === mission.id}
              t={t}
              brandColor={mission.brandColor}
            />
          ))}
        </View>

      </ScrollView>

      {/* --- 🟢 Fixed Bottom Navbar --- */}
      <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />
        
        <View style={styles.centerCol}>
          <TouchableOpacity style={styles.centerBtn} activeOpacity={0.85} onPress={() => router.push('/upload_tree')}>
            <LinearGradient
              colors={['#4CAF50', '#1B5E20']}
              style={styles.centerBtnInner}
            >
              <Ionicons name="camera" size={22} color="#fff" style={{ marginBottom: 1 }} />
              <Text style={styles.centerText}>UPLOAD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TabItem icon="leaf-outline" label={t.fertilize || "Fertilize"} onPress={() => router.push('/plant')} />
        <TabItem icon="gift-outline" label={t.earn || "Earn"} active={true} onPress={() => router.push('/earn')} />
      </View>

      {/* 🪙 Golden Flying Coins Overlay Wrapper */}
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 99999, elevation: 99999 }} pointerEvents="none">
        {coinsToAnimate.map(coin => {
          const targetY = Platform.OS === 'ios' ? 50 : 60;
          const spinRotation = coin.anim.y.interpolate({
            inputRange: [targetY, Math.max(targetY + 1, coin.startY)],
            outputRange: ['720deg', '0deg'],
            extrapolate: 'clamp'
          });
          return (
            <Animated.View
              key={coin.id}
              style={{
                position: 'absolute',
                zIndex: 99999,
                elevation: 99999,
                left: 0,
                top: 0,
                transform: [
                  { translateX: coin.anim.x },
                  { translateY: coin.anim.y },
                  { scale: coin.scale },
                  { rotate: spinRotation }
                ],
                opacity: coin.opacity
              }}
            >
              <View style={styles.goldCoin}>
                <FontAwesome5 name="coins" size={14} color="#FFD700" />
              </View>
            </Animated.View>
          );
        })}
      </View>

    </SafeAreaView>
  );
}

 // --- Mission Card Helper Component ---
const MissionCard = ({ icon, title, reward, onPress, completed, loading, t, brandColor }) => (
  <View style={[
    styles.card, 
    completed && { opacity: 0.7 },
    { borderLeftWidth: 4, borderLeftColor: brandColor }
  ]}>
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
      style={[
        styles.claimBtn, 
        completed ? { backgroundColor: '#4CAF50' } : { backgroundColor: brandColor }
      ]} 
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

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={styles.tabBtn}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={[styles.tabIconCircle, active && styles.activeTabIcon]}>
      <Ionicons name={icon} size={24} color={active ? "#1B5E20" : "#fff"} />
    </View>
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
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 9999
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -5 },
  tabIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  activeTabIcon: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 9.5, color: '#fff', marginTop: 2, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -22, alignItems: 'center', zIndex: 10000 },
  centerBtnInner: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  centerText: { fontSize: 8, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 1, letterSpacing: 0.5 },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  goldCoin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F57F17',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 8
  },
});
