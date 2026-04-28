import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Platform, Alert, Animated, Easing, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');
const MAX_WIDTH = 500;

export default function MissionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [timer, setTimer] = useState("Ready");
  const [progress, setProgress] = useState(1.0);
  const [config, setConfig] = useState(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationState = useRef(0);

  const rewards = [
    { label: "0", value: 0 },
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "15", value: 15 },
    { label: "20", value: 20 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
  ];

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if(!token) return;

      // Fetch Config for dynamic rewards & links
      const configRes = await fetch(`${BASE_URL}/auth/config/public`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const configData = await configRes.json();
      if(configData.success) setConfig(configData.config);

      const res = await fetch(`${BASE_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) {
          setUser(data.user);
      }
      
      const resMissions = await fetch(`${BASE_URL}/auth/missions`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const missionData = await resMissions.json();
      if(missionData.success) {
          setMissions(missionData.missions);
      }
    } catch(e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));

  useEffect(() => {
    const intv = setInterval(() => {
        if (!user?.last3HourRewardAt) {
            setTimer("Ready");
            setProgress(1.0);
            return;
        }
        const now = Date.now();
        const diff = now - new Date(user.last3HourRewardAt).getTime();
        const threeHours = 3 * 3600000;
        
        if (diff >= threeHours) {
            setTimer("Ready");
            setProgress(1.0);
        } else {
            const remaining = threeHours - diff;
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setTimer(`${h}h ${m}m ${s}s`);
            setProgress(diff / threeHours);
        }
    }, 1000);
    return () => clearInterval(intv);
  }, [user]);

  const handleClaimReward = async (type, payload = {}) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = type === 'daily' ? '/auth/rewards/daily' : 
                       type === '3hour' ? '/auth/rewards/3hour' : 
                       type === 'social' ? '/auth/rewards/social' : '';
      
      // 🛡️ Special Logic for Social: Open URL first if available
      if (type === 'social' && config?.socialLinks) {
          const platformKey = payload.platform; // Matches 'YouTube', 'Facebook', etc.
          const targetUrl = config.socialLinks[platformKey];
          if (targetUrl) {
              await Linking.openURL(targetUrl);
          }
      }

      const res = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(data.success) {
          Alert.alert("🎉 Success", data.message);
          fetchProfile();
      } else {
          Alert.alert("Wait", data.error);
      }
    } catch(e) {
      Alert.alert("Error", "Request failed. Try again.");
    }
  };

  const handleSpin = async () => {
    if (isSpinning) return;
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/auth/rewards/spin`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!data.success) {
            Alert.alert("Limit Reached", data.error);
            return;
        }

        setIsSpinning(true);
        const rewardValue = data.wonCoins;
        let targetIndex = rewards.findIndex(r => r.value === rewardValue);
        if (targetIndex === -1) targetIndex = 0;

        const rotations = 12; // More rotations for better effect
        const segmentDeg = 360 / rewards.length;
        
        // Correct Math: To point at index I, rotate by (360 - (I * segmentDeg))
        const spinOffset = (360 - (targetIndex * segmentDeg)) % 360;
        
        // Continue from current position to avoid glitchy jumps
        // We add the offset relative to the current full-rotation state
        const currentBase = Math.floor(rotationState.current / 360) * 360;
        const targetDeg = currentBase + (rotations * 360) + spinOffset;

        Animated.timing(spinAnim, {
          toValue: targetDeg,
          duration: 6000, // Slightly slower for more suspense
          easing: Easing.bezier(0.2, 0, 0, 1), // Sharp start, very slow finish
          useNativeDriver: true,
        }).start(() => {
          setIsSpinning(false);
          Alert.alert("🎉 Result", data.message || `You won ${rewardValue} coins!`);
          rotationState.current = targetDeg;
          fetchProfile();
        });
    } catch (e) { Alert.alert("Error", "Spin failed."); }
  };

  const finalMessage = (val) => val > 0 ? `Congratulations! You won ${val} coins!` : "Bad luck! Try again tomorrow.";
  
  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1000000], // Huge range to support unlimited continuous spins
    outputRange: ['0deg', '1000000deg'],
  });

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Daily Missions 🎯</Text>
           <View style={styles.coinBadge}>
              <FontAwesome5 name="coins" size={14} color="#FFD700" />
              <Text style={styles.coinText}>{user?.walletCoins || 0}</Text>
           </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchProfile();}} />}
        >
          {/* Streak Section */}
          <View style={styles.streakCard}>
             <View style={styles.streakHeader}>
                <Text style={styles.streakTitle}>Daily Login Streak</Text>
                <View style={styles.streakCountBox}>
                   <MaterialCommunityIcons name="fire" size={20} color="#FF5722" />
                   <Text style={styles.streakCountText}>{user?.currentStreak || 0} Days</Text>
                </View>
             </View>
             <View style={styles.streakDots}>
                {[1,2,3,4,5,6,7].map(i => {
                   const streak = user?.currentStreak || 0;
                   const startDay = Math.floor(Math.max(0, streak - 1) / 7) * 7; 
                   const d = startDay + i;
                   const isActive = streak >= d;
                   return (
                   <View key={d} style={{ alignItems: 'center' }}>
                       <View style={[styles.streakDot, isActive && styles.streakDotActive]}>
                          {d % 3 === 0 
                             ? <FontAwesome5 name="gift" size={12} color={isActive ? '#fff' : 'rgba(255,255,255,0.4)'} /> 
                             : <Ionicons name="checkmark-sharp" size={14} color={isActive ? '#fff' : 'rgba(255,255,255,0.2)'} />}
                       </View>
                       <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, marginTop: 6, fontWeight: 'bold' }}>Day {d}</Text>
                   </View>
                   );
                })}
             </View>
             <Text style={styles.streakSub}>Bonus coins every 3 days!</Text>
          </View>

          {/* Wheel */}
          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Lucky Tree Spin</Text>
             <Text style={styles.sectionBadge}>{Math.max(0, 4 - (user?.dailySpinCount || 0))} LEFT</Text>
          </View>
          <View style={styles.wheelWrapper}>
             <View style={styles.wheelIndicator}><Ionicons name="caret-down" size={45} color="#FFD700" /></View>
             
             <Animated.View style={[styles.wheel, { transform: [{ rotate: spinRotation }] }]}>
                {/* Colorful wheel background using segments */}
                {rewards.map((r, i) => {
                    const colors = ['#FFD700', '#FF8F00', '#FFD700', '#FF8F00', '#FFD700', '#FF8F00', '#FFD700', '#FF8F00'];
                    return (
                       <View key={`bg-${i}`} style={[
                          StyleSheet.absoluteFill,
                          { transform: [{ rotate: `${(i * (360/rewards.length)) - (360/rewards.length)/2}deg` }] }
                       ]}>
                          <View style={{ width: '50%', height: '100%', backgroundColor: colors[i % colors.length], opacity: 0.1, position: 'absolute', right: 0 }} />
                       </View>
                    );
                })}

                {/* Inner darker circle for the text to sit on */}
                <View style={styles.wheelInner}>
                    {rewards.map((r, i) => (
                       <View key={`txt-${i}`} style={[styles.wheelSegment, { transform: [{ rotate: `${i * (360/rewards.length)}deg` }] }]}>
                          <Text style={styles.segmentLabel}>{r.label}</Text>
                          <FontAwesome5 name="coins" size={14} color="#FFD700" style={{marginTop: 5}} />
                       </View>
                    ))}
                </View>
             </Animated.View>
             
             <TouchableOpacity style={styles.spinCenter} onPress={handleSpin} disabled={isSpinning}>
                <LinearGradient colors={['#FFD700', '#F57F17']} style={styles.spinCenterInner}>
                   <Text style={styles.spinText}>{isSpinning ? "..." : "SPIN"}</Text>
                </LinearGradient>
             </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Missions Today</Text>
          </View>

          {missions.map(mission => (
             <MissionCard 
               key={mission.id}
               icon={mission.id === 'WATER_TREE' ? 'faucet' : mission.id === 'READ_ARTICLE' ? 'book-open' : 'calendar-check'} 
               title={mission.title} 
               sub={mission.completed ? "Completed!" : mission.current !== undefined ? `${mission.current}/${mission.target}` : "Active"}
               reward={mission.reward} 
               completed={mission.completed}
               onPress={() => {
                  if (mission.id === 'DAILY_LOGIN') {
                    handleClaimReward('daily');
                  } else if (mission.completed) {
                    return;
                  } else if (mission.id === 'WATER_TREE') {
                    Alert.alert("💧 Mission", "Water your tree 2 times from the Plant screen to complete this!");
                  } else if (mission.id === 'SPIN_WHEEL') {
                    Alert.alert("🎡 Mission", "Spin the Lucky Wheel above 4 times to claim this reward!");
                  } else if (mission.id === 'READ_ARTICLE') {
                    Alert.alert("📖 Mission", "Read the climate news articles in the Articles section to complete this!");
                  } else {
                    Alert.alert("Task", mission.title);
                  }
               }}
             />
          ))}

          <MissionCard 
            icon="clock" 
            title="3-Hour Harvest" 
            sub={timer === 'Ready' ? "Harvest Ready!" : `Next in ${timer}`}
            reward={config?.threeHourReward || 15} 
            completed={timer !== 'Ready' || (user?.daily3HourCount >= 5)}
            onPress={() => handleClaimReward('3hour')}
            progress={progress}
            isTimer
          />

          {/* Social Missions */}
          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Social Boosters (Dynamic)</Text>
          </View>
          
          {[
            { id: 'YouTube', label: 'Subscribe YouTube', icon: 'youtube' },
            { id: 'Facebook', label: 'Like Facebook', icon: 'facebook' },
            { id: 'Instagram', label: 'Follow Instagram', icon: 'instagram' },
            { id: 'X', label: 'Follow on X', icon: 'twitter' },
            { id: 'WhatsApp', label: 'Join WhatsApp', icon: 'whatsapp' },
            { id: 'Telegram', label: 'Join Telegram', icon: 'paper-plane' }
          ].map(social => (
            <SocialItem 
               key={social.id}
               platform={social.id}
               label={social.label}
               reward={config?.socialRewards?.[social.id] || 50}
               icon={social.icon}
               claimed={(user?.claimedSocials || []).includes(social.id)}
               onPress={() => handleClaimReward('social', { platform: social.id })}
            />
          ))}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const MissionCard = ({ icon, title, sub, reward, completed, onPress, progress, isTimer }) => (
  <TouchableOpacity 
    style={[styles.missionCard, completed && styles.missionCardCompleted]} 
    onPress={onPress} 
    disabled={completed}
  >
     <View style={styles.missionIconBox}>
        <FontAwesome5 name={icon} size={22} color={completed ? '#666' : '#1B5E20'} />
     </View>
     <View style={styles.missionInfo}>
        <Text style={[styles.missionTitle, completed && {color: '#999'}]}>{title}</Text>
        <Text style={styles.missionSub}>{sub}</Text>
        {isTimer && progress < 1 && (
            <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
            </View>
        )}
     </View>
     <View style={styles.missionRight}>
        <View style={styles.missionReward}>
           <Text style={styles.missionRewardText}>+{reward}</Text>
           <FontAwesome5 name="coins" size={10} color="#FFD700" />
        </View>
        <Ionicons name={completed ? "checkmark-circle" : "chevron-forward"} size={20} color={completed ? "#4CAF50" : "#ccc"} />
     </View>
  </TouchableOpacity>
);

