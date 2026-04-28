import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function Leaderboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUsers, setTopUsers] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [activeMetric, setActiveMetric] = useState('coins'); // 'coins', 'trees', 'proofs'

  useEffect(() => {
    fetchLeaderboard();
  }, [activeMetric]);

  const fetchLeaderboard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/leaderboard?metric=${activeMetric}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTopUsers(data.leaders || []);
        setCurrentUserRank({ rank: data.myRank, score: data.myScore });
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getMetricLabel = () => {
    if (activeMetric === 'trees') return 'Trees';
    if (activeMetric === 'proofs') return 'Verified Proofs';
    return 'Coins';
  };

  const top3 = topUsers.slice(0, 3);
  const rest = topUsers.slice(3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rank Board 🏆</Text>
        <View style={{width: 40}} />
      </View>

      {/* Metric Tabs */}
      <View style={styles.tabContainer}>
        <MetricTab id="coins" icon="coins" label="Earnings" active={activeMetric} onPress={setActiveMetric} />
        <MetricTab id="trees" icon="tree" label="Trees" active={activeMetric} onPress={setActiveMetric} />
        <MetricTab id="proofs" icon="camera" label="Proofs" active={activeMetric} onPress={setActiveMetric} />
      </View>

      <ScrollView 
        contentContainerStyle={{paddingBottom: 100}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {loading ? (
           <ActivityIndicator size="large" color="#fff" style={{marginTop: 50}} />
        ) : (
          <>
            <View style={styles.podiumContainer}>
              <View style={styles.podium}>
                {/* 2nd Place */}
                {top3[1] && (
                  <View style={styles.podiumPos}>
                    <Image source={require('../assets/user.png')} style={[styles.podiumImg, { borderColor: '#C0C0C0' }]} />
                    <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0' }]}><Text style={styles.rankText}>2</Text></View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                    <Text style={styles.podiumCoins}>{top3[1].score}</Text>
                  </View>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <View style={[styles.podiumPos, { marginTop: -40 }]}>
                    <FontAwesome5 name="crown" size={24} color="#FFD700" style={{marginBottom: 5}} />
                    <Image source={require('../assets/user.png')} style={[styles.podiumImg, { width: 90, height: 90, borderRadius: 45, borderColor: '#FFD700', borderWidth: 4 }]} />
                    <View style={[styles.rankBadge, { backgroundColor: '#FFD700', width: 30, height: 30, borderRadius: 15, marginTop: -15 }]}><Text style={[styles.rankText, {fontSize: 14}]}>1</Text></View>
                    <Text style={[styles.podiumName, { fontSize: 16 }]} numberOfLines={1}>{top3[0].name}</Text>
                    <Text style={[styles.podiumCoins, { color: '#FFD700', fontSize: 16 }]}>{top3[0].score}</Text>
                  </View>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <View style={styles.podiumPos}>
                    <Image source={require('../assets/user.png')} style={[styles.podiumImg, { borderColor: '#CD7F32' }]} />
                    <View style={[styles.rankBadge, { backgroundColor: '#CD7F32' }]}><Text style={styles.rankText}>3</Text></View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                    <Text style={styles.podiumCoins}>{top3[2].score}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.listContainer}>
              {rest.map((user, index) => (
                <View key={user._id} style={styles.listItem}>
                  <Text style={styles.listRank}>{index + 4}</Text>
                  <Image source={require('../assets/user.png')} style={styles.listImg} />
                  <View style={{flex: 1}}>
                    <Text style={styles.listName}>{user.name}</Text>
                    <Text style={styles.listSubText}>Total {getMetricLabel()}</Text>
                  </View>
                  <View style={styles.listScoreBox}>
                    <Text style={styles.listScoreText}>{user.score}</Text>
                  </View>
                </View>
              ))}
              {topUsers.length === 0 && <Text style={styles.emptyText}>No data for this rank yet.</Text>}
            </View>
          </>
        )}
      </ScrollView>

      {/* My Rank Footer */}
      {!loading && (
          <View style={styles.myRankBar}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={styles.myRankCircle}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>#{currentUserRank?.rank || '?'}</Text>
                </View>
                <Text style={styles.myRankText}>Your Status</Text>
             </View>
             <Text style={styles.myCoinsText}>{currentUserRank?.score || 0} {getMetricLabel()}</Text>
          </View>
      )}
    </SafeAreaView>
  );
}

const MetricTab = ({ id, icon, label, active, onPress }) => (
  <TouchableOpacity 
    style={[styles.tabBtn, active === id && styles.tabBtnActive]} 
    onPress={() => onPress(id)}
  >
    <FontAwesome5 name={icon} size={14} color={active === id ? '#1B5E20' : 'rgba(255,255,255,0.6)'} />
    <Text style={[styles.tabLabel, active === id && styles.tabLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B5E20' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 20, borderRadius: 15, padding: 5, marginBottom: 20 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 8 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' },
  tabLabelActive: { color: '#1B5E20' },

  podiumContainer: { paddingBottom: 50, paddingTop: 20 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 10 },
  podiumPos: { alignItems: 'center', width: '30%' },
  podiumImg: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, backgroundColor: '#fff' },
  rankBadge: { width: 22, height: 22, borderRadius: 11, marginTop: -11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1B5E20' },
  rankText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  podiumName: { color: '#fff', marginTop: 10, fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  podiumCoins: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  listContainer: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, minHeight: 400 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listRank: { width: 35, fontSize: 15, fontWeight: 'bold', color: '#999' },
  listImg: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15, backgroundColor: '#eee' },
  listName: { fontSize: 15, fontWeight: '700', color: '#333' },
  listSubText: { fontSize: 10, color: '#999', marginTop: 2 },
  listScoreBox: { backgroundColor: '#E8F5E9', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10 },
  listScoreText: { fontSize: 14, fontWeight: 'bold', color: '#1B5E20' },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

  myRankBar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#1B3C1B', borderRadius: 25, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  myRankCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  myRankText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  myCoinsText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 }
});
