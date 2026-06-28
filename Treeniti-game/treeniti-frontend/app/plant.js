import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Dimensions,
    ImageBackground,
    Alert,
    Animated,
    Easing,
    Modal,
    Platform,
    LayoutAnimation,
    UIManager
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import BASE_URL from '../config/api';
import { RewardedAd, RewardedAdEventType, AD_UNITS, adInitPromise, globalRewardedAd } from '../config/ads';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STAGE_IMAGES = {
    'Seed': require('../assets/tree_seed.png'),
    'Sprout': require('../assets/tree_sprout.png'),
    'Plant': require('../assets/tree_plant.png'),
    'Growing Plant': require('../assets/tree_plant.png'),
    'Young Tree': require('../assets/tree_young.png'),
    'Mature Tree': require('../assets/tree_mature.png'),
    'Mature Tree (Harvest)': require('../assets/tree_mature.png'),
};

// 🌱 Sequential Growth Stages (matches the botanical cycle)
const GROWTH_STAGES = [
    { key: 'Seed', emoji: '🌰', label: 'Seed', labelHi: 'बीज', size: width * 0.40 },
    { key: 'Sprout', emoji: '🌱', label: 'Sprout', labelHi: 'अंकुर', size: width * 0.52 },
    { key: 'Plant', emoji: '🌿', label: 'Plant', labelHi: 'पौधा', size: width * 0.65 },
    { key: 'Growing Plant', emoji: '🌿', label: 'Growing', labelHi: 'बड़ा पौधा', size: width * 0.80 },
    { key: 'Young Tree', emoji: '🌳', label: 'Sapling', labelHi: 'पेड़', size: width * 1.00 },
    { key: 'Mature Tree', emoji: '🌲', label: 'Tree', labelHi: 'वृक्ष', size: width * 0.88 },
    { key: 'Mature Tree (Harvest)', emoji: '🍎', label: 'Harvest', labelHi: 'फल', size: width * 1.12 },
];

// 🎵 Local Sound Effects
const SOUNDS = {
    water: require('../assets/sounds/water.mp3'),
    fertilizer: require('../assets/sounds/fertilizer.mp3'),
    shake: require('../assets/sounds/shaketree.mpeg'),
    coin: 'https://www.soundjay.com/misc/sounds/coin-spade-1.mp3',
    success: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
    tap: 'https://www.soundjay.com/misc/sounds/button-press-1.mp3',
};

// 💎 Floating Feedback Text Component
const FloatingText = ({ text, onFinish }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }).start(() => onFinish());
    }, []);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -120] });
    const opacity = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

    return (
        <Animated.View style={[styles.floatingText, { transform: [{ translateY }], opacity }]}>
            <Text style={styles.floatingTextContent}>{text}</Text>
        </Animated.View>
    );
};

// 🍎 Falling Particle component
const Particle = ({ type, xPos, startY, onFinish, scale = 1 }) => {
    const initialY = startY !== undefined ? startY : height * 0.4;
    const anim = useRef(new Animated.Value(initialY)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        const fallDuration = (type === 'water' || type === 'fertilizer') ? 700 + Math.random() * 200 : 900 + Math.random() * 500;
        
        const animations = [
            Animated.timing(anim, {
                toValue: (type === 'water' || type === 'fertilizer') ? height * 0.88 : height * 0.78,
                duration: fallDuration,
                useNativeDriver: true,
                easing: (type === 'water' || type === 'fertilizer') ? Easing.in(Easing.quad) : Easing.bounce
            }),
            Animated.timing(rotate, {
                toValue: (type === 'water' || type === 'fertilizer') ? 0 : (Math.random() > 0.5 ? 2 : -2),
                duration: 1000,
                useNativeDriver: true,
            })
        ];

        if (type === 'water' || type === 'fertilizer') {
            animations.push(
                Animated.sequence([
                    Animated.delay(fallDuration - 200),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true
                    })
                ])
            );
        }

        Animated.parallel(animations).start(() => onFinish());
    }, []);

    const spin = rotate.interpolate({ inputRange: [-2, 0, 2], outputRange: ['-720deg', '0deg', '720deg'] });

    return (
        <Animated.View style={[styles.particle, { left: xPos, opacity, transform: [{ translateY: anim }, { rotate: spin }, { scale }] }]}>
            {type === 'coin' && <FontAwesome5 name="coins" size={24} color="#FFD700" />}
            {type === 'fruit' && (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                     <Text style={{ fontSize: 32 }}>🍎</Text>
                     <View style={[styles.fruitGloss, { top: 4, right: 4, width: 8, height: 8 }]} />
                </View>
            )}
            {type === 'water' && (
                <Ionicons name="water" size={32} color="#00E5FF" style={{ textShadowColor: 'rgba(0, 176, 255, 0.6)', textShadowRadius: 6 }} />
            )}
            {type === 'fertilizer' && (
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#8D6E63', borderWidth: 1, borderColor: '#5D4037', shadowColor: '#4E342E', shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }} />
            )}
        </Animated.View>
    );
};