const SocialItem = ({ platform, label, reward, icon, claimed, onPress }) => (
  <View style={[styles.socialRow, claimed && {opacity: 0.6}]}>
     <View style={[styles.socialIcon, { backgroundColor: getPlatformColor(platform) }]}>
        <FontAwesome5 name={icon} size={18} color="#fff" />
     </View>
     <Text style={styles.socialLabel}>{label}</Text>
     <TouchableOpacity 
        style={claimed ? styles.claimedBtn : styles.claimBtn} 
        onPress={onPress}
        disabled={claimed}
      >
        <Text style={[styles.claimBtnText, claimed && { color: '#000' }]}>{claimed ? "Claimed" : `+${reward}`}</Text>
     </TouchableOpacity>
  </View>
);

const getPlatformColor = (p) => {
  if (p === 'YouTube') return '#FF0000';
  if (p === 'Facebook') return '#1877F2';
  if (p === 'Instagram') return '#E1306C';
  if (p === 'X') return '#000000';
  if (p === 'WhatsApp') return '#25D366';
  if (p === 'Telegram') return '#0088cc';
  return '#1B5E20';
};
const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f6f8', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff', width: '100%', maxWidth: MAX_WIDTH },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1B5E20', flexShrink: 1, textAlign: 'center' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 5, borderWidth: 1, borderColor: '#C8E6C9' },
  coinText: { fontWeight: 'bold', color: '#1B5E20', fontSize: 15 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  streakCard: { backgroundColor: '#1B5E20', borderRadius: 25, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  streakCountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  streakCountText: { color: '#fff', fontWeight: 'bold' },
  streakDots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  streakDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  streakDotActive: { backgroundColor: '#4CAF50', shadowColor: '#4CAF50', shadowOpacity: 0.8, shadowRadius: 5, elevation: 5 },
  streakSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 15, fontStyle: 'italic' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1B5E20' },
  sectionBadge: { backgroundColor: '#FFF9C4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '900', color: '#F57F17', borderWidth: 1, borderColor: '#FBC02D', overflow: 'hidden' },
  
  wheelWrapper: { alignItems: 'center', justifyContent: 'center', height: 300, marginBottom: 30, position: 'relative' },
  wheel: { width: 260, height: 260, borderRadius: 130, borderWidth: 6, borderColor: '#FFD700', backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#FFD700', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  wheelInner: { width: 240, height: 240, borderRadius: 120, backgroundColor: '#fff', position: 'absolute', top: 4, left: 4, overflow: 'hidden' },
  wheelSegment: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', paddingTop: 10 },
  segmentLabel: { fontSize: 15, fontWeight: '900', color: '#1B5E20', textShadowColor: '#fff', textShadowRadius: 3 },
  wheelIndicator: { position: 'absolute', top: -5, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  spinCenter: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', elevation: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFD700', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  spinCenterInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  spinText: { fontWeight: '900', color: '#fff', fontSize: 15, letterSpacing: 1, textShadowColor: '#d84315', textShadowRadius: 2 },
  
  missionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  missionCardCompleted: { backgroundColor: '#f9f9f9', borderColor: '#eee', elevation: 0 },
  missionIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  missionSub: { fontSize: 11, color: '#757575', marginTop: 3 },
  missionRight: { alignItems: 'flex-end', gap: 6 },
  missionReward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missionRewardText: { fontSize: 15, fontWeight: '900', color: '#1B5E20' },
  barContainer: { height: 5, backgroundColor: '#e0e0e0', borderRadius: 2.5, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 2.5 },
  socialRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  socialIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  socialLabel: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  claimBtn: { backgroundColor: '#1B5E20', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, shadowColor: '#1B5E20', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  claimedBtn: { backgroundColor: '#e0e0e0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  claimBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
