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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

// 🌌 Premium Particle Component
const FloatingParticle = ({ delay, startPos }) => {
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 4000 + Math.random() * 2000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -height * 0.4]
    });
    const opacity = anim.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 0.6, 0.6, 0]
    });
    const translateX = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, Math.random() * 50 - 25, 0]
    });

    return (
        <Animated.View style={[styles.particle, { 
            left: startPos, 
            opacity, 
            transform: [{ translateY }, { translateX }] 
        }]}>
            <FontAwesome5 name="star" size={8 + Math.random() * 6} color="#FFD700" />
        </Animated.View>
    );
};

export default function WeeklyLootScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [countdown, setCountdown] = useState("LOADING...");
  const boxAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse effect for the glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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
    } catch (e) {
        setCountdown("OFFLINE");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
        if (user?.lastWeeklyLootAt) {
            calculateCountdown(user.lastWeeklyLootAt);
        } else if (user) {
            setCountdown("READY");
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [user]);

  const calculateCountdown = (lastLootDate) => {
    if (!lastLootDate) {
        setCountdown("READY");
        return;
    }
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
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
        const secs = Math.floor((remaining % 60000) / 1000);
        
        if (days > 0) {
            setCountdown(`${days}d ${hours}h ${mins}m`);
        } else {
            setCountdown(`${hours}h ${mins}m ${secs}s`);
        }
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const handleOpenBox = async () => {
    if (isOpening || countdown !== "READY") return;
    
    setIsOpening(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Animated.loop(
      Animated.sequence([
        Animated.timing(boxAnim, { toValue: 1.15, duration: 60, useNativeDriver: true }),
        Animated.timing(boxAnim, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      ]),
      { iterations: 12 }
    ).start(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/auth/rewards/weekly`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("🎊 MAGICAL LOOT!", data.message || "You discovered a secret treasure!", [{ text: "COLLECT", onPress: fetchProfile }]);
            } else {
                Alert.alert("Locked", data.error || "Chest is currently empty.");
            }
        } catch (e) {
            Alert.alert("Connection Error", "Please try again later.");
        } finally {
            setIsOpening(false);
            boxAnim.setValue(1);
        }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#002B24', '#004D40', '#002B24']} style={styles.gradientBg}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Particles Overlay */}
          {[...Array(8)].map((_, i) => (
            <FloatingParticle key={i} delay={i * 800} startPos={(width / 8) * i + 20} />
          ))}

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close-circle-outline" size={32} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
                <Text style={styles.headerTitle}>WEEKLY LOOT</Text>
                <View style={styles.titleUnderline} />
            </View>
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.content}>
             <View style={styles.mainStage}>
                {/* 🌟 Background Glow */}
                <Animated.View style={[styles.glowRing, { 
                    opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0.2, 0.5] }),
                    transform: [{ scale: glowAnim.interpolate({ inputRange:[0,1], outputRange:[1, 1.3] }) }]
                }]} />

                <Animated.View style={[styles.chestBox, { transform: [{ scale: boxAnim }] }]}>
                    <LinearGradient colors={['rgba(255,215,0,0.1)', 'transparent']} style={styles.chestInnerGlow} />
                    <MaterialCommunityIcons 
                        name={countdown === "READY" ? "treasure-chest" : "lock-clock"} 
                        size={160} 
                        color={countdown === "READY" ? "#FFD700" : "rgba(255,255,255,0.2)"} 
                    />
                    {countdown === "READY" && (
                        <View style={styles.readyBadge}>
                            <Text style={styles.readyBadgeText}>READY</Text>
                        </View>
                    )}
                </Animated.View>
                
                <View style={styles.statusSection}>
                    <Text style={styles.statusLabel}>
                        {countdown === "READY" ? "TAP TO REVEAL TREASURE" : "NEXT LOOT IN"}
                    </Text>
                    <View style={styles.timerContainer}>
                        <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.timerGlass}>
                            <Text style={[styles.timerValue, countdown === "READY" && styles.readyTimer]}>
                                {countdown}
                            </Text>
                        </LinearGradient>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.actionBtn, countdown !== "READY" && styles.disabledBtn]} 
                    onPress={handleOpenBox}
                    disabled={countdown !== "READY" || isOpening}
                >
                    <LinearGradient 
                        colors={countdown === "READY" ? ['#FFD700', '#F9A825', '#FFD700'] : ['#444', '#222']} 
                        start={{x:0, y:0}} end={{x:1, y:0}}
                        style={styles.actionBtnInner}
                    >
                        <Text style={styles.actionBtnText}>
                            {isOpening ? "UNLOCKING..." : countdown === "READY" ? "CLAIM REWARD" : "LOCKED"}
                        </Text>
                        {countdown === "READY" && <Ionicons name="flash" size={18} color="#fff" />}
                    </LinearGradient>
                </TouchableOpacity>
             </View>

             <View style={styles.footerCard}>
                <View style={styles.infoRow}>
                    <View style={styles.infoIconBox}>
                        <FontAwesome5 name="gem" size={14} color="#FFD700" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoTitle}>Guaranteed Rewards</Text>
                        <Text style={styles.infoSub}>Open every week for 200-1000 Coins & items.</Text>
                    </View>
                </View>
             </View>
          </View>

        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#002B24' },
  gradientBg: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 10 },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  titleUnderline: { width: 40, height: 3, backgroundColor: '#FFD700', marginTop: 5, borderRadius: 2 },
  backBtn: { padding: 5 },
  
  particle: { position: 'absolute', bottom: -50, zIndex: 1 },
  
  content: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  mainStage: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 40, paddingVertical: 50, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  
  glowRing: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#FFD700', top: 50 },
  
  chestBox: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', borderRadius: 110, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 2, borderColor: 'rgba(255,215,0,0.2)', shadowColor: '#FFD700', shadowOpacity: 0.2, shadowRadius: 20 },
  chestInnerGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 110 },
  
  readyBadge: { position: 'absolute', top: 30, right: 20, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, transform: [{ rotate: '15deg' }] },
  readyBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },

  statusSection: { alignItems: 'center', marginTop: 40, width: '100%' },
  statusLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  timerContainer: { width: '100%', alignItems: 'center' },
  timerGlass: { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 200, alignItems: 'center' },
  timerValue: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  readyTimer: { color: '#FFD700', textShadowColor: 'rgba(255,215,0,0.5)', textShadowRadius: 10 },

  actionBtn: { width: '100%', height: 65, borderRadius: 20, marginTop: 40, overflow: 'hidden', elevation: 15, shadowColor: '#FFD700', shadowOpacity: 0.4, shadowRadius: 15 },
  actionBtnInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  disabledBtn: { shadowOpacity: 0, elevation: 0, opacity: 0.8 },

  footerCard: { marginTop: 30, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  infoIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  infoTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  infoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }
});
