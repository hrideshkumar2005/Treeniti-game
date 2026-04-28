import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
// import LottieView from 'lottie-react-native'; // Removed due to missing dependency
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

export default function WeeklyLootScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [countdown, setCountdown] = useState("");
  const boxAnim = useRef(new Animated.Value(1)).current;

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
          setUser(data.user);
          calculateCountdown(data.user.lastWeeklyLootAt);
      }
    } catch (e) {}
  };

  const calculateCountdown = (lastLootDate) => {
    if (!lastLootDate) {
        setCountdown("READY");
        return;
    }
    const ONE_WEEK = 604800000;
    const last = new Date(lastLootDate).getTime();
    const now = Date.now();
    const diff = now - last;
    
    if (diff >= ONE_WEEK) {
        setCountdown("READY");
    } else {
        const remaining = ONE_WEEK - diff;
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        setCountdown(`${days}d ${hours}h ${mins}m`);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const handleOpenBox = async () => {
    if (isOpening || countdown !== "READY") return;
    
    setIsOpening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Shake animation
    Animated.sequence([
      Animated.timing(boxAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(boxAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(boxAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(boxAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/auth/rewards/weekly`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("🎁 WEEKLY LOOT!", data.message, [{ text: "AWESOME!", onPress: fetchProfile }]);
            } else {
                Alert.alert("Wait", data.error);
            }
        } catch (e) {
            Alert.alert("Error", "Could not open the loot chest.");
        } finally {
            setIsOpening(false);
        }
    });
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/image.png')} style={styles.bg} imageStyle={{ opacity: 0.1 }}>
        <SafeAreaView style={styles.safeArea}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>WEEKLY LOOT</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.content}>
             <View style={styles.chestContainer}>
                <Animated.View style={{ transform: [{ scale: boxAnim }] }}>
                    <MaterialCommunityIcons 
                        name={countdown === "READY" ? "treasure-chest" : "lock-reset"} 
                        size={180} 
                        color={countdown === "READY" ? "#FFD700" : "#A5D6A7"} 
                    />
                </Animated.View>
                
                <Text style={styles.lootTitle}>
                    {countdown === "READY" ? "YOUR WEEKLY REWARD IS READY!" : "LOOT CHARGING..."}
                </Text>
                
                <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                    <Text style={styles.timerText}>{countdown}</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.openBtn, countdown !== "READY" && styles.disabledBtn]} 
                    onPress={handleOpenBox}
                    disabled={countdown !== "READY" || isOpening}
                >
                    <LinearGradient 
                        colors={countdown === "READY" ? ['#FFD700', '#F57F17'] : ['#555', '#333']} 
                        style={styles.openBtnInner}
                    >
                        <Text style={styles.openBtnText}>{isOpening ? "OPENING..." : countdown === "READY" ? "OPEN CHEST" : "LOCKED"}</Text>
                    </LinearGradient>
                </TouchableOpacity>
             </View>

             <View style={styles.infoBox}>
                <Text style={styles.infoHead}>What is Weekly Loot?</Text>
                <Text style={styles.infoDesc}>
                    Every 7 days, you get a chance to open a mysterious treasure chest containing between 200 to 1000 coins! Keep playing and come back next week for more.
                </Text>
             </View>
          </View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004D40' },
  bg: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  chestContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 40, borderRadius: 40, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  lootTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 30, marginBottom: 20 },
  
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 25, gap: 10, marginBottom: 40 },
  timerText: { color: '#FFD700', fontSize: 22, fontWeight: '900' },

  openBtn: { width: '100%', height: 60, borderRadius: 30, overflow: 'hidden', elevation: 10, shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 10 },
  disabledBtn: { shadowOpacity: 0, elevation: 0 },
  openBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  openBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  infoBox: { marginTop: 50, padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  infoHead: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  infoDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }
});
