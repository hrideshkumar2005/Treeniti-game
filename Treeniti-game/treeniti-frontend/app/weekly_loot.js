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
  Modal,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
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
  const [isOpened, setIsOpened] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const [coinsToAnimate, setCoinsToAnimate] = useState([]);
  const badgeScale = useRef(new Animated.Value(1)).current;
  const boxAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

  const triggerCoinAnimation = (startX = width / 2 - 12, startY = height / 2) => {
    playCoinSound();
    const coinCount = 15;
    startX = width / 2 - 12; // Center horizontally
    startY = height * 0.45; // Center vertically at the chest/box stage
    const targetX = width - 65; 
    const targetY = Platform.OS === 'ios' ? 50 : 60; 

    const newCoins = Array.from({ length: coinCount }).map((_, index) => {
      const angle = (index / coinCount) * 2 * Math.PI;
      const burstDist = 25 + Math.random() * 50;
      const burstX = startX + Math.cos(angle) * burstDist;
      const burstY = startY + Math.sin(angle) * burstDist;

      return {
        id: `${Date.now()}-${index}`,
        anim: new Animated.ValueXY({ x: startX, y: startY }),
        burstX,
        burstY,
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
        spin: new Animated.Value(0),
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
          Animated.delay(100 + index * 60), 
          Animated.parallel([
            Animated.timing(coin.anim, {
              toValue: { x: targetX, y: targetY },
              duration: 1500 + Math.random() * 300,
              easing: Easing.bezier(0.2, 0.8, 0.2, 1),
              useNativeDriver: true
            }),
            Animated.timing(coin.spin, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true
            }),
            Animated.timing(coin.scale, {
              toValue: 0.7,
              duration: 1500,
              useNativeDriver: true
            }),
            Animated.timing(coin.opacity, {
              toValue: 0,
              delay: 1300,
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
            setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
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
                setIsOpened(true);
                setWonAmount(data.reward);
                triggerCoinAnimation();
                setTimeout(() => {
                    setShowRewardModal(true);
                }, 800);
            } else {
                Alert.alert("Locked", data.error || "Surprise box is currently empty.");
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
                <Text style={styles.headerTitle}>SURPRISE BOX</Text>
                <View style={styles.titleUnderline} />
            </View>
            <Animated.View style={[styles.coinBadge, { transform: [{ scale: badgeScale }] }]}>
              <FontAwesome5 name="coins" size={14} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.coinText}>{user?.walletCoins || 0}</Text>
            </Animated.View>
          </View>

          <View style={styles.content}>
             <View style={styles.mainStage}>
                {/* 🌟 Background Glow */}
                <Animated.View style={[styles.glowRing, { 
                    opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0.2, 0.5] }),
                    transform: [{ scale: glowAnim.interpolate({ inputRange:[0,1], outputRange:[1, 1.3] }) }]
                }]} />

                <Animated.View style={[
                  styles.chestBox, 
                  countdown === "READY" && styles.chestBoxReady,
                  { transform: [{ scale: boxAnim }] }
                ]}>
                  {countdown === "READY" ? (
                    <LinearGradient 
                      colors={['#FF1744', '#B71C1C']} 
                      style={StyleSheet.absoluteFillObject}
                      start={{x:0, y:0}} end={{x:1, y:1}}
                    />
                  ) : (
                    <LinearGradient 
                      colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.3)']} 
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <MaterialCommunityIcons 
                      name={countdown === "READY" ? (isOpened ? "gift-open" : "gift") : "gift"} 
                      size={120} 
                      color={countdown === "READY" ? "#FFD700" : "rgba(255,255,255,0.15)"} 
                  />
                  {countdown === "READY" && !isOpened && (
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

      {/* 🪙 Golden Flying Coins Overlay Wrapper */}
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 99999, elevation: 99999 }} pointerEvents="none">
        {coinsToAnimate.map(coin => {
          const targetY = Platform.OS === 'ios' ? 50 : 60;
          const spinRotation = coin.spin.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '720deg']
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

      {/* 🎉 Premium Surprise Reward Modal 🎉 */}
      <Modal visible={showRewardModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <LinearGradient colors={['#004D40', '#002B24']} style={styles.modalCard}>
            <MaterialCommunityIcons name="gift-open" size={100} color="#FFD700" style={{ alignSelf: 'center', marginBottom: 20 }} />
            <Text style={styles.modalTitle}>🎉 SURPRISE BOX 🎉</Text>
            <Text style={styles.modalCoins}>+{wonAmount} COINS</Text>
            <Text style={styles.modalSubtitle}>Added to your wallet successfully!</Text>

            <TouchableOpacity style={styles.collectBtn} onPress={() => {
                setShowRewardModal(false);
                fetchProfile();
                setIsOpened(false);
            }}>
              <LinearGradient colors={['#FFD700', '#F9A825']} style={styles.collectBtnInner}>
                <Text style={styles.collectBtnText}>AWESOME!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

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
  chestBoxReady: {
    borderColor: '#FFD700',
    borderWidth: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
    overflow: 'hidden'
  },
  
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
  infoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  coinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  goldCoin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '85%',
    borderRadius: 30,
    padding: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10
  },
  modalCoins: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowRadius: 15,
    marginVertical: 15,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 30
  },
  collectBtn: {
    width: '100%',
    height: 55,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  collectBtnInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  collectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5
  }
});