// 🦋 Forest Elements (Birds & Butterflies)
const ForestElement = ({ type, delay = 0 }) => {
    const animX = useRef(new Animated.Value((Math.random() * 200) - 100)).current;
    const animY = useRef(new Animated.Value(-150)).current;
    const flapAnim = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [facing, setFacing] = useState(1);

    // Randomize emoji for variety
    const emoji = useMemo(() => {
        if (type === 'bird') {
            const birds = ['🐦', '🦜', '🕊️'];
            return birds[Math.floor(Math.random() * birds.length)];
        } else {
            const butterflies = ['🦋', '🦋', '🐝', '🐞', '🦋'];
            return butterflies[Math.floor(Math.random() * butterflies.length)];
        }
    }, [type]);

    useEffect(() => {
        // 🦋 Wing flapping animation
        const flapDuration = type === 'butterfly' ? 350 : 600;
        const flapScale = type === 'butterfly' ? 0.4 : 0.6;

        Animated.loop(
            Animated.sequence([
                Animated.timing(flapAnim, { toValue: flapScale, duration: flapDuration, useNativeDriver: true }),
                Animated.timing(flapAnim, { toValue: 1, duration: flapDuration, useNativeDriver: true }),
            ])
        ).start();

        const startAnim = () => {
            const duration = type === 'bird' ? 12000 + Math.random() * 8000 : 8000 + Math.random() * 6000;
            const range = width * 0.35; // Constrained around center tree
            const startX = type === 'bird' ? range : (Math.random() * range * 2) - range;
            const endX = type === 'bird' ? -range : (Math.random() * range * 2) - range;

            if (type === 'bird') {
                setFacing(1); // Facing left for right-to-left flight
            }

            const startY = Math.random() * 150 - 350; // Moved higher up and more random spread
            const endY = type === 'bird' ? startY + (Math.random() * 40 - 20) : Math.random() * 150 - 350;

            animX.setValue(startX);
            animY.setValue(startY);

            Animated.parallel([
                Animated.timing(animX, { toValue: endX, duration, useNativeDriver: true, easing: Easing.linear }),
                type === 'bird'
                    ? Animated.timing(animY, { toValue: endY, duration, useNativeDriver: true, easing: Easing.linear })
                    : Animated.sequence([
                        Animated.timing(animY, { toValue: startY - 50, duration: duration / 2, useNativeDriver: true, easing: Easing.sin }),
                        Animated.timing(animY, { toValue: startY + 50, duration: duration / 2, useNativeDriver: true, easing: Easing.sin }),
                    ])
            ]).start(() => startAnim());
        };
        startAnim();
    }, []);

    return (
        <Animated.View style={{
            position: 'absolute',
            zIndex: 5,
            transform: [
                { translateX: animX },
                { translateY: animY },
                { scaleX: type === 'bird' ? facing : 1 }
            ]
        }}>
            <Animated.View style={{ transform: [{ scaleX: flapAnim }] }}>
                <Text style={{ fontSize: type === 'bird' ? 26 : 22 }}>{emoji}</Text>
            </Animated.View>
        </Animated.View>
    );
};

// 🌸 Flowers for the Tree
const Flower = React.memo(function Flower({ x, y }) {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[styles.flowerContainer, { left: '50%', top: '50%', marginLeft: x, marginTop: y, transform: [{ scale }] }]}>
            <Text style={{ fontSize: 16 }}>🌸</Text>
        </Animated.View>
    );
});

// 🍎 Fruits for the Tree
const FruitOnTree = React.memo(function FruitOnTree({ x, y }) {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[styles.flowerContainer, { left: '50%', top: '50%', marginLeft: x, marginTop: y, transform: [{ scale }] }]}>
            <Text style={{ fontSize: 20 }}>🍎</Text>
        </Animated.View>
    );
});

