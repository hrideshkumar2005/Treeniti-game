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
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

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
    { key: 'Seed', emoji: '🌰', label: 'Seed', labelHi: 'बीज', size: width * 0.45 },
    { key: 'Sprout', emoji: '🌱', label: 'Sprout', labelHi: 'अंकुर', size: width * 0.58 },
    { key: 'Plant', emoji: '🌿', label: 'Plant', labelHi: 'पौधा', size: width * 0.72 },
    { key: 'Young Tree', emoji: '🌳', label: 'Sapling', labelHi: 'पेड़', size: width * 1.15 },
    { key: 'Mature Tree', emoji: '🌲', label: 'Tree', labelHi: 'वृक्ष', size: width * 1.00 },
    { key: 'Mature Tree (Harvest)', emoji: '🍎', label: 'Harvest', labelHi: 'फल', size: width * 1.30 },
];

// 🔇 Sound URLs — set to null to disable until local audio files are added.
// To enable: add mp3 files to assets/sounds/ and use require('../assets/sounds/water.mp3')
const SOUNDS = {
    water: 'https://www.soundjay.com/misc/sounds/water-pour-1.mp3',
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
    useEffect(() => {
        Animated.parallel([
            Animated.timing(anim, {
                toValue: height * 0.78,
                duration: 900 + Math.random() * 500,
                useNativeDriver: true,
                easing: Easing.bounce
            }),
            Animated.timing(rotate, {
                toValue: Math.random() > 0.5 ? 2 : -2,
                duration: 1000,
                useNativeDriver: true,
            })
        ]).start(() => onFinish());
    }, []);

    const spin = rotate.interpolate({ inputRange: [-2, 0, 2], outputRange: ['-720deg', '0deg', '720deg'] });

    return (
        <Animated.View style={[styles.particle, { left: xPos, transform: [{ translateY: anim }, { rotate: spin }, { scale }] }]}>
            {type === 'coin'
                ? <FontAwesome5 name="coins" size={24} color="#FFD700" />
                : (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                         <Text style={{ fontSize: 32 }}>🍎</Text>
                         <View style={[styles.fruitGloss, { top: 4, right: 4, width: 8, height: 8 }]} />
                    </View>
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
const Flower = ({ x, y }) => {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[styles.flowerContainer, { left: '50%', top: '50%', marginLeft: x, marginTop: y, transform: [{ scale }] }]}>
            <Text style={{ fontSize: 16 }}>🌸</Text>
        </Animated.View>
    );
};

// 🍎 Fruits for the Tree
const FruitOnTree = ({ x, y }) => {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[styles.flowerContainer, { left: '50%', top: '50%', marginLeft: x, marginTop: y, transform: [{ scale }] }]}>
            <Text style={{ fontSize: 20 }}>🍎</Text>
        </Animated.View>
    );
};

