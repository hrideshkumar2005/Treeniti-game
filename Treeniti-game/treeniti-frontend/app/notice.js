import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function NoticeBoard() {
  const router = useRouter();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/activities`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.activities || []);
      }
    } catch (e) {
      console.log('Error fetching notices:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const getTimeLabel = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const getTypeStyle = (type) => {
    switch(type) {
      case 'TREE_PLANTED': return { bg: '#E8F5E9', icon: '🌳' };
      case 'WITHDRAWAL': return { bg: '#FFF3E0', icon: '💰' };
      case 'LEVEL_UP': return { bg: '#F3E5F5', icon: '✨' };
      case 'ANNOUNCEMENT': return { bg: '#E1F5FE', icon: '📢' };
      default: return { bg: '#F5F5F5', icon: '🔔' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>सूचना बोर्ड (Notice Board)</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color="#1B5E20" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} />}
      >
        <View style={styles.introCard}>
           <Text style={styles.introTitle}>Global Live Feed 🌍</Text>
           <Text style={styles.introSub}>See what the Treeniti community is doing right now!</Text>
        </View>

        {loading ? (
            <ActivityIndicator size="large" color="#1B5E20" style={{marginTop: 40}} />
        ) : (
            <View style={styles.announcementCard}>
                {notices.map((item) => {
                    const style = getTypeStyle(item.type);
                    return (
                        <View key={item._id} style={[styles.item, { backgroundColor: style.bg }]}>
                            <View style={styles.iconBox}><Text style={{fontSize: 22}}>{item.icon || style.icon}</Text></View>
                            <View style={styles.content}>
                                <Text style={styles.userText}>{item.userName || 'Someone'}</Text>
                                <Text style={styles.actionText}>{item.text}</Text>
                                <Text style={styles.timeText}>{getTimeLabel(item.createdAt)}</Text>
                            </View>
                            <View style={styles.statusDot} />
                        </View>
                    );
                })}
                {notices.length === 0 && <Text style={styles.emptyText}>No recent updates.</Text>}
            </View>
        )}

        <View style={styles.tipsCard}>
            <View style={styles.tipsIcon}>
                <Ionicons name="bulb" size={24} color="#FFD700" />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.tipsTitle}>Quick Tip</Text>
                <Text style={styles.tipsDesc}>
                    Users with 7+ days of activity appear faster on the global leaderboard!
                </Text>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1B5E20' },
  scrollContent: { padding: 18 },
  
  introCard: { marginBottom: 20 },
  introTitle: { fontSize: 22, fontWeight: '900', color: '#1B5E20' },
  introSub: { fontSize: 13, color: '#666', marginTop: 4 },

  announcementCard: { gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  content: { flex: 1 },
  userText: { fontSize: 13, fontWeight: '700', color: '#1B5E20', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionText: { fontSize: 15, color: '#333', marginTop: 1, fontWeight: '500' },
  timeText: { fontSize: 10, color: '#888', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginLeft: 10 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 15 },
  
  tipsCard: {
    marginTop: 30,
    backgroundColor: '#1B5E20',
    borderRadius: 25,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  tipsIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  tipsTitle: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },
  tipsDesc: { color: '#fff', fontSize: 12, lineHeight: 18, marginTop: 2, opacity: 0.9 }
});