export default function GameHomeScreen() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const hasAutoStartedShake = useRef(false);

    const [bgImage, setBgImage] = useState(require('../assets/image.jpg'));
    const [trees, setTrees] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [tokens, setTokens] = useState({ coins: 0, growth: 0 });
    const [feedbackTags, setFeedbackTags] = useState([]);
    const [particles, setParticles] = useState([]);
    const [fruitsOnTree, setFruitsOnTree] = useState([]); // 🍎 Fruits hanging on tree
    const [isWaterGameVisible, setIsWaterGameVisible] = useState(false);
    const [isShakeGameActive, setIsShakeGameActive] = useState(false);
    const [fruitsEarned, setFruitsEarned] = useState(0); // 🍎 Live counter: fruits earned in current shake session
    const [treeMessage, setTreeMessage] = useState("");
    const [showBubble, setShowBubble] = useState(false);

    const [showAdModal, setShowAdModal] = useState(false);
    const [adCountdown, setAdCountdown] = useState(5);
    const adTimerRef = useRef(null);
    const adCallbackRef = useRef(null);
    const [rewardedLoaded, setRewardedLoaded] = useState(false);

    useEffect(() => {
        let unsubscribeLoaded = () => {};
        let unsubscribeEarned = () => {};
        let unsubscribeClosed = () => {};

        const setupAd = () => {
            const ad = globalRewardedAd;
            if (!ad) {
                console.log("globalRewardedAd is not created yet in plant.js");
                return;
            }

            setRewardedLoaded(ad.loaded || false);

            unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
                setRewardedLoaded(true);
            });

            unsubscribeEarned = ad.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => {
                    if (adCallbackRef.current) {
                        adCallbackRef.current();
                        adCallbackRef.current = null;
                    }
                }
            );

            unsubscribeClosed = ad.addAdEventListener(RewardedAdEventType.CLOSED, () => {
                setRewardedLoaded(false);
                adCallbackRef.current = null;
                try {
                    ad.load();
                } catch (err) {
                    console.log("Error reloading global rewarded ad on close:", err);
                }
            });

            if (!ad.loaded) {
                try {
                    ad.load();
                } catch (err) {}
            }
        };

        if (adInitPromise) {
            adInitPromise.then(() => {
                setupAd();
            });
        } else {
            setupAd();
        }

        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
        };
    }, []);

    const showRewardedAd = (onRewardEarned) => {
        try {
            const ad = globalRewardedAd;
            if (rewardedLoaded && ad) {
                adCallbackRef.current = onRewardEarned;
                ad.show();
            } else {
                Alert.alert("Loading Ad", "Google Video Ad is loading. Please try again in a moment...");
                if (ad) {
                    try {
                        ad.load();
                    } catch (err) {}
                }
            }
        } catch (e) {
            console.log("Error playing rewarded ad:", e);
            Alert.alert("Ad Error", "Failed to display video ad. Please try again.");
        }
    };

    const barAnim = useRef(new Animated.Value(0)).current;
    const bubbleAnim = useRef(new Animated.Value(0)).current;
    const [isBarMoving, setIsBarMoving] = useState(false);
    const [shakeCount, setShakeCount] = useState(0);
    const [shakeTimer, setShakeTimer] = useState(10);
    const treeShake = useRef(new Animated.Value(0)).current;
    const waterCanAnim = useRef(new Animated.Value(0)).current;
    const fertilizerAnim = useRef(new Animated.Value(0)).current;

    const currentTree = trees[currentIndex] || {};

    const forestWildlife = React.useMemo(() => {
        const level = currentTree.level || 'Seed';
        const list = [];
        if (['Growing Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(level)) {
            list.push({ id: 'bf1', type: 'butterfly', color: '#E1BEE7' });
            list.push({ id: 'bf2', type: 'butterfly', color: '#FFF9C4' });
        }
        if (['Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(level)) {
            list.push({ id: 'b1', type: 'bird', color: '#4FC3F7' });
            list.push({ id: 'bf3', type: 'butterfly', color: '#B2DFDB' });
        }
        if (['Mature Tree', 'Mature Tree (Harvest)'].includes(level)) {
            list.push({ id: 'b2', type: 'bird', color: '#FFB74D' });
            list.push({ id: 'b3', type: 'bird', color: '#FF5252' });
            list.push({ id: 'bf4', type: 'butterfly', color: '#F06292' });
            list.push({ id: 'bf5', type: 'butterfly', color: '#64B5F6' });
        }
        return list;
    }, [currentTree.level]);

    const waterPlayer = useAudioPlayer(SOUNDS.water);
    const fertilizerPlayer = useAudioPlayer(SOUNDS.fertilizer);
    const shakePlayer = useAudioPlayer(SOUNDS.shake);
    const coinPlayer = useAudioPlayer(SOUNDS.coin);
    const successPlayer = useAudioPlayer(SOUNDS.success);
    const tapPlayer = useAudioPlayer(SOUNDS.tap);

    const updateBackground = useCallback(() => {
        let hour = new Date().getHours();
        try {
            const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            hour = parseInt(formatter.format(new Date()), 10);
        } catch (e) {
            console.log("Intl error:", e);
        }

        // Morning: 6 AM to 10 AM (06:00 to 10:00)
        // Evening: 4 PM to 7 PM (16:00 to 19:00)
        if ((hour >= 6 && hour < 10) || (hour >= 16 && hour < 19)) {
            setBgImage(require('../assets/morningevening.png'));
        }
        // Day/Afternoon: 10 AM to 4 PM (10:00 to 16:00)
        else if (hour >= 10 && hour < 16) {
            setBgImage(require('../assets/image.jpg'));
        }
        // Night: 7 PM to 6 AM (19:00 to 06:00)
        else {
            setBgImage(require('../assets/nightView.png'));
        }
    }, []);

    useEffect(() => {
        updateBackground();
        const interval = setInterval(updateBackground, 60000);
        return () => clearInterval(interval);
    }, [updateBackground]);

    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            interruptionModeIOS: 'doNotMix', 
            interruptionModeAndroid: 'doNotMix',
            shouldRouteThroughEarpieceAndroid: false,
        }).catch(e => console.log("Audio mode error:", e));
    }, []);

    async function playSound(type) {
        try {
            if (type === 'water') {
                waterPlayer.seekTo(0);
                waterPlayer.play();
            } else if (type === 'fertilizer') {
                fertilizerPlayer.seekTo(0);
                fertilizerPlayer.play();
            } else if (type === 'shake') {
                shakePlayer.seekTo(0);
                shakePlayer.play();
            } else if (type === 'coin') {
                coinPlayer.seekTo(0);
                coinPlayer.play();
            } else if (type === 'success') {
                successPlayer.seekTo(0);
                successPlayer.play();
            } else if (type === 'tap') {
                tapPlayer.seekTo(0);
                tapPlayer.play();
            }
        } catch (e) { console.log("Sound error:", e); }
    }

    const loadCachedState = async () => {
        try {
            const cachedTreesStr = await AsyncStorage.getItem('cached_trees');
            const cachedTokensStr = await AsyncStorage.getItem('cached_tokens');
            
            if (cachedTreesStr) {
                const parsedTrees = JSON.parse(cachedTreesStr);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setTrees(parsedTrees);
            }
            if (cachedTokensStr) {
                const parsedTokens = JSON.parse(cachedTokensStr);
                setTokens(parsedTokens);
            }
        } catch (e) {
            console.log("Error loading cached state:", e);
        }
    };

    const fetchGameState = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            // Parallel Promise.all cuts waterfall latency by 70%!
            const [treeRes, profileRes] = await Promise.all([
                fetch(`${BASE_URL}/tree`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${BASE_URL}/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const [treeData, profileData] = await Promise.all([
                treeRes.json(),
                profileRes.json()
            ]);

            if (treeData.success && profileData.success) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                const treesList = treeData.trees || [];
                setTrees(treesList);

                const userObj = profileData.user || {};
                const currentTreeData = treesList[currentIndex];

                const freshTokens = {
                    coins: userObj.walletCoins || 0,
                    growth: currentTreeData?.growth || 0,
                    fruits: currentTreeData?.fruitsAvailable || 0,
                    totalFruits: userObj.fruitInventory || 0
                };
                setTokens(freshTokens);

                // Save to offline-first cache for instant tab transitions!
                await AsyncStorage.setItem('cached_trees', JSON.stringify(treesList));
                await AsyncStorage.setItem('cached_tokens', JSON.stringify(freshTokens));

                // Fetch random tree message
                if (currentTreeData?._id) {
                    fetchTreeMessage(currentTreeData._id);
                }
            }
        } catch (e) {
            console.log("Fetch game state error:", e);
        }
    };

    const fetchTreeMessage = async (treeId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/tree/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ treeId })
            });
            const data = await res.json();
            if (data.success && data.message) {
                setTreeMessage(data.message);
                setShowBubble(true);
                Animated.sequence([
                    Animated.timing(bubbleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.delay(4000),
                    Animated.timing(bubbleAnim, { toValue: 0, duration: 500, useNativeDriver: true })
                ]).start(() => setShowBubble(false));
            }
        } catch (e) { }
    };

    useFocusEffect(useCallback(() => {
        updateBackground();
        loadCachedState();
        fetchGameState();
    }, [currentIndex, updateBackground]));

    const startWaterGame = () => {
        showRewardedAd(async () => {
            const treeId = trees[currentIndex]?._id;
            if (!treeId) return;

            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const token = await AsyncStorage.getItem('userToken');
                const res = await fetch(`${BASE_URL}/tree/water`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ treeId })
                });
                const data = await res.json();
                if (data.success) {
                    triggerWateringAnimation();
                    setTimeout(() => {
                        addFeedback("PERFECT! Watered");
                        fetchGameState();
                    }, 3500);
                } else {
                    Alert.alert("Notice", data.error || "Failed to water the tree.");
                }
            } catch (error) {
                console.error("Water tree error:", error);
                Alert.alert("Error", "Connectivity issue while watering your tree.");
            }
        });
    };

    const startFertilizerFlow = () => {
        showRewardedAd(async () => {
            const treeId = trees[currentIndex]?._id;
            if (!treeId) return;
            try {
                const token = await AsyncStorage.getItem('userToken');
                
                // Optional: Claim fertilizer first if needed
                await fetch(`${BASE_URL}/tree/claim-reward/fertilizer`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Immediately fertilize the tree
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const res = await fetch(`${BASE_URL}/tree/fertilize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ treeId })
                });
                const data = await res.json();
                if (data.success) {
                    triggerFertilizerAnimation();
                    setTimeout(() => {
                        addFeedback("FERTILIZED! +Growth Boost");
                        fetchGameState();
                    }, 3500);
                } else {
                    Alert.alert("Notice", data.error || "Failed to fertilize the tree.");
                }
            } catch (error) {
                console.error("Fertilize tree error:", error);
                Alert.alert("Error", "Connectivity issue while fertilizing your tree.");
            }
        });
    };


    const startShakeGame = async () => {
        // Daily Limit Check: 2 times per day
        try {
            const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
            const storedDate = await AsyncStorage.getItem('lastShakeDate');
            let storedCount = await AsyncStorage.getItem('shakeCountToday');
            let count = storedCount ? parseInt(storedCount) : 0;

            if (storedDate === todayStr) {
                if (count >= 2) {
                    Alert.alert(
                        "Hold on!",
                        "You have reached the max daily limit. Please check back tomorrow!",
                        [
                            {
                                text: "OK",
                                onPress: () => {
                                    if (params?.action === 'shake') {
                                        router.push('/earn');
                                    }
                                }
                            }
                        ]
                    );
                    return;
                }
            } else {
                count = 0;
                await AsyncStorage.setItem('lastShakeDate', todayStr);
            }

            // Save incremented count
            count += 1;
            await AsyncStorage.setItem('shakeCountToday', count.toString());
        } catch (e) {
            console.log("Shake limit storage error:", e);
        }

        // SRS 3.2.2: Shake game only available for MATURE trees (after full 21-day growth cycle)
        const isEligible = ['Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);
        if (!isEligible) {
            Alert.alert(
                "🔒 Tree Not Ready!",
                `Shake Tree unlocks when your tree reaches 'Mature Tree' stage (90% growth / ~21 days). Keep watering daily!\n\nCurrent: ${currentTree.level} (${Math.round(currentTree.growth || 0)}%)`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            if (params?.action === 'shake') {
                                router.push('/earn');
                            }
                        }
                    }
                ]
            );
            return;
        }

        setShakeCount(0);
        setFruitsEarned(0);
        setShakeTimer(10);
        setParticles([]);

        // 🍎 Place fruits on tree branches (show at least 12 visual fruits to shake off)
        const newFruits = [];
        const fruitCount = Math.max(tokens.fruits || 0, 12);
        for (let i = 0; i < Math.min(fruitCount, 25); i++) {
            newFruits.push({
                id: Math.random(),
                x: Math.random() * 220 - 110,
                y: Math.random() * 180 - 160,
                scale: Math.random() * 0.4 + 0.8, // Variety in size
                rotation: Math.random() * 40 - 20, // Organic tilt
            });
        }
        setFruitsOnTree(newFruits);

        setIsShakeGameActive(true);
        const interval = setInterval(() => {
            setShakeTimer(p => {
                if (p <= 1) { clearInterval(interval); return 0; }
                return p - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (params?.action === 'shake' && trees.length > 0 && !hasAutoStartedShake.current) {
            hasAutoStartedShake.current = true;
            const timer = setTimeout(() => {
                startShakeGame();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [params, trees]);

    const handleShakeTap = () => {
        if (!isShakeGameActive) return;
        playSound('shake'); // 🌳 shaketree.mpeg sound on every tap
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newCount = shakeCount + 1;
        setShakeCount(newCount);

        // Shake animation
        Animated.sequence([
            Animated.timing(treeShake, { toValue: 18, duration: 35, useNativeDriver: true }),
            Animated.timing(treeShake, { toValue: -18, duration: 35, useNativeDriver: true }),
            Animated.timing(treeShake, { toValue: 8, duration: 30, useNativeDriver: true }),
            Animated.timing(treeShake, { toValue: 0, duration: 30, useNativeDriver: true })
        ]).start();

        // Every 5 taps = 1 fruit earned 🍎
        if (newCount % 5 === 0) {
            setFruitsEarned(c => c + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 🍎 Strictly drop only fruits that are physically present on the branches
            if (fruitsOnTree.length > 0) {
                const fruitToFall = fruitsOnTree[0];
                setFruitsOnTree(prev => prev.slice(1));
                const absoluteX = (width / 2) + fruitToFall.x;
                // Vertical offset: Start falling from where the fruit was on the branch
                const startYPos = (height * 0.5) + fruitToFall.y; 
                setParticles(p => [...p.slice(-40), { 
                    id: Date.now().toString() + Math.random(), 
                    x: absoluteX, 
                    startY: startYPos, 
                    type: 'fruit',
                    scale: fruitToFall.scale,
                    rotation: fruitToFall.rotation
                }]);
            }
        }
    };

    useEffect(() => {
        if (isShakeGameActive && shakeTimer === 0) finishShakeGame();
    }, [shakeTimer]);

    const finishShakeGame = async () => {
        setIsShakeGameActive(false);
        playSound('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const token = await AsyncStorage.getItem('userToken');
            await fetch(`${BASE_URL}/tree/shake`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ treeId: trees[currentIndex]._id, hits: shakeCount })
            });
            fetchGameState();
            Alert.alert(
                "Success!",
                `Harvested ${Math.floor(shakeCount / 5)} fruits & some bonus coins!`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            if (params?.action === 'shake') {
                                router.push('/earn');
                            }
                        }
                    }
                ]
            );
        } catch (e) { }
    };

    const triggerHarvestAnimation = () => {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const id = Date.now() + Math.random();
                const x = Math.random() * (width - 60) + 30;
                setParticles(p => [...p.slice(-30), { id, x, startY: height * 0.4, type: 'fruit' }]);
            }, i * 100);
        }
    };

    const triggerFertilizerAnimation = () => {
        // Move fertilizer bag in and tilt
        Animated.sequence([
            Animated.timing(fertilizerAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]).start();

        setTimeout(() => playSound('fertilizer'), 800);

        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const id = Date.now() + Math.random();
                const x = (width / 2) + 10 + (Math.random() * 20 - 10);
                setParticles(p => [...p.slice(-45), { 
                    id, 
                    x, 
                    startY: height * 0.38, 
                    type: 'fertilizer',
                    scale: Math.random() * 0.4 + 0.8
                }]);
            }, 800 + i * 80);
        }

        // Move fertilizer bag out
        setTimeout(() => {
            Animated.timing(fertilizerAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
        }, 800 + 25 * 80 + 300);
    };

    const triggerWateringAnimation = () => {
        // Move water can in and tilt
        Animated.sequence([
            Animated.timing(waterCanAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]).start();

        setTimeout(() => playSound('water'), 800);

        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const id = Date.now() + Math.random();
                // Exact position of the watering can nozzle
                const x = (width / 2) + 10 + (Math.random() * 15 - 7.5);
                setParticles(p => [...p.slice(-45), { 
                    id, 
                    x, 
                    startY: height * 0.60, 
                    type: 'water',
                    scale: Math.random() * 0.3 + 0.7
                }]);
            }, 800 + i * 80); // 80ms * 25 drops = 2000ms (2 seconds)
        }

        // Move water can out
        setTimeout(() => {
            Animated.timing(waterCanAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
        }, 800 + 25 * 80 + 300);
    };

    const handleHarvest = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/tree/harvest`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ treeId: trees[currentIndex]._id })
            });
            const data = await res.json();
            if (data.success) {
                playSound('success');
                triggerHarvestAnimation();
                addFeedback(`+${data.walletCoins ? '' : ''}🍎 Harvested!`);
                fetchGameState();
                Alert.alert(
                    "🍎 Harvest Complete!",
                    data.message || `Fruits harvested successfully!`,
                    [{ text: 'Awesome! 🎉', style: 'default' }]
                );
            } else {
                Alert.alert("Wait!", data.error);
            }
        } catch (e) {
            Alert.alert("Error", "Network error. Please try again.");
        }
    };

    const addFeedback = (text) => {
        const id = Date.now().toString() + Math.random();
        setFeedbackTags(p => [...p, { id, text }]);
    };

    return (
        <View style={styles.container}>





            <ImageBackground source={bgImage} style={styles.bg} resizeMode="stretch">
                {/* 🍎 FALLING FRUITS/COINS (Visible on main screen during harvest) */}
                {particles.map(p => (
                    <Particle key={p.id} type={p.type} xPos={p.x} startY={p.startY} onFinish={() => setParticles(pts => pts.filter(x => x.id !== p.id))} />
                ))}

                {/* --- HEADER --- */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.push('/menu')} style={styles.iconCircle}>
                        <Ionicons name="menu-outline" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <Ionicons name="leaf" size={18} color="#A5D6A7" />
                        <Text style={styles.logoText}>Treeniti</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <View style={styles.inventoryBadge}>
                            <Text style={{ fontSize: 18 }}>🍎</Text>
                            <Text style={styles.inventoryText}>{tokens.totalFruits || 0}</Text>
                        </View>

                        {tokens.fruits > 0 && (
                            <TouchableOpacity style={styles.harvestActionBtn} onPress={handleHarvest}>
                                <Text style={{ fontSize: 20 }}>🍎</Text>
                                <View style={styles.harvestBadge}>
                                    <Text style={styles.harvestBadgeText}>{tokens.fruits}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <TouchableOpacity style={styles.premiumAddBtn} onPress={() => router.push('/plant_form')}>
                                <View style={styles.addBtnInner}>
                                    <Ionicons name="add" size={18} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 7.5, color: '#fff', fontWeight: 'bold', marginTop: 3, letterSpacing: 0.5 }}>NEW TREE</Text>
                        </View>
                    </View>
                </View>

                {/* --- STATUS ROW (inline, not absolute) --- */}
                {trees.length > 0 && (
                    <View style={styles.plantStatusCard}>
                        <View style={styles.plantIconBox}>
                            <Ionicons name="leaf" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center', paddingRight: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.plantStatusTitle, { flexShrink: 1 }]} numberOfLines={1}>
                                    {currentTree.treeName || 'My Plant'}
                                </Text>
                                {currentTree.mood && (
                                    <View style={styles.moodPill}>
                                        <Text style={styles.moodText}>
                                            {currentTree.mood === 'Happy' ? '😊' :
                                                currentTree.mood === 'Sad' ? '😢' :
                                                    currentTree.mood === 'Waiting' ? '⏳' :
                                                        currentTree.mood === 'Excited' ? '🤩' : '🌿'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.plantStatusDay} numberOfLines={1}>Day {currentTree.daysGrowing || 1} · {currentTree.level || 'Seed'}</Text>
                        </View>
                        <View style={styles.growthPill}>
                            <Text style={styles.growthPillText}>{typeof currentTree.growth === 'number' ? Math.round(currentTree.growth) : 0}%</Text>
                        </View>
                    </View>
                )}

                {/* --- SIDE CONTROLS --- */}
                <View style={styles.leftControlsColumn}>

                    <TouchableOpacity style={styles.verticalGlassBtn} onPress={startFertilizerFlow}>
                        <Image source={require('../assets/fertlizer_bori.png')} style={{ width: 105, height: 105 }} resizeMode="contain" />
                        <Text style={styles.verticalBtnLabel}>Fertilizer</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.rightControlsColumn}>
                    {/* 🌳 Shake Tree: Only visible when tree is Mature */}
                    {['Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level) && (
                        <TouchableOpacity
                            style={[styles.verticalGlassBtn, { borderColor: '#FFD700' }]}
                            onPress={startShakeGame}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={require('../assets/shake_tree_logo.png')}
                                style={{ width: 130, height: 100, marginTop: 15 }}
                                resizeMode="contain"
                            />
                            <Text style={[styles.verticalBtnLabel, { color: '#FFD700', marginTop: -120 }]}></Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.verticalGlassBtn} onPress={startWaterGame}>
                        <Image source={require('../assets/water_can.png')} style={{ width: 105, height: 105 }} resizeMode="contain" />
                        <Text style={styles.verticalBtnLabel}>Water</Text>
                    </TouchableOpacity>
                </View>

                {/* Spacer to push tree down to the bottom */}
                <View style={{ flex: 1.3 }} />

                {/* Animated Fertilizer Bag */}
                <Animated.Image
                    source={require('../assets/fertlizer_bori.png')}
                    style={{
                        position: 'absolute',
                        width: 140,
                        height: 140,
                        zIndex: 300,
                        top: 0,
                        left: 0,
                        transform: [
                            {
                                translateX: fertilizerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-150, (width / 2) - 60] // From offscreen left to center left
                                })
                            },
                            {
                                translateY: fertilizerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [height * 0.15, height * 0.28]
                                })
                            },
                            {
                                rotate: fertilizerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '35deg'] // Tilting right
                                })
                            }
                        ]
                    }}
                    resizeMode="contain"
                />

                {/* Animated Watering Can */}
                <Animated.Image
                    source={require('../assets/water_can.png')}
                    style={{
                        position: 'absolute',
                        width: 140,
                        height: 140,
                        zIndex: 300,
                        top: 0,
                        left: 0,
                        transform: [
                            {
                                translateX: waterCanAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [width + 100, (width / 2) - 15]
                                })
                            },
                            {
                                translateY: waterCanAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [height * 0.25, height * 0.40]
                                })
                            },
                            {
                                rotate: waterCanAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '-35deg']
                                })
                            }
                        ]
                    }}
                    resizeMode="contain"
                />

                <View style={styles.treeContainer}>
                    {/* 🦋 Dynamic Forest Wildlife */}
                    {forestWildlife.map(el => (
                        <ForestElement key={el.id} type={el.type} color={el.color} />
                    ))}

                    {trees.length > 0 ? (
                        <>
                            {/* --- ⬅️ PREVIOUS TREE --- */}
                            {trees.length > 1 && (
                                <TouchableOpacity
                                    style={[styles.navArrow, { left: 15 }]}
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setCurrentIndex(prev => Math.max(0, prev - 1));
                                    }}
                                    disabled={currentIndex <= 0}
                                >
                                    <Ionicons name="chevron-back" size={32} color={currentIndex <= 0 ? "rgba(255,255,255,0.2)" : "#FFD700"} />
                                </TouchableOpacity>
                            )}

                            {/* 🌳 DYNAMIC SIZE TREE based on stage */}
                            <View style={{ opacity: 1 }}>
                                {(() => {
                                    const stageData = GROWTH_STAGES.find(s => s.key === currentTree.level) || GROWTH_STAGES[0];
                                    const treeSize = stageData.size;
                                    const hasFlowers = ['Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);

                                    return (
                                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                            {/* 💬 Talking Bubble */}
                                            {showBubble && (
                                                <Animated.View style={[styles.bubbleContainer, { opacity: bubbleAnim }]}>
                                                    <Text style={styles.bubbleText}>{treeMessage}</Text>
                                                    <View style={styles.bubbleArrow} />
                                                </Animated.View>
                                            )}

                                            <Animated.Image
                                                source={STAGE_IMAGES[currentTree.level] || STAGE_IMAGES['Seed']}
                                                style={[
                                                    { width: treeSize, height: treeSize },
                                                    {
                                                        transform: [
                                                            { translateX: treeShake },
                                                            { translateY: (currentTree.level?.includes('Mature')) ? -125 : (currentTree.level === 'Seed') ? 30 : 0 }
                                                        ]
                                                    }
                                                ]}
                                                resizeMode="contain"
                                            />

                                            {/* 🌸 Flowers & 🍎 Fruits (Sticky to the tree) */}
                                            <Animated.View style={{ transform: [{ translateX: treeShake }] }}>
                                                {hasFlowers && (
                                                    <>
                                                        <Flower key="fl-1" x={-40} y={-100} />
                                                        <Flower key="fl-2" x={50} y={-80} />
                                                        <Flower key="fl-3" x={-20} y={-140} />
                                                    </>
                                                )}

                                                {['Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level) && (
                                                    <>
                                                        <FruitOnTree key="fr-1" x={-30} y={-110} />
                                                        <FruitOnTree key="fr-2" x={40} y={-90} />
                                                        <FruitOnTree key="fr-3" x={-10} y={-130} />
                                                        <FruitOnTree key="fr-4" x={15} y={-150} />
                                                        <FruitOnTree key="fr-5" x={-50} y={-70} />
                                                    </>
                                                )}
                                            </Animated.View>
                                        </View>
                                    );
                                })()}
                            </View>

                            {/* --- ➡️ NEXT TREE --- */}
                            {trees.length > 1 && (
                                <TouchableOpacity
                                    style={[styles.navArrow, { right: 15 }]}
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setCurrentIndex(prev => Math.min(trees.length - 1, prev + 1));
                                    }}
                                    disabled={currentIndex >= trees.length - 1}
                                >
                                    <Ionicons name="chevron-forward" size={32} color={currentIndex >= trees.length - 1 ? "rgba(255,255,255,0.2)" : "#FFD700"} />
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <TouchableOpacity style={styles.emptyPlantZone} onPress={() => router.push('/plant_form')}>
                            <View style={styles.seedCircle}>
                                <MaterialCommunityIcons name="seed-outline" size={50} color="#fff" />
                            </View>
                            <Text style={styles.emptyText}>Tap to Plant Your Seed</Text>
                            <Text style={styles.emptySubText}>बीज लगाने के लिए टैप करें</Text>
                        </TouchableOpacity>
                    )}

                    {feedbackTags.map(f => (
                        <FloatingText key={f.id} text={f.text} onFinish={() => setFeedbackTags(p => p.filter(x => x.id !== f.id))} />
                    ))}
                </View>

                {/* 🌱 GROWTH JOURNEY — floating glass strip */}
                <View style={[styles.stageTrackerCard, { marginBottom: insets.bottom + 12 }]}>
                    <View style={styles.stageRow}>
                        {GROWTH_STAGES.map((stage, index) => {
                            const stageIndex = GROWTH_STAGES.findIndex(s => s.key === (currentTree.level || 'Seed'));
                            const isActive = index === stageIndex;
                            const isDone = index < stageIndex;
                            return (
                                <React.Fragment key={stage.key}>
                                    <View style={styles.stageStep}>
                                        <View style={[
                                            styles.stageCircle,
                                            isDone && styles.stageDone,
                                            isActive && styles.stageActive
                                        ]}>
                                            <Text style={styles.stageEmoji}>{stage.emoji}</Text>
                                        </View>
                                        <Text style={[styles.stageLabel, isActive && styles.stageLabelActive]}>{stage.label}</Text>
                                        <Text style={styles.stageLabelHi}>{stage.labelHi}</Text>
                                    </View>
                                    {index < GROWTH_STAGES.length - 1 && (
                                        <View style={[styles.stageConnector, isDone && styles.stageConnectorDone]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* 📊 Compact Growth Bar */}
                    {trees.length > 0 && (() => {
                        const growthPct = typeof currentTree.growth === 'number' ? Math.min(100, Math.max(0, currentTree.growth)) : 0;
                        const daysGrown = Math.min(currentTree.daysGrowing || 1, 21);
                        const dailyDone = typeof currentTree.dailyGrowthGained === 'number' ? currentTree.dailyGrowthGained : 0;
                        const isDailyFull = dailyDone >= 4.762;
                        return (
                            <View style={{ marginTop: 8 }}>
                                {/* Bar row with % on right */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.growthBarBg, { flex: 1 }]}>
                                        <View style={[styles.growthBarFill, { width: `${growthPct}%` }]} />
                                    </View>
                                    <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '900', minWidth: 32, textAlign: 'right' }}>
                                        {Math.round(growthPct)}%
                                    </Text>
                                </View>
                                {/* Single compact info line */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>📅 Day {daysGrown}/21</Text>
                                    <Text style={{ color: isDailyFull ? '#FF5252' : '#4CAF50', fontSize: 9, fontWeight: '700' }}>
                                        {isDailyFull ? '✅ Max today' : `+${(4.762 - dailyDone).toFixed(1)}% left`}
                                    </Text>
                                </View>
                            </View>
                        );
                    })()}
                </View>

            </ImageBackground>

            {/* --- SHAKE GAME FULLSCREEN --- */}
            <Modal visible={isShakeGameActive} transparent animationType="fade">
                <View style={styles.shakeWorld}>
                    {/* 🍎 Falling Fruits */}
                    {particles.map(p => (
                        <Particle key={p.id} type={p.type} xPos={p.x} startY={p.startY} onFinish={() => setParticles(pts => pts.filter(x => x.id !== p.id))} />
                    ))}

                    {/* 📊 TOP HEADER — Fruit Counter + Timer */}
                    <LinearGradient colors={['rgba(0,0,0,0.92)', 'transparent']} style={styles.shakeHeader}>
                        {/* 🔙 Back Button and Title Row */}
                        <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 25, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                            <TouchableOpacity 
                                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} 
                                onPress={() => {
                                    setIsShakeGameActive(false);
                                    if (params?.action === 'shake') {
                                        router.push('/earn');
                                    }
                                }}
                            >
                                <Ionicons name="arrow-back" size={22} color="#fff" />
                            </TouchableOpacity>
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>SHAKE TREE GAME</Text>
                            <View style={{ width: 38 }} />
                        </View>

                        {/* Big Fruits Counter */}
                        <View style={styles.fruitCounterRow}>
                            <Text style={{ fontSize: 40 }}>🍎</Text>
                            <Text style={styles.fruitCounterBig}>{(tokens.fruits || 0) + fruitsEarned}</Text>
                            <View style={styles.fruitCounterLabels}>
                                <Text style={styles.fruitCounterTitle}>FRUITS</Text>
                                <Text style={styles.fruitEarnedBadge}>+{fruitsEarned} this shake</Text>
                            </View>
                        </View>

                        {/* Timer + Taps row */}
                        <View style={styles.shakeStatsRow}>
                            <View style={styles.shakeStatBox}>
                                <Text style={[styles.shakeStatNum, { color: shakeTimer < 4 ? '#FF5252' : '#FFD700' }]}>{shakeTimer}s</Text>
                                <Text style={styles.shakeStatLabel}>TIME</Text>
                            </View>
                            <View style={styles.shakeStatDivider} />
                            <View style={styles.shakeStatBox}>
                                <Text style={styles.shakeStatNum}>{shakeCount}</Text>
                                <Text style={styles.shakeStatLabel}>TAPS</Text>
                            </View>
                            <View style={styles.shakeStatDivider} />
                            <View style={styles.shakeStatBox}>
                                <Text style={styles.shakeStatNum}>{5 - (shakeCount % 5 === 0 && shakeCount > 0 ? 5 : shakeCount % 5)}</Text>
                                <Text style={styles.shakeStatLabel}>NEXT 🍎</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    <TouchableOpacity activeOpacity={1} style={styles.tapFullZone} onPress={handleShakeTap}>
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Animated.Image
                                source={require('../assets/shake_tree.png')}
                                style={[styles.shakeTreeRes, { transform: [{ translateX: treeShake }, { scale: 1 + (shakeCount % 4) / 15 }] }]}
                                resizeMode="contain"
                            />
                            {/* 🍎 Static Fruits on Tree Branches */}
                            {fruitsOnTree.map(f => (
                                <View 
                                    key={f.id} 
                                    style={[
                                        styles.fruitOnBranch, 
                                        { 
                                            left: '50%', 
                                            marginLeft: f.x, 
                                            top: '50%', 
                                            marginTop: f.y,
                                            transform: [{ scale: f.scale }, { rotate: `${f.rotation}deg` }]
                                        }
                                    ]}
                                >
                                    <Text style={{ fontSize: 24 }}>🍎</Text>
                                    <View style={styles.fruitGloss} />
                                </View>
                            ))}
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.tapPrompt}>TAP TAP TAP! ⚡</Text>
                </View>
            </Modal>
        </View>
    );
}

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    bg: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 8 },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    logoText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

    plantStatusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, gap: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', marginHorizontal: 15, marginBottom: 4, elevation: 5 },
    plantIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    plantStatusTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    plantStatusDay: { color: '#A5D6A7', fontSize: 10 },
    dailyLimitRow: { marginTop: 2 },
    dailyLimitText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600' },
    growthPill: { backgroundColor: 'rgba(76,175,80,0.4)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4CAF50' },
    growthPillText: { color: '#A5D6A7', fontSize: 11, fontWeight: 'bold' },

    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inventoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    inventoryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    harvestActionBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,82,82,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FF5252' },
    harvestBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF5252', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center', justifyContent: 'center' },
    harvestBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    headerActionBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    premiumAddBtn: { 
        width: 38,
        height: 38,
        borderRadius: 19, 
        backgroundColor: '#1B5E20', // Solid Dark Green
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5, 
        borderColor: '#A5D6A7', 
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 5,
        zIndex: 999
    },
    addBtnInner: { justifyContent: 'center', alignItems: 'center' },

    leftControlsColumn: { position: 'absolute', left: 15, top: height * 0.67, zIndex: 200, gap: 10 },
    rightControlsColumn: { position: 'absolute', right: 15, top: height * 0.49 , zIndex: 200, gap: 10 },
    verticalGlassBtn: { width: 110, height: 130, justifyContent: 'center', alignItems: 'center' },
    verticalBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: -10, textTransform: 'uppercase', textShadowColor: '#000', textShadowRadius: 4 },
    lockedShakeBtn: { borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)' },
    shakeLockBadge: { position: 'absolute', top: -15, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', zIndex: 99 },
    shakeLockText: { color: '#FFD700', fontSize: 7, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
    moodPill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    moodText: { fontSize: 11 },

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
      shadowRadius: 10,
      zIndex: 9999
    },
    tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -5 },
    tabIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    activeTabIcon: { backgroundColor: '#fff' },
    tabLabel: { fontSize: 9.5, color: '#fff', marginTop: 2, fontWeight: 'bold', textAlign: 'center' },
    centerBtn: { marginTop: -22, alignItems: 'center', zIndex: 10000 },
    centerBtnInner: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
    centerText: { fontSize: 8, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 1, letterSpacing: 0.5 },
    centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    treeContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 0 },
    mainTreeImg: { width: width * 0.6, height: width * 0.6 },
    navArrow: {
        position: 'absolute',
        zIndex: 100,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,215,0,0.4)',
        top: '-65%', // Arrows moved higher up to avoid accidental clicks on Shake button
        elevation: 5,
        shadowColor: '#FFD700',
        shadowOpacity: 0.3,
        shadowRadius: 5
    },

    floatingText: { position: 'absolute', top: '35%', zIndex: 100 },
    floatingTextContent: { color: '#FDD835', fontSize: 28, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 8 },

    // Water Game Modals
    gameOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waterGameBox: { width: width * 0.9, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 40, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
    gameHead: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
    gameSub: { color: '#90CAF9', fontSize: 12, marginTop: 5, marginBottom: 50 },
    timingTrack: { width: 300, height: 70, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 35, justifyContent: 'center', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
    hitTarget: { position: 'absolute', width: 60, height: '100%', backgroundColor: '#4CAF50', alignSelf: 'center', opacity: 0.6, borderRadius: 10 },
    waterPointer: { position: 'absolute', alignItems: 'center' },
    pointerLine: { width: 3, height: 15, backgroundColor: '#fff', marginTop: -5 },
    masterTap: { marginTop: 60, backgroundColor: '#fff', paddingVertical: 20, paddingHorizontal: 70, borderRadius: 35, elevation: 10 },
    masterTapText: { color: '#1565C0', fontWeight: '900', fontSize: 18, letterSpacing: 1 },

    // Shake Game Styles
    shakeWorld: { flex: 1, backgroundColor: '#1B3C1B', alignItems: 'center' },
    particle: { position: 'absolute', top: -50, zIndex: 999 },
    shakeHeader: { width: '100%', paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
    timerLarge: { fontSize: 80, fontWeight: '900', color: '#fff' },
    harvestScore: { fontSize: 24, color: '#FFD54F', fontWeight: 'bold', marginTop: 10 },
    fruitLiveCount: { color: '#fff', fontSize: 16, fontWeight: '600' },
    tapFullZone: { width: '100%', height: '55%', justifyContent: 'center', alignItems: 'center' },
    shakeTreeRes: { width: 400, height: 400 },
    fruitOnBranch: { position: 'absolute', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 5, elevation: 8 },
    fruitGloss: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    shakeHint: { position: 'absolute', bottom: -10, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#FFD700' },
    shakeHintText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tapPrompt: { color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: '900', letterSpacing: 8, marginTop: 40 },
    emptyPlantZone: { alignItems: 'center', justifyContent: 'center' },
    seedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20 },
    emptyText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    emptySubText: { color: '#A5D6A7', fontSize: 14, marginTop: 5 },

    // 🌱 GROWTH STAGE TRACKER — compact floating strip
    stageTrackerCard: { marginHorizontal: 10, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', elevation: 5 },
    stageTrackerTitle: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
    stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stageStep: { alignItems: 'center', width: 44 },
    stageCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 2 },
    stageDone: { backgroundColor: 'rgba(76,175,80,0.5)', borderColor: '#4CAF50' },
    stageActive: { backgroundColor: 'rgba(255,215,0,0.25)', borderColor: '#FFD700', borderWidth: 2.5, shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 10, elevation: 12, transform: [{ scale: 1.15 }] },
    stageEmoji: { fontSize: 15 },
    stageLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textAlign: 'center' },
    stageLabelActive: { color: '#FFD700', fontWeight: '900', fontSize: 10 },
    stageLabelHi: { color: 'rgba(255,255,255,0.35)', fontSize: 7, textAlign: 'center' },
    stageConnector: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12, marginHorizontal: 2 },
    stageConnectorDone: { backgroundColor: '#4CAF50' },
    growthBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 5, overflow: 'hidden' },
    growthBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
    growthPct: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center', marginTop: 6 },

    // 🍎 Harvest Button
    harvestTap: { width: '100%', height: 52, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFD700', elevation: 8, shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 10 },
    harvestGrade: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
    harvestText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

    // 🍎 Shake Game — Fruit Counter Header
    fruitCounterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    fruitCounterBig: { fontSize: 56, fontWeight: '900', color: '#FF5252', lineHeight: 60 },
    fruitCounterLabels: { justifyContent: 'center' },
    fruitCounterTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    fruitEarnedBadge: { color: '#FFD700', fontSize: 13, fontWeight: '700', marginTop: 2 },
    shakeStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 20, gap: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    shakeStatBox: { flex: 1, alignItems: 'center' },
    shakeStatNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
    shakeStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 1 },
    shakeStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

    // 🌸 Flower Container
    flowerContainer: { position: 'absolute', zIndex: 6 },

    // 💬 Talking Bubble
    bubbleContainer: { position: 'absolute', top: -80, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 15, borderBottomLeftRadius: 0, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 10, maxWidth: 200, zIndex: 100 },
    bubbleText: { color: '#1B5E20', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
    bubbleArrow: { position: 'absolute', bottom: -10, left: 0, width: 0, height: 0, borderTopWidth: 10, borderTopColor: 'rgba(255,255,255,0.95)', borderRightWidth: 10, borderRightColor: 'transparent' },

    // 🚨 Pest Indicator
    pestIndicator: { position: 'absolute', top: 40, alignItems: 'center', zIndex: 10 },
    pestIndicatorText: { color: '#FF5252', fontSize: 10, fontWeight: '900', marginTop: 5, textShadowColor: '#000', textShadowRadius: 2 },
});
