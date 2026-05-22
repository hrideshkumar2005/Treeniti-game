import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
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
import { Audio } from 'expo-av';
import BASE_URL from '../config/api';

const SOUNDS = {
  spin: require('../assets/sounds/spin_sound.wav'),
  win: 'https://www.soundjay.com/misc/sounds/success-fanfare-trumpets-1.mp3',
  click: 'https://www.soundjay.com/misc/sounds/button-press-1.mp3',
};

const { width, height } = Dimensions.get('window');
const WHEEL_SIZE = width * 0.85;

const REWARDS = [
  { label: "0", value: 0, color: '#F44336' },
  { label: "5", value: 5, color: '#4CAF50' },
  { label: "10", value: 10, color: '#2196F3' },
  { label: "15", value: 15, color: '#FF9800' },
  { label: "20", value: 20, color: '#9C27B0' },
  { label: "25", value: 25, color: '#E91E63' },
  { label: "50", value: 50, color: '#FFD700' },
  { label: "100", value: 100, color: '#00BCD4' },
];

export default function SpinWheelScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationState = useRef(0);
  const soundRef = useRef(null);

  useEffect(() => {
    // Enable audio in silent mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
      playsInSilentModeIOS: true,
      shouldRouteThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    let timer;
    if (adPlaying && adCountdown > 0) {
      timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (adPlaying && adCountdown === 0) {
      setAdPlaying(false);
      setTimeout(() => {
        handleSpin(true);
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [adPlaying, adCountdown]);

  const triggerAdWatch = () => {
    setAdPlaying(true);
    setAdCountdown(5);
  };

  async function playSound(type) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      let source;
      if (type === 'spin') source = SOUNDS.spin;
      else if (type === 'win') source = typeof SOUNDS.win === 'string' ? { uri: SOUNDS.win } : SOUNDS.win;
      else if (type === 'click') source = typeof SOUNDS.click === 'string' ? { uri: SOUNDS.click } : SOUNDS.click;

      const { sound } = await Audio.Sound.createAsync(source);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log("Sound Error:", e);
    }
  }

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

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  const handleSpin = async (watchAd = false) => {
    if (isSpinning) return;
    const isAd = watchAd === true;
    
    playSound('click');
    // Haptic start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/auth/rewards/spin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ watchAd: isAd })
      });
      const data = await res.json();

      if (!data.success) {
        if (data.adRequired) {
          Alert.alert(
            "🎰 Limit / Cooldown Active",
            data.error,
            [
              { text: "Watch Video Ad 🎥", onPress: () => triggerAdWatch() },
              { text: "Cancel", style: "cancel" }
            ]
          );
          return;
        }
        Alert.alert("Limit Reached", data.error || "You have used all spins for today!");
        return;
      }

      setIsSpinning(true);
      playSound('spin');

      const rewardValue = data.wonCoins;
      let targetIndex = REWARDS.findIndex(r => r.value === rewardValue);
      if (targetIndex === -1) targetIndex = 0;

      const rotations = 10 + Math.floor(Math.random() * 5); 
      const segmentDeg = 360 / REWARDS.length;
      const spinOffset = (360 - (targetIndex * segmentDeg)) % 360;
      
      const currentBase = Math.floor(rotationState.current / 360) * 360;
      const targetDeg = currentBase + (rotations * 360) + spinOffset;

      Animated.timing(spinAnim, {
        toValue: targetDeg,
        duration: 4000,
        easing: Easing.bezier(0.15, 0, 0, 1),
        useNativeDriver: true,
      }).start(() => {
        setIsSpinning(false);
        if (rewardValue > 0) playSound('win');
        rotationState.current = targetDeg;
        
        // Success haptics
        if (rewardValue > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert(
          rewardValue > 0 ? "🎉 Congratulations!" : "Better luck next time!",
          data.message || `You won ${rewardValue} coins!`,
          [{ text: "OK", onPress: fetchProfile }]
        );
      });

    } catch (e) {
      Alert.alert("Error", "Check your connection and try again.");
      setIsSpinning(false);
    }
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1000000],
    outputRange: ['0deg', '1000000deg'],
  });

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/image.jpg')} style={styles.bg} imageStyle={{ opacity: 0.15 }}>
        <SafeAreaView style={styles.safeArea}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
                <Text style={styles.headerTitle}>LUCKY SPIN</Text>
                <Text style={styles.headerSub}>Spin to win big rewards!</Text>
            </View>
            <View style={styles.coinBadge}>
                <FontAwesome5 name="coins" size={14} color="#FFD700" />
                <Text style={styles.coinText}>{user?.walletCoins || 0}</Text>
            </View>
          </View>

          <View style={styles.mainContent}>
            
            {/* Spins Left Counter */}
            <View style={styles.spinsLeftBox}>
                {user?.dailySpinCount >= 2 ? (
                  <Text style={styles.spinsLeftText}>🎥 AD SPIN ACTIVE</Text>
                ) : (
                  <>
                    <Text style={styles.spinsLeftText}>Free Spins Left Today: </Text>
                    <Text style={styles.spinsLeftNum}>{2 - (user?.dailySpinCount || 0)}</Text>
                  </>
                )}
            </View>

            <View style={styles.wheelWrapper}>
              {/* Pointer */}
              <View style={styles.pointerBox}>
                <Ionicons name="caret-down" size={50} color="#FFD700" />
              </View>

              <Animated.View style={[styles.wheelContainer, { transform: [{ rotate: spinRotation }] }]}>
                {REWARDS.map((r, i) => {
                  const angle = (i * 360) / REWARDS.length;
                  return (
                    <View key={i} style={[styles.segment, { transform: [{ rotate: `${angle}deg` }] }]}>
                      <View style={[styles.segmentColor, { borderTopColor: r.color }]} />
                      <View style={styles.segmentContent}>
                        <Text style={styles.segmentText}>{r.label}</Text>
                        <FontAwesome5 name="coins" size={12} color="#fff" />
                      </View>
                    </View>
                  );
                })}
                {/* Hub Decoration */}
                <View style={styles.wheelHubInner} />
              </Animated.View>

              {/* Center Button */}
              <TouchableOpacity style={styles.spinButton} onPress={handleSpin} disabled={isSpinning}>
                <LinearGradient colors={['#FFD700', '#FF8F00']} style={styles.spinButtonInner}>
                  <Text style={styles.spinButtonText}>{isSpinning ? "WAIT" : "SPIN"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom Info */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={20} color="#FFD700" />
                    <Text style={styles.infoText}>Win up to 100 coins in one spin!</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color="#A5D6A7" />
                    <Text style={styles.infoText}>Resets every day at midnight.</Text>
                </View>
            </View>

          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* 🎥 Full-screen Gamified Ad Player Overlay */}
      {adPlaying && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(27,94,32,0.98)']}
            style={styles.adFullscreenContainer}
          >
            <View style={styles.adBox}>
              <MaterialCommunityIcons name="play-circle" size={80} color="#FFD700" style={styles.adIconAnim} />
              <Text style={styles.adTitle}>SPONSOR VIDEO AD</Text>
              <Text style={styles.adSub}>Reward unlocked in: <Text style={styles.adTimerText}>{adCountdown}s</Text></Text>
              
              <View style={styles.adProgressBarContainer}>
                <View style={[styles.adProgressBarFill, { width: `${(adCountdown / 5) * 100}%` }]} />
              </View>

              <Text style={styles.adFooter}>Please do not close the ad to claim your Spin!</Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B5E20' },
  bg: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { flex: 1, marginLeft: 15 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: '#A5D6A7', fontSize: 12, fontWeight: 'bold' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#FFD700' },
  coinText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spinsLeftBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  spinsLeftText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  spinsLeftNum: { color: '#FFD700', fontSize: 18, fontWeight: '900' },

  wheelWrapper: { width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center', justifyContent: 'center' },
  pointerBox: { position: 'absolute', top: -35, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5, elevation: 10 },
  wheelContainer: { width: '100%', height: '100%', borderRadius: WHEEL_SIZE / 2, borderWidth: 8, borderColor: '#FFD700', backgroundColor: '#fff', overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15 },
  
  // 🎡 New Slice Design
  segment: { 
    position: 'absolute', 
    width: WHEEL_SIZE, 
    height: WHEEL_SIZE, 
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  segmentColor: { 
    position: 'absolute', 
    top: 0,
    width: 0, 
    height: 0, 
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: (WHEEL_SIZE / 2) * Math.tan((22.5 * Math.PI) / 180), // 22.5 deg half-slice
    borderRightWidth: (WHEEL_SIZE / 2) * Math.tan((22.5 * Math.PI) / 180),
    borderTopWidth: WHEEL_SIZE / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#f00', // Dynamic
  },
  segmentContent: { 
    position: 'absolute',
    top: 30, 
    alignItems: 'center',
    zIndex: 5,
  },
  segmentText: { color: '#fff', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  wheelHubInner: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#1B5E20', alignSelf: 'center', top: (WHEEL_SIZE/2) - 20, borderWidth: 3, borderColor: '#FFD700', zIndex: 30 },
  
  spinButton: { position: 'absolute', zIndex: 50, width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', elevation: 15, padding: 5, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10 },
  spinButtonInner: { flex: 1, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  spinButtonText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  infoCard: { width: width * 0.85, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 20, marginTop: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  adFullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  adBox: {
    width: '85%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  adIconAnim: {
    marginBottom: 20,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowRadius: 15,
  },
  adTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  adSub: {
    color: '#a5d6a7',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 25,
  },
  adTimerText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
  },
  adProgressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 30,
  },
  adProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  adFooter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