export default function GameHomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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
    const [showWaterRewardModal, setShowWaterRewardModal] = useState(false);
    const [showFertilizerRewardModal, setShowFertilizerRewardModal] = useState(false);
    const adTimerRef = useRef(null);
    const adCallbackRef = useRef(null);

    const showRewardedAd = (onRewardEarned) => {
        adCallbackRef.current = onRewardEarned;
        setAdCountdown(5);
        setShowAdModal(true);

        let count = 5;
        adTimerRef.current = setInterval(() => {
            count -= 1;
            setAdCountdown(count);
            if (count <= 0) {
                clearInterval(adTimerRef.current);
                setShowAdModal(false);
                if (adCallbackRef.current) adCallbackRef.current();
            }
        }, 1000);
    };

    const barAnim = useRef(new Animated.Value(0)).current;
    const bubbleAnim = useRef(new Animated.Value(0)).current;
    const [isBarMoving, setIsBarMoving] = useState(false);
    const [shakeCount, setShakeCount] = useState(0);
    const [shakeTimer, setShakeTimer] = useState(10);
    const treeShake = useRef(new Animated.Value(0)).current;

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
    const coinPlayer = useAudioPlayer(SOUNDS.coin);
    const successPlayer = useAudioPlayer(SOUNDS.success);
    const tapPlayer = useAudioPlayer(SOUNDS.tap);

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

    const fetchGameState = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${BASE_URL}/tree`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.success) {
                setTrees(data.trees || []);
                const walletRes = await fetch(`${BASE_URL}/wallet`, { headers: { 'Authorization': `Bearer ${token}` } });
                const walletData = await walletRes.json();
                if (walletData.success) {
                    const currentTreeData = data.trees[currentIndex];
                    setTokens({
                        coins: walletData.totalCoins,
                        growth: currentTreeData?.growth || 0,
                        fruits: currentTreeData?.fruitsAvailable || 0,
                        totalFruits: walletData.fruitInventory || 0
                    });
                }

                // Fetch random tree message
                if (data.trees[currentIndex]) {
                    fetchTreeMessage(data.trees[currentIndex]._id);
                }
            }
        } catch (e) { console.log(e); }
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

    useFocusEffect(useCallback(() => { fetchGameState(); }, [currentIndex]));

    const startWaterGame = () => {
        showRewardedAd(() => {
            // After ad — show congrats modal first
            setShowWaterRewardModal(true);
        });
    };

    const startFertilizerFlow = () => {
        showRewardedAd(async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const res = await fetch(`${BASE_URL}/tree/claim-reward/fertilizer`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setShowFertilizerRewardModal(true);
                } else {
                    Alert.alert("Error", data.error || "Failed to claim reward.");
                }
            } catch (e) {
                Alert.alert("Error", "Connectivity issue while claiming reward.");
            }
        });
    };

    const beginFertilizerUse = async () => {
        setShowFertilizerRewardModal(false);
        const treeId = trees[currentIndex]?._id;
        if (!treeId) return;

        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_URL}/tree/fertilize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ treeId })
            });
            const data = await res.json();
            if (data.success) {
                playSound('success');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                addFeedback("Fertilized! +Growth Boost");
                fetchGameState();
                Alert.alert("✨ Success!", "Your tree has been fertilized and its growth is boosted!");
            } else {
                Alert.alert("Notice", data.error);
            }
        } catch (e) {
            Alert.alert("Error", "Check your connection.");
        }
    };

    const beginWaterMiniGame = () => {
        setShowWaterRewardModal(false);
        setIsWaterGameVisible(true);
        setIsBarMoving(true);
        Animated.loop(
            Animated.sequence([
                Animated.timing(barAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(barAnim, { toValue: 0, duration: 900, easing: Easing.linear, useNativeDriver: true })
            ])
        ).start();
    };

    const handleWaterTap = async () => {
        if (!isBarMoving) return;
        setIsBarMoving(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        barAnim.stopAnimation(async (val) => {
            let accuracy = "MISS";
            if (val > 0.45 && val < 0.55) { accuracy = "PERFECT"; }
            else if (val > 0.25 && val < 0.75) { accuracy = "GOOD"; }

            if (accuracy !== "MISS") {
                try {
                    if (accuracy === "PERFECT") playSound('success');
                    else playSound('water');
                    const token = await AsyncStorage.getItem('userToken');
                    const res = await fetch(`${BASE_URL}/tree/water`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ treeId: trees[currentIndex]._id })
                    });
                    const data = await res.json();
                    if (data.success) {
                        addFeedback(`${accuracy}! +20% Growth`);
                        fetchGameState();
                    } else {
                        Alert.alert("Hold on!", data.error);
                    }
                } catch (e) { }
            } else {
                Alert.alert("Missed!", "The water missed the roots. Try again!");
            }
            setTimeout(() => setIsWaterGameVisible(false), 900);
        });
    };


    const startShakeGame = () => {
        // SRS 3.2.2: Shake game is available for established plants
        const isEligible = ['Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);
        if (!isEligible) {
            Alert.alert("Too Small!", "Your seedling is too fragile to shake. Grow it into a Plant first!");
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

    const handleShakeTap = () => {
        if (!isShakeGameActive) return;
        playSound('tap');
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
            Alert.alert("Success!", `Harvested ${Math.floor(shakeCount / 5)} fruits & some bonus coins!`);
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

            {/* --- 📺 AD MODAL (Rewarded Ad Simulation) --- */}
            <Modal visible={showAdModal} transparent={false} animationType="fade" statusBarTranslucent>
                <LinearGradient colors={['#0a0a0a', '#1a1a2e', '#16213e']} style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
                    {/* Top Ad Label */}
                    <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                            <Text style={{ color: '#aaa', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>SPONSORED</Text>
                        </View>
                        <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }}>
                            <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>{adCountdown}s</Text>
                        </View>
                    </View>

                    {/* Ad Content */}
                    <View style={{ alignItems: 'center', gap: 20 }}>
                        <Text style={{ fontSize: 70 }}>🌱</Text>
                        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: 1 }}>Grow More Trees!</Text>
                        <Text style={{ color: '#A5D6A7', fontSize: 15, textAlign: 'center', lineHeight: 24 }}>
                            Join millions planting{'\n'}virtual & real trees for a{'\n'}greener planet 🌍
                        </Text>
                        <View style={{ backgroundColor: 'rgba(76,175,80,0.2)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 30, borderWidth: 1, borderColor: '#4CAF50' }}>
                            <Text style={{ color: '#4CAF50', fontSize: 14, fontWeight: '900', letterSpacing: 2 }}>TREENITI — PLANT & EARN</Text>
                        </View>
                    </View>

                    {/* Bottom Progress */}
                    <View style={{ width: '100%', gap: 12 }}>
                        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${((5 - adCountdown) / 5) * 100}%`, backgroundColor: '#FFD700', borderRadius: 2 }} />
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>Watch to earn your watering reward 💧</Text>
                    </View>
                </LinearGradient>
            </Modal>

            {/* --- 💧 WATER REWARD CONGRATS MODAL --- */}
            <Modal visible={showWaterRewardModal} transparent animationType="fade" statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
                    <LinearGradient
                        colors={['#0d47a1', '#1565C0', '#1976D2']}
                        style={{ width: '100%', borderRadius: 30, padding: 35, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(100,181,246,0.4)', elevation: 20 }}
                    >
                        {/* Glow Circle */}
                        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(100,181,246,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(100,181,246,0.5)', marginBottom: 20 }}>
                            <Text style={{ fontSize: 55 }}>💧</Text>
                        </View>

                        {/* Title */}
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8 }}>
                            🎉 Congratulations!
                        </Text>

                        {/* Reward Message */}
                        <Text style={{ color: '#90CAF9', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 6 }}>
                            You earned
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: 'rgba(100,181,246,0.15)', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(100,181,246,0.3)' }}>
                            <Text style={{ fontSize: 30 }}>💧💧</Text>
                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>2 Drops of Water</Text>
                        </View>

                        <Text style={{ color: '#90CAF9', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
                            Use these water drops to grow{'\n'}your tree and boost its growth! 🌱
                        </Text>

                        {/* Use Water Button */}
                        <TouchableOpacity
                            onPress={beginWaterMiniGame}
                            style={{ width: '100%', backgroundColor: '#42A5F5', borderRadius: 20, paddingVertical: 16, alignItems: 'center', elevation: 8, shadowColor: '#42A5F5', shadowOpacity: 0.6, shadowRadius: 10 }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>💧 Use Water Now</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* --- 🌿 FERTILIZER REWARD CONGRATS MODAL --- */}
            <Modal visible={showFertilizerRewardModal} transparent animationType="fade" statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
                    <LinearGradient
                        colors={['#1B5E20', '#2E7D32', '#388E3C']}
                        style={{ width: '100%', borderRadius: 30, padding: 35, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(165,214,167,0.4)', elevation: 20 }}
                    >
                        {/* Glow Circle */}
                        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(165,214,167,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(165,214,167,0.5)', marginBottom: 20 }}>
                            <Text style={{ fontSize: 55 }}>🌿</Text>
                        </View>

                        {/* Title */}
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8 }}>
                            🎉 Congratulations!
                        </Text>

                        {/* Reward Message */}
                        <Text style={{ color: '#A5D6A7', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 6 }}>
                            You earned
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: 'rgba(165,214,167,0.15)', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(165,214,167,0.3)' }}>
                            <Text style={{ fontSize: 30 }}>🌿</Text>
                            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>1 Bag of Fertilizer</Text>
                        </View>

                        <Text style={{ color: '#A5D6A7', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
                            Use this fertilizer to supercharge{`\n`}your tree's growth! 🚀
                        </Text>

                        {/* Use Fertilizer Button */}
                        <TouchableOpacity
                            onPress={beginFertilizerUse}
                            style={{ width: '100%', backgroundColor: '#4CAF50', borderRadius: 20, paddingVertical: 16, alignItems: 'center', elevation: 8, shadowColor: '#4CAF50', shadowOpacity: 0.6, shadowRadius: 10 }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>🌿 Use Fertilizer Now</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            <ImageBackground source={require('../assets/image.png')} style={styles.bg} resizeMode="stretch">
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
                        <TouchableOpacity style={styles.premiumAddBtn} onPress={() => router.push('/plant_form')}>
                            <View style={styles.addBtnInner}>
                                <Ionicons name="add" size={26} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- STATUS ROW (inline, not absolute) --- */}
                {trees.length > 0 && (
                    <View style={styles.plantStatusCard}>
                        <View style={styles.plantIconBox}>
                            <Ionicons name="leaf" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.plantStatusTitle}>{currentTree.treeName || 'My Plant'}</Text>
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
                            <Text style={styles.plantStatusDay}>Day {currentTree.daysGrowing || 1} · {currentTree.level || 'Seed'}</Text>
                            <View style={styles.dailyLimitRow}>
                                <Text style={styles.dailyLimitText}>Daily Growth: {currentTree.dailyGrowthGained || 0}/4%</Text>
                            </View>
                        </View>
                        <View style={styles.growthPill}>
                            <Text style={styles.growthPillText}>{currentTree.growth || 0}%</Text>
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
                    {['Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level) && (
                        <TouchableOpacity style={[styles.verticalGlassBtn, { borderColor: '#FFD700' }]} onPress={startShakeGame}>
                            <Image source={require('../assets/shake_tree_logo.png')} style={{ width: 130, height: 100, marginTop: 15 }} resizeMode="contain" />
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
                                    onPress={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
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
                                                        <Flower x={-40} y={-100} />
                                                        <Flower x={50} y={-80} />
                                                        <Flower x={-20} y={-140} />
                                                    </>
                                                )}

                                                {['Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level) && (
                                                    <>
                                                        <FruitOnTree x={-30} y={-110} />
                                                        <FruitOnTree x={40} y={-90} />
                                                        <FruitOnTree x={-10} y={-130} />
                                                        <FruitOnTree x={15} y={-150} />
                                                        <FruitOnTree x={-50} y={-70} />
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
                                    onPress={() => setCurrentIndex(prev => Math.min(trees.length - 1, prev + 1))}
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
                <View style={styles.stageTrackerCard}>
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
                    <View style={styles.growthBarBg}>
                        <View style={[styles.growthBarFill, {
                            width: `${((GROWTH_STAGES.findIndex(s => s.key === (currentTree.level || 'Seed')) + 1) / GROWTH_STAGES.length) * 100}%`
                        }]} />
                    </View>
                </View>

                <View style={[styles.bottomNavigationPlaceholder, { height: Math.max(insets.bottom, 20) }]} />
            </ImageBackground>

            {/* --- WATERING MINI-GAME MODAL --- */}
            <Modal visible={isWaterGameVisible} transparent animationType="fade">
                <View style={styles.gameOverlay}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', ...StyleSheet.absoluteFillObject }} />
                    <View style={styles.waterGameBox}>
                        <Text style={styles.gameHead}>DROP CONTROL</Text>
                        <Text style={styles.gameSub}>Stop at the center for PERFECT growth!</Text>

                        <View style={styles.timingTrack}>
                            <View style={styles.hitTarget} />
                            <Animated.View style={[styles.waterPointer, { transform: [{ translateX: barAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] }]}>
                                <Ionicons name="water" size={40} color="#00B0FF" />
                                <View style={styles.pointerLine} />
                            </Animated.View>
                        </View>

                        <TouchableOpacity activeOpacity={0.7} style={styles.masterTap} onPress={handleWaterTap}>
                            <Text style={styles.masterTapText}>RELEASE DROP</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- SHAKE GAME FULLSCREEN --- */}
            <Modal visible={isShakeGameActive} transparent animationType="fade">
                <View style={styles.shakeWorld}>
                    {/* 🍎 Falling Fruits */}
                    {particles.map(p => (
                        <Particle key={p.id} type={p.type} xPos={p.x} startY={p.startY} onFinish={() => setParticles(pts => pts.filter(x => x.id !== p.id))} />
                    ))}

                    {/* 📊 TOP HEADER — Fruit Counter + Timer */}
                    <LinearGradient colors={['rgba(0,0,0,0.92)', 'transparent']} style={styles.shakeHeader}>
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
        width: 48,
        height: 48,
        borderRadius: 24, 
        backgroundColor: '#1B5E20', // Solid Dark Green
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2, 
        borderColor: '#A5D6A7', 
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.8,
        shadowRadius: 10,
        zIndex: 999
    },
    addBtnInner: { justifyContent: 'center', alignItems: 'center' },

    leftControlsColumn: { position: 'absolute', left: 15, top: height * 0.71, zIndex: 200, gap: 15 },
    rightControlsColumn: { position: 'absolute', right: 15, top: height * 0.52, zIndex: 200, gap: 15 },
    verticalGlassBtn: { width: 110, height: 130, justifyContent: 'center', alignItems: 'center' },
    verticalBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: -10, textTransform: 'uppercase', textShadowColor: '#000', textShadowRadius: 4 },
    moodPill: { marginLeft: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    moodText: { fontSize: 14 },

    bottomNavigationPlaceholder: { width: '100%' },

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
    stageTrackerCard: { marginHorizontal: 10, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 25, paddingVertical: 15, paddingHorizontal: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', elevation: 5 },
    stageTrackerTitle: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
    stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stageStep: { alignItems: 'center', width: 44 },
    stageCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 4 },
    stageDone: { backgroundColor: 'rgba(76,175,80,0.5)', borderColor: '#4CAF50' },
    stageActive: { backgroundColor: 'rgba(255,215,0,0.25)', borderColor: '#FFD700', borderWidth: 2.5, shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 10, elevation: 12, transform: [{ scale: 1.15 }] },
    stageEmoji: { fontSize: 20 },
    stageLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textAlign: 'center' },
    stageLabelActive: { color: '#FFD700', fontWeight: '900', fontSize: 10 },
    stageLabelHi: { color: 'rgba(255,255,255,0.35)', fontSize: 7, textAlign: 'center' },
    stageConnector: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 18, marginHorizontal: 2 },
    stageConnectorDone: { backgroundColor: '#4CAF50' },
    growthBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
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
