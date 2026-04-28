import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function DailyCheckIn() {
  const router = useRouter();

  // 3 Ghante ka time (Seconds mein) = 3 * 60 * 60 = 10800
  const TOTAL_TIME = 10800; 
  
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isClaimable, setIsClaimable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. App khulte hi Check karo aakhri baar kab claim kiya tha
  useEffect(() => {
    loadTimerData();
  }, []);

  const loadTimerData = async () => {
    try {
      const lastClaimTime = await AsyncStorage.getItem('last_harvest_time');
      
      if (lastClaimTime) {
        // Kitna time beet gaya (Seconds mein)
        const passedSeconds = Math.floor((Date.now() - parseInt(lastClaimTime)) / 1000);
        
        if (passedSeconds < TOTAL_TIME) {
          // Agar 3 ghante nahi huye, toh bacha hua time set karo
          setTimeLeft(TOTAL_TIME - passedSeconds);
          setIsClaimable(false);
        } else {
          // 3 ghante poore ho gaye, toh claim karne do
          setTimeLeft(0);
          setIsClaimable(true);
        }
      } else {
        // Pehli baar aaya hai toh direct claim karne do
        setTimeLeft(0);
        setIsClaimable(true);
      }
    } catch (e) {
      console.log("Timer Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Har second Timer ko kam karo (Live running)
  useEffect(() => {
    if (timeLeft > 0 && !isLoading) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            setIsClaimable(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [timeLeft, isLoading]);

  // 3. Reward Claim karne ka function
  const handleClaimReward = async () => {
    if (isClaimable) {
      Alert.alert("🎉 Congratulations!", "200 Coins Claimed Successfully!");
      
      // Naya time save karo aur timer wapas 3 hours par set karo
      const now = Date.now().toString();
      await AsyncStorage.setItem('last_harvest_time', now);
      
      setTimeLeft(TOTAL_TIME);
      setIsClaimable(false);
    }
  };

  // --- Time Formatting ---
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Progress & percentage calculation
  const progressPercent = ((TOTAL_TIME - timeLeft) / TOTAL_TIME) * 100;

  if (isLoading) return null; // Wait for data to load

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- 🟢 Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Check In</Text>
      </View>

      {/* --- ⚪ Main Content Area --- */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 🎁 Reward Card --- */}
        <View style={styles.rewardCard}>
          
          <View style={styles.cardTopRow}>
            <View style={styles.timeBonusTag}>
              <Text style={styles.timeBonusText}>TIME BONUS</Text>
            </View>
            <Text style={styles.coinAmount}>200</Text>
          </View>

          <Text style={styles.cardTitle}>3-Hour Harvest</Text>
          <Text style={styles.cardSub}>Log-in every 3 hour{"\n"}to claim</Text>

          {/* Dynamic Timer Row */}
          <View style={styles.timerRow}>
            <View style={styles.timeWrap}>
              <Ionicons name="time-outline" size={15} color="#1B5E20" />
              <Text style={styles.timeText}> {timeString}</Text>
            </View>
            <Text style={styles.percentText}>{Math.round(progressPercent)}%</Text>
          </View>

          {/* Dynamic Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]}>
              {/* Yellow Tip - sirf tab dikhega jab timer chal raha ho */}
              {!isClaimable && <View style={styles.progressTip} />}
            </View>
          </View>

          {/* Smart Button */}
          <TouchableOpacity 
            style={[styles.claimBtn, isClaimable ? styles.claimBtnActive : styles.claimBtnDisabled]} 
            activeOpacity={isClaimable ? 0.8 : 1}
            onPress={handleClaimReward}
          >
            <Text style={[styles.claimBtnText, isClaimable && styles.claimBtnTextActive]}>
              {isClaimable ? "CLAIM REWARD" : "REWARD GROWING..."}
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* --- 🟢 Fixed Bottom Navbar --- */}
      <View style={styles.bottomTab}>
        <TabItem icon="home" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Add Water" />
        
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.9} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="add" size={28} color="#fff" />
            <Text style={styles.centerText}>PHOTO{"\n"}UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label="Add Fertilizer" />
        <TabItem icon="cash-outline" label="Earn More" />
      </View>

    </SafeAreaView>
  );
}

// --- Tab Item Helper ---
const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <View style={[styles.tabIconCircle, active && {backgroundColor: '#fff'}]}>
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

  scrollContent: { paddingHorizontal: width * 0.05, paddingTop: 20, paddingBottom: 120 },

  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  timeBonusTag: { backgroundColor: '#FADCD4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
  timeBonusText: { color: '#C67A65', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  coinAmount: { fontSize: 28, fontWeight: 'bold', color: '#5D4037' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 5 },
  cardSub: { fontSize: 14, color: '#666', marginBottom: 25, lineHeight: 20 },

  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeWrap: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: 'bold', color: '#1B5E20', marginLeft: 4 },
  percentText: { fontSize: 13, fontWeight: 'bold', color: '#1B5E20' },
  
  progressBarBg: { height: 14, backgroundColor: '#C8E6C9', borderRadius: 7, overflow: 'hidden', marginBottom: 30, position: 'relative' },
  progressBarFill: { height: '100%', backgroundColor: '#1B3C1B', borderRadius: 7, position: 'relative' },
  progressTip: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, backgroundColor: '#FFCA28', borderTopRightRadius: 7, borderBottomRightRadius: 7 },

  claimBtn: { paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  claimBtnDisabled: { backgroundColor: '#E0E0E0' },
  claimBtnActive: { backgroundColor: '#1B3C1B', elevation: 3 }, 
  claimBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5, color: '#999' },
  claimBtnTextActive: { color: '#fff' },

  bottomTab: { position: 'absolute', bottom: 0, width: '100%', height: 75, backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#fff' },
  centerText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
