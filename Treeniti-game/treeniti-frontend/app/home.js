import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import BASE_URL from '../config/api';
import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const gridData = [
  { id: 1, title: 'virtualTree', sub: 'virtualTreeSub', btn: 'plantNow', img: require('../assets/pic.png'), route: '/plant', color: '#2D8B2E', icon: '🌳' },
  { id: 2, title: 'dailyTasks', sub: 'dailyTasksSub', btn: 'checkIn', img: require('../assets/pic2.png'), route: '/missions', color: '#E67E22', icon: '📋' },
  { id: 3, title: 'weeklyLoot', sub: 'weeklyLootSub', btn: 'claimCoins', img: require('../assets/pic3.png'), route: '/weekly_loot', color: '#2D8B2E', icon: '🎁' },
  { id: 4, title: 'treeCert', sub: 'treeCertSub', btn: 'downloadNow', img: require('../assets/pic4.png'), route: '/certificate', color: '#2D8B2E', icon: '📜' },
  { id: 5, title: 'realPlant', sub: 'realPlantSub', btn: 'uploadProof', img: require('../assets/pic5.png'), route: '/upload_tree', color: '#E67E22', icon: '📸' },
  { id: 6, title: 'followUs', sub: 'followUsSub', btn: 'followNow', img: require('../assets/pic6.png'), route: '/follow', color: '#2D8B2E', icon: '👥' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [userData, setUserData] = useState({ name: "User", coins: 0, role: "User", avatar: null });
  const [showTutorial, setShowTutorial] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const sliderImages = [
    require('../assets/slider1.jpg'),
    require('../assets/slider2.jpg'),
    require('../assets/slider3.jpg'),
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev === sliderImages.length - 1 ? 0 : prev + 1));
    }, 3000);

    fetchUserDashboard();
    fetchActivities();
    // Refresh activity feed every 30 seconds for real-time feel
    const activityTimer = setInterval(fetchActivities, 30000);
    return () => { clearInterval(timer); clearInterval(activityTimer); };
  }, []);

  const fetchUserDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const [resAuth, hasSeenTutorial] = await Promise.all([
        fetch(`${BASE_URL}/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
        AsyncStorage.getItem('hasSeenTutorial')
      ]);

      const dataAuth = await resAuth.json();

      if (dataAuth.success) {
        setUserData({
          name: dataAuth.user.name,
          coins: dataAuth.user.walletCoins,
          role: dataAuth.user.role,
          avatar: dataAuth.user.avatar
        });
        if (dataAuth.user.language) {
          const langCode = dataAuth.user.language === 'Hindi' ? 'hi' : 'en';
          if (langCode !== language) changeLanguage(langCode);
        }

        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }
      }
    } catch (e) { }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${BASE_URL}/activities`);
      const data = await res.json();
      if (data.success) setActivities(data.activities);
    } catch (e) {
      // Silently fail, keep previous data
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleLangChange = async (lang) => {
    changeLanguage(lang);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* --- Sidebar Menu --- */}
        <Modal visible={isSidebarVisible} transparent animationType="fade">
          <Pressable style={styles.sidebarOverlay} onPress={() => setSidebarVisible(false)}>
            <View style={styles.sidebarContent}>
              <View style={styles.sideHeader}>
                <Text style={styles.sideBrand}>Treeniti</Text>
                <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                  <Ionicons name="close" size={28} color="#1B5E20" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <SideItem icon="person-circle-outline" label={t.profile || 'My Profile'} onPress={() => { setSidebarVisible(false); router.push('/profile'); }} />
                <SideItem icon="people-outline" label={t.team || 'My Team (Downline)'} onPress={() => { setSidebarVisible(false); router.push('/referral_team'); }} />
                <SideItem icon="newspaper-outline" label={t.notice || 'सूचना बोर्ड (Notice Board)'} onPress={() => { setSidebarVisible(false); router.push('/notice'); }} />
                <SideItem icon="wallet-outline" label={t.wallet || 'My Income (Wallet)'} onPress={() => { setSidebarVisible(false); router.push('/wallet'); }} />
                <SideItem icon="trophy-outline" label={t.leaderboard || 'Rank Board (Leaderboard)'} onPress={() => { setSidebarVisible(false); router.push('/leaderboard'); }} />
                <SideItem icon="flash-outline" label={t.missions || 'Daily Missions'} onPress={() => { setSidebarVisible(false); router.push('/missions'); }} />
                <SideItem icon="ribbon-outline" label={t.treeCert || 'Tree Certificate'} onPress={() => { setSidebarVisible(false); router.push('/certificate'); }} />
                <SideItem icon="camera-outline" label={t.realPlant || 'Real Plantation Upload'} onPress={() => { setSidebarVisible(false); router.push('/upload_tree'); }} />

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10, marginHorizontal: 15 }} />

                <SideItem icon="chatbubble-ellipses-outline" label={t.feedback || 'Feedback & Complaints'} onPress={() => { setSidebarVisible(false); router.push('/feedback'); }} />
                <SideItem icon="help-buoy-outline" label={t.help || 'Help Us'} onPress={() => { setSidebarVisible(false); router.push('/help'); }} />
                <SideItem icon="information-circle-outline" label={t.about || 'About Us'} onPress={() => { setSidebarVisible(false); router.push('/about_team'); }} />

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 5, marginHorizontal: 15 }} />

                <TouchableOpacity style={{ marginLeft: 20, marginTop: 12 }} onPress={() => { setSidebarVisible(false); router.push('/terms'); }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>{t.terms || 'Terms & Conditions'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginLeft: 20, marginTop: 10, marginBottom: 5 }} onPress={() => { setSidebarVisible(false); router.push('/privacy'); }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>{t.privacy || 'Privacy Policy'}</Text>
                </TouchableOpacity>

                {['Admin', 'SuperAdmin'].includes(userData.role) && (
                  <TouchableOpacity style={[styles.sideMenuItem, { paddingHorizontal: 20 }]} onPress={() => { setSidebarVisible(false); router.push('/admin'); }}>
                    <Ionicons name="shield-checkmark" size={22} color="#D32F2F" />
                    <Text style={[styles.sideMenuText, { color: '#D32F2F', fontWeight: 'bold' }]}>Admin Portal</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.langContainer}>
                  <Text style={styles.langLabel}>CHOOSE LANGUAGE (भाषा चुनें)</Text>
                  <View style={styles.langToggleRow}>
                    <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => handleLangChange('en')}>
                      <Text style={[styles.langBtnText, language === 'en' && { color: '#fff' }]}>English</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.langBtn, language === 'hi' && styles.langBtnActive]} onPress={() => handleLangChange('hi')}>
                      <Text style={[styles.langBtnText, language === 'hi' && { color: '#fff' }]}>हिंदी</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.sideLogout} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={22} color="#D32F2F" />
                  <Text style={styles.logoutText}>{t.logout || 'Logout'}</Text>
                </TouchableOpacity>
              </ScrollView>
              <View style={styles.sideFooter}>
                <Text style={styles.versionText}>VERSION 2.5.0</Text>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* --- Header --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu-outline" size={32} color="#1B5E20" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={styles.coinBadge}><Text style={styles.coinText}>{userData.coins}</Text></View>
            <TouchableOpacity style={styles.referBadge} onPress={() => router.push('/referral_team')}>
              <Ionicons name="git-network-outline" size={14} color="#1B5E20" />
              <Text style={styles.referText}>{t.refer}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Image
                source={userData.avatar ? { uri: userData.avatar } : require('../assets/user.png')}
                style={styles.profileImg}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
          {/* Hero Slider */}
          <View style={styles.heroCard}>
            <Image source={sliderImages[currentImgIndex]} key={currentImgIndex} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroOverlay}><Text style={styles.welcomeText}>Hi, {userData.name}</Text></View>
          </View>

          {/* Dashboard Grid */}
          <View style={styles.gridContainer}>
            {gridData.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.gridItem, styles.highlightCard, !item.img && { backgroundColor: item.color || '#1B5E20' }]}
                activeOpacity={0.8}
                onPress={() => router.push(item.route)}
              >
                {item.img ? (
                  <Image source={item.img} style={styles.fullCardImg} resizeMode="cover" />
                ) : (
                  <View style={styles.iconItemInner}>
                    <Text style={styles.iconItemEmoji}>{item.icon}</Text>
                    <Text style={styles.iconItemTitle}>{t[item.title] || item.title}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 🔴 LIVE Community Notice Board */}
          <View style={styles.noticeBoardCard}>
            {/* Header */}
            <View style={styles.noticeBoardHeader}>
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.noticeBoardTitle}>🌍 Community Activity</Text>
              <Text style={styles.noticeCount}>{activities.length} events</Text>
            </View>

            {/* Activity Feed */}
            {activitiesLoading ? (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>⏳ Loading live feed...</Text>
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>🌱 No activity yet. Be the first!</Text>
              </View>
            ) : (
              activities.slice(0, 6).map((item, index) => (
                <NoticeItem key={item._id ? `${item._id}-${index}` : `notice-${index}`} item={item} />
              ))
            )}
          </View>

          {/* Founder Section */}
          <View style={styles.founderCard}>
            <Image source={require('../assets/user.png')} style={styles.founderImg} />
            <View style={styles.founderBadge}><Text style={styles.badgeText}>FOUNDER</Text></View>
            <Text style={styles.founderName}>Alok Chaudhary</Text>
            <Text style={styles.founderTitle}>Treeniti  Founder</Text>
          </View>
        </ScrollView>

        {/* --- 🟢 Optimized Docked Navbar --- */}
        <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
          <TabItem icon="home" label="Home" active={pathname === '/home'} onPress={() => router.push('/home')} />
          <TabItem icon="water-outline" label="Add Water" onPress={() => router.push('/plant')} />

          <TouchableOpacity style={styles.centerBtn} activeOpacity={0.85} onPress={() => router.push('/upload_tree')}>
            <View style={styles.centerBtnInner}>
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.centerText}>PHOTO{"\n"}UPLOAD</Text>
            </View>
          </TouchableOpacity>

          <TabItem icon="leaf-outline" label="Add Fertilizer" onPress={() => router.push('/plant')} />
          <TabItem icon="cash-outline" label="Earn Money" onPress={() => router.push('/earn')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const SideItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.sideMenuItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#444" />
    <Text style={styles.sideMenuText}>{label}</Text>
  </TouchableOpacity>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity 
    style={styles.tabBtn} 
    onPress={onPress} 
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={[styles.tabIconCircle, active && styles.activeTabIcon]}>
      <Ionicons name={icon} size={20} color={active ? "#1B5E20" : "#fff"} />
    </View>
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const TYPE_CONFIG = {
  TREE_PLANTED: { bg: '#E8F5E9', dot: '#4CAF50', emoji: '🌳' },
  WITHDRAWAL: { bg: '#FFF8E1', dot: '#FFC107', emoji: '💰' },
  ANNOUNCEMENT: { bg: '#E3F2FD', dot: '#2196F3', emoji: '📢' },
  WATERED: { bg: '#E0F7FA', dot: '#00BCD4', emoji: '💧' },
  COIN_EARNED: { bg: '#F3E5F5', dot: '#9C27B0', emoji: '⭐' },
  DEFAULT: { bg: '#F1F8F1', dot: '#1B5E20', emoji: '✅' },
};

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NoticeItem = ({ item }) => {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.DEFAULT;
  const initials = item.userName ? item.userName.substring(0, 2).toUpperCase() : '?';
  return (
    <View style={[styles.noticeItem, { backgroundColor: cfg.bg }]}>
      <View style={[styles.noticeDot, { backgroundColor: cfg.dot }]} />
      <View style={[styles.avatarMini, { backgroundColor: cfg.dot }]}>
        <Text style={styles.avatarText}>{item.icon || cfg.emoji}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.noticeText}>
          <Text style={styles.noticeName}>{item.userName}</Text>
          {'  '}{item.text}
        </Text>
        <Text style={styles.timeText}>🕒 {timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F4' },
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F4F8F4' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  coinBadge: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, marginRight: 8, elevation: 2 },
  coinText: { fontWeight: 'bold', color: '#333' },
  referBadge: { flexDirection: 'row', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  referText: { fontSize: 12, fontWeight: 'bold', color: '#1B5E20', marginLeft: 4 },
  profileImg: { width: 35, height: 35, borderRadius: 17.5 },
  heroCard: { width: width - 30, height: 155, alignSelf: 'center', borderRadius: 25, overflow: 'hidden', marginTop: 10 },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(27, 94, 32, 0.6)', padding: 10, borderRadius: 15 },
  welcomeText: { color: '#fff', fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 15 },
  gridItem: {
    width: (width - 45) / 2,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 0, // 0 for full image cards
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    overflow: 'hidden'
  },
  highlightCard: { borderWidth: 0 },
  fullCardImg: { width: '100%', height: '100%' },
  iconItemInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  iconItemEmoji: { fontSize: 40, marginBottom: 10 },
  iconItemTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },

  sectionCard: { marginHorizontal: 15, backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1B5E20', marginBottom: 10 },
  founderCard: { alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 15, padding: 20, borderRadius: 25, elevation: 2, marginBottom: 30 },
  founderImg: { width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, borderColor: '#1B5E20' },
  founderBadge: { backgroundColor: '#1B5E20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: -10 },
  badgeText: { color: '#fff', fontSize: 10 },
  founderName: { fontSize: 15, fontWeight: 'bold', marginTop: 10 },
  founderTitle: { fontSize: 11, color: '#666' },

  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebarContent: { width: '85%', height: '100%', backgroundColor: '#F9FDF9', padding: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  sideBrand: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20' },
  sideMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  sideMenuText: { marginLeft: 15, fontSize: 15, color: '#333', fontWeight: '500' },
  langContainer: { backgroundColor: '#F0F2F0', borderRadius: 15, padding: 10, marginVertical: 20 },
  langLabel: { fontSize: 10, color: '#666', fontWeight: 'bold', marginBottom: 8 },
  langToggleRow: { flexDirection: 'row', backgroundColor: '#DDE2DD', borderRadius: 25, padding: 4 },
  langBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  langBtnActive: { backgroundColor: '#1B5E20' },
  langBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  sideLogout: { flexDirection: 'row', alignItems: 'center', marginTop: 30, paddingVertical: 10, paddingHorizontal: 5 },
  logoutText: { marginLeft: 15, fontSize: 16, color: '#D32F2F', fontWeight: 'bold' },
  sideFooter: { alignItems: 'center', paddingBottom: 15, paddingTop: 10 },
  versionText: { fontSize: 10, color: '#AAA', letterSpacing: 1 },

  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#6DBE71',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  activeTabIcon: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 1, fontWeight: '700', textAlign: 'center' },
  centerBtn: { marginTop: -20, alignItems: 'center' },
  centerBtnInner: { width: 54, height: 54, backgroundColor: '#1B3C1B', borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#F4F8F4' },
  centerText: { fontSize: 6.5, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -1 },
  // 🔴 LIVE Notice Board Styles
  noticeBoardCard: { marginHorizontal: 15, backgroundColor: '#fff', borderRadius: 25, padding: 18, marginBottom: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#E8F5E9' },
  noticeBoardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  liveRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF1744', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  noticeBoardTitle: { fontSize: 14, fontWeight: '800', color: '#1B5E20' },
  noticeCount: { fontSize: 10, color: '#999', fontWeight: '600' },
  loadingRow: { paddingVertical: 20, alignItems: 'center' },
  loadingText: { color: '#999', fontSize: 13 },
  noticeItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15, marginBottom: 8, position: 'relative' },
  noticeDot: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 2 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16 },
  noticeName: { fontWeight: '800', color: '#1B3C1B', fontSize: 12 },
  noticeText: { fontSize: 12, color: '#333', lineHeight: 18 },
  timeText: { fontSize: 10, color: '#999', marginTop: 2 },
});
