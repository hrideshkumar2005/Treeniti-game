import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { BannerAd, BannerAdSize, AD_UNITS } from '../config/ads';
import BASE_URL from '../config/api';
import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

const gridData = [
  { id: 1, title: 'virtualTree', sub: 'virtualTreeSub', btn: 'plantNow', img: require('../assets/pic.png'), route: '/plant', color: '#2D8B2E', btnColors: ['#4CAF50', '#2E7D32'], imageScale: 1.4 },
  { id: 2, title: 'dailyTasks', sub: 'dailyTasksSub', btn: 'checkIn', img: require('../assets/pic2.png'), route: '/missions', color: '#E67E22', btnColors: ['#E67E22', '#D35400'], imageScale: 1.5 },
  { id: 3, title: 'weeklyLoot', sub: 'weeklyLootSub', btn: 'claimCoins', img: require('../assets/pic3.png'), route: '/weekly_loot', color: '#2D8B2E', btnColors: ['#4CAF50', '#2E7D32'], imageScale: 1.5 },
  { id: 4, title: 'treeCert', sub: 'treeCertSub', btn: 'downloadNow', img: require('../assets/pic4.png'), route: '/certificate', color: '#2D8B2E', btnColors: ['#4CAF50', '#2E7D32'], imageScale: 1.6 },
  { id: 5, title: 'realPlant', sub: 'viewRealPlant', btn: 'viewTree', img: require('../assets/pic5.png'), route: '/upload_tree', color: '#E67E22', btnColors: ['#E67E22', '#D35400'], imageScale: 1.6 },
  { id: 6, title: 'followUs', sub: 'followUsSub', btn: 'followNow', img: require('../assets/pic6.png'), route: '/follow', color: '#2D8B2E', btnColors: ['#4CAF50', '#2E7D32'], imageScale: 1.4 },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [userData, setUserData] = useState({ name: "User", coins: 0, role: "User", avatar: null });
  const [ambientBg, setAmbientBg] = useState('#F4F8F4');

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      let color = '#F4F8F4';
      if (hour >= 6 && hour < 12) color = '#FAF6EB'; // Morning: soft golden light
      else if (hour >= 12 && hour < 17) color = '#F0F8FD'; // Afternoon: clear sky tint
      else if (hour >= 17 && hour < 20) color = '#FAF2FC'; // Evening: sunset lilac tint
      else color = '#ECEFF4'; // Night: moonlit grey-blue
      setAmbientBg(color);
    };

    updateTheme();
    const themeTimer = setInterval(updateTheme, 5 * 60 * 1000);
    return () => clearInterval(themeTimer);
  }, []);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('coins');
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const sliderRef = useRef(null);
  const activityScrollRef = useRef(null);
  const activityIndexRef = useRef(0);

  const sliderImages = [
    require('../assets/slider1.jpg'),
    require('../assets/slider2.jpg'),
    require('../assets/slider3.jpg'),
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => {
        const nextIndex = prev === sliderImages.length - 1 ? 0 : prev + 1;
        sliderRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 4000);

    fetchUserDashboard();
    fetchActivities();
    fetchLeaderboardPreview();
    // Refresh activity feed every 30 seconds for real-time feel
    const activityTimer = setInterval(fetchActivities, 30000);
    return () => { clearInterval(timer); clearInterval(activityTimer); };
  }, []);

  useEffect(() => {
    if (activities.length === 0) return;

    activityIndexRef.current = 0;
    const timer = setInterval(() => {
      activityIndexRef.current = (activityIndexRef.current + 1) % activities.length;
      activityScrollRef.current?.scrollToIndex({
        index: activityIndexRef.current,
        animated: true,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activities]);

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

  const fetchLeaderboardPreview = async (metric = 'coins') => {
    setLeaderboardLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/leaderboard?metric=${metric}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLeaderboardData(data.leaders || []);
        setCurrentUserRank({ rank: data.myRank, score: data.myScore });
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleMetricChange = (metric) => {
    setActiveMetric(metric);
    fetchLeaderboardPreview(metric);
  };

  const getMetricLabel = () => {
    if (activeMetric === 'trees') return 'Trees';
    if (activeMetric === 'proofs') return 'Verified Proofs';
    return 'Coins';
  };

  const handleLangChange = async (lang) => {
    changeLanguage(lang);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: ambientBg }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: ambientBg }]}>
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

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10, marginHorizontal: 15 }} />

                <SideItem icon="chatbubble-ellipses-outline" label={t.feedback || 'Feedback & Complaints'} onPress={() => { setSidebarVisible(false); router.push('/feedback'); }} />
                <SideItem icon="mail-outline" label={t.help || 'Help Us'} onPress={() => { setSidebarVisible(false); router.push('/help'); }} />
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
                <Text style={styles.versionText}>VERSION 1.0.0</Text>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* --- Header --- */}
        <View style={[styles.header, { backgroundColor: ambientBg }]}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu-outline" size={32} color="#1B5E20" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={styles.coinBadge}>
              <FontAwesome5 name="coins" size={14} color="#1B5E20" style={{ marginRight: 6 }} />
              <Text style={styles.coinText}>{userData.coins}</Text>
            </View>
            <TouchableOpacity style={styles.referBadge} onPress={() => router.push('/referral_team')}>
              <Ionicons name="share-social-outline" size={16} color="#1B5E20" />
              <Text style={styles.referText}>Refer</Text>
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
          <View style={{ paddingHorizontal: 20, paddingTop: 5, paddingBottom: 5 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1B5E20' }}>Welcome, {userData.name} 👋</Text>
          </View>
          {/* Swipeable Hero Slider with Dots */}
          <View style={{ height: 180, marginTop: 10 }}>
            <FlatList
              ref={sliderRef}
              data={sliderImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImgIndex(index);
              }}
              keyExtractor={(_, i) => i.toString()}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={2}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => (
                <View style={{ width: width, alignItems: 'center' }}>
                  <View style={[styles.heroCard, { marginTop: 0 }]}>
                    <Image source={item} style={styles.heroImg} resizeMode="cover" />
                  </View>
                </View>
              )}
            />
            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {sliderImages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, currentImgIndex === i ? styles.activeDot : styles.inactiveDot]}
                />
              ))}
            </View>
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
                  <View style={styles.cardInner}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: item.color || '#1B5E20' }]} numberOfLines={2}>{t[item.title] || item.title}</Text>
                      {item.sub ? (
                        <Text style={styles.cardSubTitle} numberOfLines={2}>{t[item.sub] || item.sub}</Text>
                      ) : null}
                    </View>

                    <Image
                      source={item.img}
                      style={[styles.cardImage, item.imageScale ? { transform: [{ scale: item.imageScale }] } : null]}
                      resizeMode="contain"
                    />

                    <View style={styles.cardBottom}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.cardBtn3D}
                        onPress={() => router.push(item.route)}
                      >
                        <LinearGradient colors={item.btnColors || ['#4CAF50', '#2E7D32']} style={styles.cardBtn3DInner}>
                          <Text style={styles.cardBtnText3D}>{t[item.btn] || item.btn}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.iconItemInner}>
                    <Text style={styles.iconItemEmoji}>{item.icon}</Text>
                    <Text style={styles.iconItemTitle}>{t[item.title] || item.title}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 📢 Ads Section Placeholder */}
          <View style={styles.adSectionContainer}>
            <View style={styles.adHeader}>
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>SPONSORED</Text>
              </View>
              <Ionicons name="information-circle-outline" size={14} color="#999" />
            </View>
            <TouchableOpacity activeOpacity={0.9} style={styles.adCard}>
              <LinearGradient
                colors={['#E8F5E9', '#F1F8E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adGradient}
              >
                <View style={styles.adContent}>
                  <View style={styles.adIconBox}>
                    <Ionicons name="megaphone-outline" size={24} color="#1B5E20" />
                  </View>
                  <View style={styles.adTextBox}>
                    <Text style={styles.adTitle}>Promote Your Mission!</Text>
                    <Text style={styles.adSubTitle}>Feature your brand here to reach our green community.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#1B5E20" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
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
              <FlatList
                ref={activityScrollRef}
                data={activities}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : `notice-${index}`}
                getItemLayout={(_, index) => ({
                  length: width - 66,
                  offset: (width - 66) * index,
                  index,
                })}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item }) => (
                  <NoticeItem item={item} isHorizontal />
                )}
              />
            )}
          </View>

          {/* 🏆 Full Rank Board */}
          <View style={styles.noticeBoardCard}>
            {/* Header + Metric Tabs */}
            <View style={styles.noticeBoardHeader}>
              <Text style={styles.noticeBoardTitle}>🏆 Rank Board</Text>
            </View>

            {/* Metric Tabs */}
            <View style={styles.lbTabRow}>
              {[{ id: 'coins', icon: 'coins', label: 'Coins' }, { id: 'trees', icon: 'tree', label: 'Trees' }, { id: 'proofs', icon: 'camera', label: 'Proofs' }].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.lbTab, activeMetric === tab.id && styles.lbTabActive]}
                  onPress={() => handleMetricChange(tab.id)}
                >
                  <FontAwesome5 name={tab.icon} size={12} color={activeMetric === tab.id ? '#fff' : '#1B5E20'} />
                  <Text style={[styles.lbTabText, activeMetric === tab.id && styles.lbTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {leaderboardLoading ? (
              <ActivityIndicator size="large" color="#1B5E20" style={{ marginVertical: 20 }} />
            ) : leaderboardData.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>🌱 No data yet. Play to claim top rank!</Text>
            ) : (
              <>
                {/* Podium Top 3 */}
                {(() => {
                  const top3 = leaderboardData.slice(0, 3);
                  return (
                    <View style={styles.lbPodium}>
                      {/* 2nd */}
                      {top3[1] && (
                        <View style={styles.lbPodiumPos}>
                          <Image source={require('../assets/user.png')} style={[styles.lbPodiumImg, { borderColor: '#C0C0C0' }]} />
                          <View style={[styles.lbRankBadge, { backgroundColor: '#C0C0C0' }]}><Text style={styles.lbRankText}>2</Text></View>
                          <Text style={styles.lbPodiumName} numberOfLines={1}>{top3[1].name}</Text>
                          <Text style={styles.lbPodiumScore}>{top3[1].score}</Text>
                        </View>
                      )}
                      {/* 1st */}
                      {top3[0] && (
                        <View style={[styles.lbPodiumPos, { marginTop: -30 }]}>
                          <FontAwesome5 name="crown" size={22} color="#FFD700" style={{ marginBottom: 4 }} />
                          <Image source={require('../assets/user.png')} style={[styles.lbPodiumImg, { width: 80, height: 80, borderRadius: 40, borderColor: '#FFD700', borderWidth: 4 }]} />
                          <View style={[styles.lbRankBadge, { backgroundColor: '#FFD700', width: 28, height: 28, borderRadius: 14, marginTop: -14 }]}><Text style={[styles.lbRankText, { fontSize: 13 }]}>1</Text></View>
                          <Text style={[styles.lbPodiumName, { fontSize: 15, fontWeight: '900' }]} numberOfLines={1}>{top3[0].name}</Text>
                          <Text style={[styles.lbPodiumScore, { color: '#FFD700', fontSize: 15 }]}>{top3[0].score}</Text>
                        </View>
                      )}
                      {/* 3rd */}
                      {top3[2] && (
                        <View style={styles.lbPodiumPos}>
                          <Image source={require('../assets/user.png')} style={[styles.lbPodiumImg, { borderColor: '#CD7F32' }]} />
                          <View style={[styles.lbRankBadge, { backgroundColor: '#CD7F32' }]}><Text style={styles.lbRankText}>3</Text></View>
                          <Text style={styles.lbPodiumName} numberOfLines={1}>{top3[2].name}</Text>
                          <Text style={styles.lbPodiumScore}>{top3[2].score}</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Rest of list */}
                {leaderboardData.slice(3, 8).map((user, index) => (
                  <View key={user._id || index} style={styles.lbListItem}>
                    <Text style={styles.lbListRank}>{index + 4}</Text>
                    <Image source={require('../assets/user.png')} style={styles.lbListImg} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lbListName}>{user.name}</Text>
                      <Text style={styles.lbListSub}>Total {getMetricLabel()}</Text>
                    </View>
                    <View style={styles.lbScoreBox}>
                      <Text style={styles.lbScoreText}>{user.score}</Text>
                    </View>
                  </View>
                ))}

                {/* My Rank */}
                <View style={styles.lbMyRankBar}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.lbMyRankCircle}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>#{currentUserRank?.rank || '?'}</Text>
                    </View>
                    <Text style={styles.lbMyRankText}>Your Rank</Text>
                  </View>
                  <Text style={styles.lbMyCoinsText}>{currentUserRank?.score || 0} {getMetricLabel()}</Text>
                </View>
              </>
            )}
          </View>


        </ScrollView>

        {/* --- Google Banner Ad --- */}
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={AD_UNITS.BANNER}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>

        {/* --- 🟢 Optimized Docked Navbar --- */}
        <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
          <TabItem icon="home" label="Home" active={true} onPress={() => router.push('/home')} />
          <TabItem icon="water-outline" label="Add Water" onPress={() => router.push('/plant')} />

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

          <TabItem icon="leaf-outline" label="Add Fertilizer" onPress={() => router.push('/plant')} />
          <TabItem icon="gift-outline" label="Earn More" onPress={() => router.push('/earn')} />
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
      <Ionicons name={icon} size={24} color={active ? "#124916ff" : "#fff"} />
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

const NoticeItem = React.memo(({ item, isHorizontal }) => {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.DEFAULT;
  const initials = item.userName ? item.userName.substring(0, 2).toUpperCase() : '?';
  return (
    <View style={[styles.noticeItem, { backgroundColor: cfg.bg }, isHorizontal && styles.noticeItemHorizontal]}>
      <View style={[styles.noticeDot, { backgroundColor: cfg.dot }]} />
      <View style={[styles.avatarMini, { backgroundColor: cfg.dot }]}>
        <Text style={styles.avatarText}>{item.icon || cfg.emoji}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.noticeText} numberOfLines={2}>
          <Text style={styles.noticeName}>{item.userName}</Text>
          {'  '}{item.text}
        </Text>
        <Text style={styles.timeText}>🕒 {timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
});
NoticeItem.displayName = 'NoticeItem';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F4' },
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F4F8F4' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  coinBadge: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, marginRight: 8, elevation: 2, alignItems: 'center' },
  coinText: { fontWeight: 'bold', color: '#1B5E20' },
  referBadge: { flexDirection: 'column', backgroundColor: '#E8F5E9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  referText: { fontSize: 9.5, fontWeight: 'bold', color: '#1B5E20', marginTop: 1 },
  profileImg: { width: 35, height: 35, borderRadius: 17.5 },
  heroCard: { width: width - 30, height: 155, alignSelf: 'center', borderRadius: 25, overflow: 'hidden', marginTop: 10 },
  heroImg: { width: '100%', height: '100%' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 12, marginTop: 15, gap: 8 },
  gridItem: {
    width: (width - 48) / 3,
    height: 175,
    backgroundColor: '#FCFAF6',
    borderRadius: 22,
    padding: 0,
    alignItems: 'center',
    marginBottom: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden'
  },
  highlightCard: { borderNone: true },
  cardInner: { width: '100%', height: '100%', paddingTop: 10, paddingBottom: 10, justifyContent: 'space-between', alignItems: 'center' },
  cardImage: { flex: 1, width: '100%', marginVertical: 2 },
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
    backgroundColor: '#1B5E20',
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
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -5 },
  tabIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  activeTabIcon: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 9.5, color: '#fff', marginTop: 2, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -22, alignItems: 'center' },
  centerBtnInner: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  centerText: { fontSize: 8, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 1, letterSpacing: 0.5 },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  noticeItemHorizontal: {
    width: width - 66,
    marginBottom: 0,
  },
  noticeDot: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 2 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16 },
  noticeName: { fontWeight: '800', color: '#1B3C1B', fontSize: 12 },
  noticeText: { fontSize: 12, color: '#333', lineHeight: 18 },
  timeText: { fontSize: 10, color: '#999', marginTop: 2 },

  // Card Overlay Styles
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTop: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0,
    lineHeight: 14,
  },
  cardSubTitle: {
    color: '#444',
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 11,
  },
  cardBottom: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 6,
  },
  cardBtn3D: {
    width: '85%',
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 0,
    shadowOpacity: 0,
  },
  cardBtn3DInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBtnText3D: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  // Pagination Dots
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1B5E20',
    width: 16,
  },
  inactiveDot: {
    backgroundColor: '#CCC',
  },
  // 📢 Ads Section Styles
  adSectionContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
    marginTop: 5,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  sponsoredBadge: {
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(27, 94, 32, 0.2)',
  },
  sponsoredText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 1,
  },
  adCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  adGradient: {
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  adIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  adTextBox: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 2,
  },
  adSubTitle: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  viewAllBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  rankBoardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  rankBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankBoardImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  rankBoardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  rankScoreBox: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankScoreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1B5E20',
  },

  // 🏆 Full Embedded Leaderboard Styles
  lbTabRow: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 15, padding: 4, marginBottom: 15, gap: 4 },
  lbTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, gap: 6 },
  lbTabActive: { backgroundColor: '#1B5E20' },
  lbTabText: { fontSize: 11, fontWeight: 'bold', color: '#1B5E20' },
  lbTabTextActive: { color: '#fff' },

  lbPodium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingVertical: 15, gap: 5 },
  lbPodiumPos: { alignItems: 'center', width: '30%' },
  lbPodiumImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, backgroundColor: '#f0f0f0' },
  lbRankBadge: { width: 20, height: 20, borderRadius: 10, marginTop: -10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  lbRankText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  lbPodiumName: { color: '#333', marginTop: 8, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  lbPodiumScore: { color: '#1B5E20', fontSize: 12, fontWeight: 'bold', marginTop: 2 },

  lbListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  lbListRank: { width: 30, fontSize: 14, fontWeight: 'bold', color: '#999' },
  lbListImg: { width: 38, height: 38, borderRadius: 19, marginRight: 12, backgroundColor: '#eee' },
  lbListName: { fontSize: 14, fontWeight: '700', color: '#333' },
  lbListSub: { fontSize: 10, color: '#999', marginTop: 1 },
  lbScoreBox: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  lbScoreText: { fontSize: 12, fontWeight: 'bold', color: '#1B5E20' },

  lbMyRankBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1B3C1B', borderRadius: 18, padding: 15, marginTop: 18 },
  lbMyRankCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lbMyRankText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  lbMyCoinsText: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
});
