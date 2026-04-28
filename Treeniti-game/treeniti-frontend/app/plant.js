import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    { key: 'Seed', emoji: '🌰', label: 'Seed', labelHi: 'बीज', size: width * 0.30 },
    { key: 'Sprout', emoji: '🌱', label: 'Sprout', labelHi: 'अंकुर', size: width * 0.38 },
    { key: 'Plant', emoji: '🌿', label: 'Plant', labelHi: 'पौधा', size: width * 0.46 },
    { key: 'Young Tree', emoji: '🌳', label: 'Sapling', labelHi: 'पेड़', size: width * 0.55 },
    { key: 'Mature Tree', emoji: '🌲', label: 'Tree', labelHi: 'वृक्ष', size: width * 0.65 },
    { key: 'Mature Tree (Harvest)', emoji: '🍎', label: 'Harvest', labelHi: 'फल', size: width * 0.72 },
];

// 🔇 Sound URLs — set to null to disable until local audio files are added.
// To enable: add mp3 files to assets/sounds/ and use require('../assets/sounds/water.mp3')
const SOUNDS = {
    water: 'https://www.soundjay.com/misc/sounds/water-pour-1.mp3',   
    coin: 'https://www.soundjay.com/misc/sounds/coin-spade-1.mp3',    
    success: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3', 
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
const Particle = ({ type, xPos, onFinish }) => {
    const anim = useRef(new Animated.Value(-60)).current;
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
        <Animated.View style={[styles.particle, { left: xPos, transform: [{ translateY: anim }, { rotate: spin }] }]}>
            {type === 'coin'
                ? <FontAwesome5 name="coins" size={24} color="#FFD700" />
                : <Text style={{ fontSize: 36 }}>🍎</Text>}
        </Animated.View>
    );
};

