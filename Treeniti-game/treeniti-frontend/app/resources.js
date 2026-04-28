import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import BASE_URL from '../config/api';

const SOUNDS = {
    water: 'https://www.soundjay.com/misc/sounds/water-pour-1.mp3',   
    success: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3', 
};

const { width, height } = Dimensions.get('window');

export default function ResourcesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { type } = useLocalSearchParams(); 
    
    const [activeTab, setActiveTab] = useState(type === 'fertilize' ? 'Fertilizer' : 'Water');
    const [trees, setTrees] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const floatAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    
    // Water Animation States
    const dropAnim = useRef(new Animated.Value(0)).current;
    const dropOpacity = useRef(new Animated.Value(0)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;
    
    // Fertilizer Animation States
    const fertRotate = useRef(new Animated.Value(0)).current;
    const fertScale = useRef(new Animated.Value(1)).current;

    // Button State
    const btnScale = useRef(new Animated.Value(1)).current;
    const waterPlayer = useAudioPlayer(SOUNDS.water, { downloadFirst: true });
    const successPlayer = useAudioPlayer(SOUNDS.success, { downloadFirst: true });

    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            interruptionModeIOS: 1,
            interruptionModeAndroid: 1,
            shouldRouteThroughEarpieceAndroid: false,
        }).catch(e => console.log("Audio mode error:", e));
    }, []);

    useEffect(() => {
        // Continuous animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -15, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.timing(fertRotate, { toValue: 1, duration: 15000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true })
        ]).start();

        return () => {};
    }, []);

    const playSound = async (type) => {
        try {
            if (type === 'water') {
                waterPlayer.seekTo(0);
                waterPlayer.play();
            } else if (type === 'success') {
                successPlayer.seekTo(0);
                successPlayer.play();
            }
        } catch (e) { console.log("Sound error:", e); }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTrees();
        }, [])
    );

    const fetchTrees = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/tree`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTrees(data.trees || []);
            }
            setLoading(false);
        } catch (e) {
            setLoading(false);
        }
    };

    const playWaterAnimation = (callback) => {
        playSound('water');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        dropAnim.setValue(0);
        dropOpacity.setValue(1);
        rippleScale.setValue(0);
        rippleOpacity.setValue(0.8);
        
        Animated.sequence([
            Animated.timing(dropAnim, { toValue: 130, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(dropOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
                Animated.timing(rippleScale, { toValue: 4, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(rippleOpacity, { toValue: 0, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true })
            ])
        ]).start(() => {
            if (callback) callback();
        });
    };

    const playFertAnimation = (callback) => {
        playSound('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Animated.sequence([
            Animated.timing(fertScale, { toValue: 1.4, duration: 300, useNativeDriver: true }),
            Animated.spring(fertScale, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start(() => {
            if (callback) callback();
        });
    };

    const handleAction = async () => {
        if (trees.length === 0) return;
        const treeId = trees[currentIndex]._id;
        const endpoint = activeTab === 'Water' ? '/tree/water' : '/tree/fertilize';
        
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ treeId })
            });
            const data = await res.json();
            
            if (data.success) {
                if (activeTab === 'Water') {
                    playWaterAnimation(() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        playSound('success');
                        Alert.alert("Hydrated! 💧", data.message || "Your tree is drinking well.", [{ text: "OK", onPress: fetchTrees }]);
                    });
                } else {
                    playFertAnimation(() => {
                        Alert.alert("Energized! ✨", data.message || "Growth speed boosted!", [{ text: "OK", onPress: fetchTrees }]);
                    });
                }
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Notice", data.error);
            }
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Connectivity issue.");
        }
    };

    const handlePressIn = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
    
    const spin = fertRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const currentTree = trees[currentIndex] || {};

    if (loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loaderText}>Initializing Lab...</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* --- IMMERSIVE BACKGROUND --- */}
            <LinearGradient colors={['#050B05', '#0E2010', '#1A3622']} style={StyleSheet.absoluteFill} />
            
            <SafeAreaView style={{ flex: 1 }}>
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.glassBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}> SUSTAINABILITY LAB </Text>
                    <TouchableOpacity style={styles.glassBackBtn}>
                        <Ionicons name="help-circle-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                    
                    {/* --- PREMIUM TABS --- */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.premiumTab, activeTab === 'Water' && styles.activeWaterTab]} 
                            onPress={() => setActiveTab('Water')}
                        >
                            <FontAwesome5 name="tint" size={16} color={activeTab === 'Water' ? '#000' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.tabLabel, activeTab === 'Water' && styles.activeTabText]}>WATER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.premiumTab, activeTab === 'Fertilizer' && styles.activeFertTab]} 
                            onPress={() => setActiveTab('Fertilizer')}
                        >
                            <FontAwesome5 name="leaf" size={16} color={activeTab === 'Fertilizer' ? '#000' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.tabLabel, activeTab === 'Fertilizer' && styles.activeTabText]}>NUTRITION</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- HERO SECTION --- */}
                    <View style={styles.heroWrapper}>
                        <Animated.View style={[styles.glowCircle, { transform: [{ scale: scaleAnim }] }]} />
                        <Animated.View style={[styles.heroBox, { transform: [{ translateY: floatAnim }, { scale: scaleAnim }], opacity: fadeAnim }]}>
                            {activeTab === 'Water' ? (
                                <View style={styles.faucetContainer}>
                                    <Ionicons name="water" size={130} color="rgba(0, 229, 255, 0.05)" style={styles.bgWaterMark} />
                                    <MaterialCommunityIcons name="water-pump" size={90} color="#00E5FF" style={{ zIndex: 3 }} />
                                    <Animated.View style={[styles.waterDrop, { opacity: dropOpacity, transform: [{ translateY: dropAnim }] }]}>
                                        <Ionicons name="water" size={35} color="#00E5FF" />
                                    </Animated.View>
                                    <Animated.View style={[styles.ripple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
                                </View>
                            ) : (
                                <View style={styles.fertContainer}>
                                    <Animated.View style={[styles.fertGlowBg, { transform: [{ rotate: spin }] }]} />
                                    <Animated.View style={{ transform: [{ scale: fertScale }], zIndex: 3 }}>
                                        <MaterialCommunityIcons name="leaf-circle" size={100} color="#39FF14" />
                                    </Animated.View>
                                    <Ionicons name="sparkles" size={30} color="#FFF59D" style={styles.sparkle1} />
                                    <Ionicons name="sparkles" size={20} color="#FFF59D" style={styles.sparkle2} />
                                </View>
                            )}
                        </Animated.View>
                        <Text style={styles.heroTitle}>{activeTab === 'Water' ? "ESSENTIAL HYDRATION" : "ELITE NUTRIENTS"}</Text>
                        <Text style={styles.heroSub}>{activeTab === 'Water' ? "Pure water for natural growth" : "Organic compost for maximum speed"}</Text>
                    </View>

                    {/* --- TARGET PLANT (GLASSMOPHIC CARD) --- */}
                    <View style={styles.glassCardWrapper}>
                        <Text style={styles.sectionHeader}>TARGET PLANT</Text>
                        <View style={styles.glassCard}>
                            <TouchableOpacity disabled={currentIndex === 0} onPress={() => setCurrentIndex(c => c - 1)}>
                                <Ionicons name="chevron-back-circle" size={36} color={currentIndex === 0 ? "rgba(255,255,255,0.2)" : "#fff"} />
                            </TouchableOpacity>
                            
                            <View style={styles.cardContent}>
                                <Text style={styles.treeTitle}>{currentTree.treeName || "My Seed"}</Text>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelText}>{currentTree.level || "Stage 1"}</Text>
                                </View>
                                <View style={styles.progressContainer}>
                                    <LinearGradient colors={activeTab === 'Water' ? ['#00B4DB', '#0083B0'] : ['#11998e', '#38ef7d']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.progressFill, { width: `${currentTree.growth || 0}%` }]} />
                                </View>
                                <Text style={styles.progressText}>{currentTree.growth || 0}% Growth</Text>
                            </View>

                            <TouchableOpacity disabled={currentIndex >= trees.length - 1} onPress={() => setCurrentIndex(c => c + 1)}>
                                <Ionicons name="chevron-forward-circle" size={36} color={currentIndex >= trees.length - 1 ? "rgba(255,255,255,0.2)" : "#fff"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* --- ACTION SECTION --- */}
                    <View style={styles.actionSection}>
                        <View style={styles.statsGrid}>
                             <View style={styles.miniStat}>
                                 <Ionicons name="flash" size={20} color="#FFD600" />
                                 <Text style={styles.miniVal}>+20%</Text>
                                 <Text style={styles.miniLabel}>BOOST</Text>
                             </View>
                             <View style={[styles.verticalDivider, { height: '60%' }]} />
                             <View style={styles.miniStat}>
                                 <Ionicons name="time" size={20} color="#64B5F6" />
                                 <Text style={styles.miniVal}>30 S</Text>
                                 <Text style={styles.miniLabel}>RECOVERY</Text>
                             </View>
                        </View>

                        <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
                            <TouchableOpacity 
                                activeOpacity={0.9} 
                                style={[styles.mainBtn, { shadowColor: activeTab === 'Water' ? '#2196F3' : '#1B5E20' }]} 
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleAction}
                            >
                                <LinearGradient 
                                    colors={activeTab === 'Water' ? ['#00E5FF', '#0083B0'] : ['#39FF14', '#1B5E20']} 
                                    style={styles.btnGradient}
                                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                                >
                                    <Text style={styles.btnText}>{activeTab === 'Water' ? "POUR WATER" : "APPLY NUTRIENTS"}</Text>
                                    <MaterialCommunityIcons name={activeTab === 'Water' ? "water-pump" : "leaf-circle"} size={26} color="#000" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                        
                        <Text style={styles.dailyLimitText}>DAILY LIMIT: 100% GROWTH</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050B05' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050B05' },
    loaderText: { color: '#fff', marginTop: 15, fontWeight: 'bold', letterSpacing: 2 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    glassBackBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 4 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', marginHorizontal: 30, borderRadius: 30, padding: 6, marginTop: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    premiumTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 25, gap: 8 },
    activeWaterTab: { backgroundColor: '#00E5FF', elevation: 15, shadowColor: '#00E5FF', shadowOpacity: 0.8, shadowRadius: 15 },
    activeFertTab: { backgroundColor: '#39FF14', elevation: 15, shadowColor: '#39FF14', shadowOpacity: 0.8, shadowRadius: 15 },
    tabLabel: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    activeTabText: { color: '#000', fontWeight: '900' },

    heroWrapper: { alignItems: 'center', marginTop: 40, position: 'relative' },
    glowCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.02)', top: -15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    heroBox: { width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30 },
    heroImg: { width: '85%', height: '85%' },
    faucetContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' },
    bgWaterMark: { position: 'absolute', zIndex: 0 },
    waterDrop: { position: 'absolute', top: 95, zIndex: 2 },
    ripple: { position: 'absolute', bottom: 45, width: 40, height: 10, borderRadius: 20, backgroundColor: 'rgba(0, 229, 255, 0.5)', zIndex: 1 },
    
    fertContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', position: 'relative' },
    fertGlowBg: { position: 'absolute', width: '150%', height: '150%', borderRadius: 200, backgroundColor: 'rgba(57, 255, 20, 0.1)', borderWidth: 2, borderColor: 'rgba(57, 255, 20, 0.3)', borderStyle: 'dashed' },
    sparkle1: { position: 'absolute', top: 50, right: 60, zIndex: 4 },
    sparkle2: { position: 'absolute', bottom: 60, left: 70, zIndex: 4 },

    heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 35, letterSpacing: 2 },
    heroSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, fontWeight: '600', letterSpacing: 1 },

    glassCardWrapper: { paddingHorizontal: 25, marginTop: 50 },
    sectionHeader: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 15, paddingLeft: 10 },
    glassCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 30, padding: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 },
    cardContent: { flex: 1, alignItems: 'center' },
    treeTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    levelBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    levelText: { color: '#A5D6A7', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    progressContainer: { width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, marginTop: 25, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    progressText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800', marginTop: 12 },

    actionSection: { paddingHorizontal: 25, marginTop: 40, alignItems: 'center' },
    statsGrid: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25, padding: 20, justifyContent: 'space-around', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    miniStat: { alignItems: 'center' },
    miniVal: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 5, letterSpacing: 1 },
    miniLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
    verticalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

    mainBtn: { width: '100%', height: 75, borderRadius: 25, overflow: 'hidden', elevation: 20 },
    btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
    btnText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    dailyLimitText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', marginTop: 25, letterSpacing: 3 }
});