// 🦋 Forest Elements (Birds & Butterflies)
const ForestElement = ({ type, delay = 0 }) => {
    const animX = useRef(new Animated.Value(0)).current;
    const animY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnim = () => {
            const duration = 6000 + Math.random() * 4000;
            const startX = Math.random() > 0.5 ? -width : width;
            const endX = -startX;
            
            animX.setValue(startX);
            animY.setValue(Math.random() * 150 - 100);

            Animated.parallel([
                Animated.timing(animX, { toValue: endX, duration, useNativeDriver: true, easing: Easing.linear }),
                Animated.sequence([
                    Animated.timing(animY, { toValue: Math.random() * 50 - 100, duration: duration/2, useNativeDriver: true, easing: Easing.sin }),
                    Animated.timing(animY, { toValue: Math.random() * 50 - 50, duration: duration/2, useNativeDriver: true, easing: Easing.sin }),
                ])
            ]).start(() => startAnim());
        };
        const timeout = setTimeout(startAnim, delay);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <Animated.View style={{ position: 'absolute', zIndex: 5, transform: [{ translateX: animX }, { translateY: animY }] }}>
            <Text style={{ fontSize: type === 'bird' ? 26 : 20 }}>{type === 'bird' ? '🐦' : '🦋'}</Text>
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

    const barAnim = useRef(new Animated.Value(0)).current;
    const bubbleAnim = useRef(new Animated.Value(0)).current;
    const [isBarMoving, setIsBarMoving] = useState(false);
    const [shakeCount, setShakeCount] = useState(0);
    const [shakeTimer, setShakeTimer] = useState(10);
    const treeShake = useRef(new Animated.Value(0)).current;

    const waterPlayer = useAudioPlayer(SOUNDS.water, { downloadFirst: true });
    const coinPlayer = useAudioPlayer(SOUNDS.coin, { downloadFirst: true });
    const successPlayer = useAudioPlayer(SOUNDS.success, { downloadFirst: true });

    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
            interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
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
                        fruits: currentTreeData?.fruitsAvailable || 0
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
        } catch (e) {}
    };

    useFocusEffect(useCallback(() => { fetchGameState(); }, [currentIndex]));

    const startWaterGame = () => {
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
                    playSound('water');
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
        for (let i = 0; i < Math.min(fruitCount, 20); i++) {
            newFruits.push({
                id: Math.random(),
                x: Math.random() * 200 - 100,
                y: Math.random() * 160 - 140,
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
        if (shakeTimer <= 0) return;

        const newCount = shakeCount + 1;
        setShakeCount(newCount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
        }

        // 🍎 Remove a visual fruit from tree and make it fall
        if (fruitsOnTree.length > 0) {
            const fruitToFall = fruitsOnTree[0];
            setFruitsOnTree(prev => prev.slice(1));
            const absoluteX = (width / 2) + fruitToFall.x;
            setParticles(p => [...p.slice(-40), { id: Date.now().toString() + Math.random(), x: absoluteX, type: 'fruit' }]);
        } else {
            // Keep dropping fruits from tree center area even when visual fruits run out
            const spread = Math.random() * 160 - 80;
            setParticles(p => [...p.slice(-40), { id: Date.now().toString() + Math.random(), x: (width / 2) + spread, type: 'fruit' }]);
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
                setParticles(p => [...p.slice(-30), { id, x, type: 'fruit' }]);
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

    const currentTree = trees[currentIndex] || {};

    return (
        <View style={styles.container}>
            <ImageBackground source={require('../assets/image.png')} style={styles.bg}>
                {/* 🍎 FALLING FRUITS/COINS (Visible on main screen during harvest) */}
                {particles.map(p => (
                    <Particle key={p.id} type={p.type} xPos={p.x} onFinish={() => setParticles(pts => pts.filter(x => x.id !== p.id))} />
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

                    <TouchableOpacity style={styles.iconCircle}>
                        <Ionicons name="leaf-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* --- STATUS ROW (inline, not absolute) --- */}
                {trees.length > 0 && (
                    <View style={styles.plantStatusCard}>
                        <View style={styles.plantIconBox}>
                            <Ionicons name="leaf" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.plantStatusTitle}>{currentTree.treeName || 'My Plant'}</Text>
                            <Text style={styles.plantStatusDay}>Day {currentTree.daysGrowing || 1} · {currentTree.level || 'Seed'}</Text>
                            <View style={styles.dailyLimitRow}>
                                <Text style={styles.dailyLimitText}>Daily Growth: {currentTree.dailyGrowthGained || 0}/100%</Text>
                            </View>
                        </View>
                        <View style={styles.growthPill}>
                            <Text style={styles.growthPillText}>{currentTree.growth || 0}%</Text>
                        </View>
                    </View>
                )}

                <View style={styles.treeContainer}>
                    {trees.length > 0 ? (
                        <>
                            {/* --- ⬅️ PREVIOUS TREE --- */}
                            {trees.length > 1 && (
                                <TouchableOpacity
                                    style={[styles.navArrow, { left: 10 }]}
                                    onPress={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    <Ionicons name="chevron-back" size={40} color={currentIndex === 0 ? "rgba(255,255,255,0.2)" : "#fff"} />
                                </TouchableOpacity>
                            )}

                            {/* 🌳 DYNAMIC SIZE TREE based on stage */}
                            <TouchableOpacity 
                                activeOpacity={0.9} 
                                onPress={startShakeGame}
                                disabled={!['Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level)}
                            >
                                {(() => {
                                    const stageData = GROWTH_STAGES.find(s => s.key === currentTree.level) || GROWTH_STAGES[0];
                                    const treeSize = stageData.size;
                                    const canShake = ['Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);
                                    const hasLife = ['Growing Plant', 'Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);
                                    const hasFlowers = ['Young Tree', 'Mature Tree', 'Mature Tree (Harvest)'].includes(currentTree.level);

                                    return (
                                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                            {/* 🦋 Butterflies & Birds for Advanced Stages */}
                                            {hasLife && (
                                                <>
                                                    <ForestElement type="butterfly" delay={0} />
                                                    <ForestElement type="butterfly" delay={2000} />
                                                    <ForestElement type="bird" delay={4000} />
                                                </>
                                            )}

                                            {/* 💬 Talking Bubble */}
                                            {showBubble && (
                                                <Animated.View style={[styles.bubbleContainer, { opacity: bubbleAnim }]}>
                                                    <Text style={styles.bubbleText}>{treeMessage}</Text>
                                                    <View style={styles.bubbleArrow} />
                                                </Animated.View>
                                            )}


                                            <Animated.Image 
                                                source={STAGE_IMAGES[currentTree.level] || STAGE_IMAGES['Seed']} 
                                                style={[{ width: treeSize, height: treeSize }, { transform: [{translateX: treeShake}] }]} 
                                                resizeMode="contain" 
                                            />

                                            {/* 🌸 Flowers on Branches */}
                                            {hasFlowers && (
                                                <>
                                                    <Flower x={-40} y={-100} />
                                                    <Flower x={50} y={-80} />
                                                    <Flower x={-20} y={-140} />
                                                </>
                                            )}
                                            
                                            {/* 🖐️ Shake Hint */}
                                            {canShake && (
                                                <View style={styles.shakeHint}>
                                                    <MaterialCommunityIcons name="hand-pointing-up" size={24} color="#FFD700" />
                                                    <Text style={styles.shakeHintText}>TAP TO SHAKE</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}
                            </TouchableOpacity>

                            {/* --- ➡️ NEXT TREE --- */}
                            {trees.length > 1 && (
                                <TouchableOpacity
                                    style={[styles.navArrow, { right: 10 }]}
                                    onPress={() => setCurrentIndex(prev => Math.min(trees.length - 1, prev + 1))}
                                    disabled={currentIndex >= trees.length - 1}
                                >
                                    <Ionicons name="chevron-forward" size={40} color={currentIndex >= trees.length - 1 ? "rgba(255,255,255,0.2)" : "#fff"} />
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

                {/* Flexible spacer — pushes tracker + footer to the bottom */}
                <View style={{ flex: 1 }} />

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

                <View style={[styles.footerSection, { paddingBottom: Math.max(insets.bottom, 15) }]}>
                    {tokens.fruits > 0 && (
                        <TouchableOpacity style={[styles.harvestTap, { marginBottom: 10 }]} onPress={handleHarvest}>
                            <LinearGradient colors={['#FFD700', '#F9A825']} style={styles.harvestGrade}>
                                <MaterialCommunityIcons name="hand-pointing-right" size={20} color="#000" />
                                <Text style={styles.harvestText}>HARVEST</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={styles.mainControls}>
                        <TouchableOpacity style={styles.glassBtn} onPress={startWaterGame}>
                            <LinearGradient colors={['rgba(33, 150, 243, 0.4)', 'rgba(33, 150, 243, 0.2)']} style={styles.glassBtnInner}>
                                <Ionicons name="water" size={32} color="#90CAF9" />
                                <Text style={styles.glassBtnLabel}>Water</Text>
                                <Text style={styles.glassBtnSub}>पानी डालें</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.glassBtn} onPress={() => router.push('/resources?type=fertilize')}>
                            <LinearGradient colors={['rgba(76, 175, 80, 0.4)', 'rgba(76, 175, 80, 0.2)']} style={styles.glassBtnInner}>
                                <MaterialCommunityIcons name="package-variant-closed" size={32} color="#A5D6A7" />
                                <Text style={styles.glassBtnLabel}>Fertilizer</Text>
                                <Text style={styles.glassBtnSub}>खाद डालें</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                    </View>

                    {/* --- ➕ ADD NEW TREE BUTTON --- */}
                    <TouchableOpacity style={styles.fabBtn} onPress={() => router.push('/plant_form')}>
                        <LinearGradient colors={['#1B5E20', '#1B3C1B']} style={styles.fabGradient}>
                            <Ionicons name="add" size={28} color="#fff" />
                            <Text style={styles.fabText}>BUY NEW TREE</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ImageBackground>

            {/* --- WATERING MINI-GAME MODAL --- */}
            <Modal visible={isWaterGameVisible} transparent animationType="fade">
                <View style={styles.gameOverlay}>
                    <BlurView blurAmount={10} style={StyleSheet.absoluteFill} />
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
                        <Particle key={p.id} type={p.type} xPos={p.x} onFinish={() => setParticles(pts => pts.filter(x => x.id !== p.id))} />
                    ))}

                    {/* 📊 TOP HEADER — Fruit Counter + Timer */}
                    <LinearGradient colors={['rgba(0,0,0,0.92)', 'transparent']} style={styles.shakeHeader}>
                        {/* Big Fruits Counter */}
                        <View style={styles.fruitCounterRow}>
                            <MaterialCommunityIcons name="apple" size={36} color="#FF5252" />
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
                                source={STAGE_IMAGES[currentTree.level] || STAGE_IMAGES['Seed']}
                                style={[styles.shakeTreeRes, { transform: [{ translateX: treeShake }, { scale: 1 + (shakeCount % 4) / 15 }] }]}
                                resizeMode="contain"
                            />
                            {/* 🍎 Static Fruits on Tree Branches */}
                            {fruitsOnTree.map(f => (
                                <View key={f.id} style={[styles.fruitOnBranch, { left: '50%', marginLeft: f.x, top: '50%', marginTop: f.y }]}>
                                    <Text style={{ fontSize: 22 }}>🍎</Text>
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

const BlurView = ({ blurAmount, style }) => (
    <View style={[{ backgroundColor: 'rgba(0,0,0,0.8)' }, style]} />
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    bg: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 8 },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    logoText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

    plantStatusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 25, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginHorizontal: 15, marginBottom: 6 },
    plantIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    plantStatusTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    plantStatusDay: { color: '#A5D6A7', fontSize: 10 },
    dailyLimitRow: { marginTop: 2 },
    dailyLimitText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600' },
    growthPill: { backgroundColor: 'rgba(76,175,80,0.4)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4CAF50' },
    growthPillText: { color: '#A5D6A7', fontSize: 11, fontWeight: 'bold' },

    treeContainer: { height: height * 0.36, justifyContent: 'flex-end', alignItems: 'center', marginTop: 30, paddingBottom: 5 },
    mainTreeImg: { width: width * 0.6, height: width * 0.6 },
    navArrow: { position: 'absolute', zIndex: 100, padding: 15, top: '40%' },

    floatingText: { position: 'absolute', top: '35%', zIndex: 100 },
    floatingTextContent: { color: '#FDD835', fontSize: 28, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 8 },

    footerSection: { paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 0 },

    mainControls: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    glassBtn: { flex: 1, height: 90, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    glassBtnInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
    glassBtnLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    glassBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

    fabBtn: { width: '100%', height: 55, borderRadius: 20, overflow: 'hidden' },
    fabGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    fabText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

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
    shakeTreeRes: { width: 320, height: 320 },
    fruitOnBranch: { position: 'absolute', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
    shakeHint: { position: 'absolute', bottom: -10, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#FFD700' },
    shakeHintText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tapPrompt: { color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: '900', letterSpacing: 8, marginTop: 40 },
    emptyPlantZone: { alignItems: 'center', justifyContent: 'center' },
    seedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20 },
    emptyText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    emptySubText: { color: '#A5D6A7', fontSize: 14, marginTop: 5 },

    // 🌱 GROWTH STAGE TRACKER — compact floating strip
    stageTrackerCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    stageTrackerTitle: { color: '#A5D6A7', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
    stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stageStep: { alignItems: 'center', width: 44 },
    stageCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 4 },
    stageDone: { backgroundColor: 'rgba(76,175,80,0.4)', borderColor: '#4CAF50' },
    stageActive: { backgroundColor: 'rgba(255,215,0,0.3)', borderColor: '#FFD700', borderWidth: 2.5, shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 },
    stageEmoji: { fontSize: 18 },
    stageLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700', textAlign: 'center' },
    stageLabelActive: { color: '#FFD700', fontWeight: '900' },
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
