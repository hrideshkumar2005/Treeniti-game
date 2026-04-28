import React, { useState, useRef, Suspense, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// 🌳 Procedural 3D Tree Model (6 Stages)
function ProceduralTree({ stage, isShaking }) {
    const group = useRef();
    
    // Idle Sway Animation & Shake Animation
    useFrame((state) => {
        if (group.current) {
            // Idle sway
            group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
            
            if (isShaking) {
                group.current.rotation.x = Math.sin(state.clock.elapsedTime * 30) * 0.1;
                group.current.rotation.z = Math.cos(state.clock.elapsedTime * 30) * 0.1;
            } else {
                // Smoothly return to 0
                group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);
                group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, 0.1);
            }
        }
    });

    // Stage Scales
    const scales = {
        'Seed': 0.2,
        'Sprout': 0.4,
        'Plant': 0.6,
        'Sapling': 0.8,
        'Tree': 1.1,
        'Harvest': 1.3
    };
    const scale = scales[stage] || 1;

    // Materials
    const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 0.8 }), []);
    const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4CAF50', roughness: 0.5 }), []);
    const fruitMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#F44336', roughness: 0.2 }), []);

    return (
        <group ref={group} scale={[scale, scale, scale]} position={[0, 0, 0]}>
            {stage === 'Seed' ? (
                <mesh position={[0, 0.1, 0]} castShadow material={trunkMaterial}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                </mesh>
            ) : (
                <>
                    {/* Trunk */}
                    <mesh position={[0, 0.5, 0]} castShadow material={trunkMaterial}>
                        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
                    </mesh>
                    
                    {/* Leaves / Canopy */}
                    {stage !== 'Sprout' && (
                        <mesh position={[0, 1.3, 0]} castShadow material={leafMaterial}>
                            <coneGeometry args={[0.8, 1.8, 12]} />
                        </mesh>
                    )}
                    
                    {/* Sprout Leaves */}
                    {stage === 'Sprout' && (
                        <mesh position={[0, 1.0, 0]} castShadow material={leafMaterial}>
                            <sphereGeometry args={[0.4, 8, 8]} />
                        </mesh>
                    )}

                    {/* Harvest Fruits */}
                    {stage === 'Harvest' && (
                        <group>
                            <mesh position={[0.5, 1.2, 0]} material={fruitMaterial} castShadow><sphereGeometry args={[0.15, 16, 16]} /></mesh>
                            <mesh position={[-0.4, 1.0, 0.4]} material={fruitMaterial} castShadow><sphereGeometry args={[0.15, 16, 16]} /></mesh>
                            <mesh position={[0, 1.5, -0.4]} material={fruitMaterial} castShadow><sphereGeometry args={[0.15, 16, 16]} /></mesh>
                            <mesh position={[0.3, 0.8, -0.4]} material={fruitMaterial} castShadow><sphereGeometry args={[0.15, 16, 16]} /></mesh>
                        </group>
                    )}
                </>
            )}
        </group>
    );
}

// 🌍 3D Scene Wrapper
function Scene({ stage, isShaking }) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight 
                position={[5, 10, 5]} 
                intensity={1.5} 
                castShadow 
                shadow-mapSize-width={1024} 
                shadow-mapSize-height={1024} 
            />
            
            <ProceduralTree stage={stage} isShaking={isShaking} />

            {/* Soil / Ground Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <circleGeometry args={[4, 32]} />
                <meshStandardMaterial color="#3E2723" roughness={1} />
            </mesh>
        </>
    );
}

// 📱 Main React Native Screen
export default function Plant3DScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [stage, setStage] = useState('Tree');
    const [isShaking, setIsShaking] = useState(false);
    const [growthProgress, setGrowthProgress] = useState(70);

    const STAGES = ['Seed', 'Sprout', 'Plant', 'Sapling', 'Tree', 'Harvest'];

    const handleShake = () => {
        if (isShaking) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
    };

    const handleWater = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGrowthProgress(prev => {
            const next = Math.min(prev + 15, 100);
            if (next === 100 && stage !== 'Harvest') {
                const currentIndex = STAGES.indexOf(stage);
                if (currentIndex < STAGES.length - 1) {
                    setStage(STAGES[currentIndex + 1]);
                }
                return 0; // Reset progress for next stage
            }
            return next;
        });
    };

    return (
        <View style={styles.container}>
            {/* 🎥 3D Canvas Layer */}
            <View style={StyleSheet.absoluteFill}>
                <Canvas shadows camera={{ position: [0, 2.5, 6.5], fov: 45 }}>
                    <color attach="background" args={['#81D4FA']} /> {/* Sky Blue Background */}
                    <Suspense fallback={null}>
                        <Scene stage={stage} isShaking={isShaking} />
                    </Suspense>
                </Canvas>
            </View>

            {/* 📱 UI Overlay Layer */}
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>My Virtual Tree</Text>
                        <Text style={styles.stageText}>Stage: {stage}</Text>
                    </View>
                    <View style={{ width: 44 }} /> {/* Balance */}
                </View>

                <View style={styles.progressWrapper}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${growthProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{growthProgress}% to next stage</Text>
                </View>

                {/* Middle Section (Shake Interaction) */}
                <View style={styles.centerUI} pointerEvents="box-none">
                    <TouchableOpacity style={styles.shakeBtn} onPress={handleShake} activeOpacity={0.7}>
                        <Ionicons name="hand-right" size={24} color="#fff" style={{ marginBottom: 5 }} />
                        <Text style={styles.shakeText}>TAP TO SHAKE</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer Section */}
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handleWater}>
                        <Ionicons name="water" size={24} color="#fff" />
                        <Text style={styles.btnText}>WATER</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => {}}>
                        <Ionicons name="leaf" size={24} color="#fff" />
                        <Text style={styles.btnText}>FERTILIZE</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1, justifyContent: 'space-between' },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
    stageText: { fontSize: 12, color: '#388E3C', fontWeight: 'bold' },

    progressWrapper: { alignItems: 'center', marginTop: 15 },
    progressTrack: { width: '60%', height: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 5 },
    progressText: { color: '#333', fontSize: 12, fontWeight: 'bold', marginTop: 5, textShadowColor: '#fff', textShadowRadius: 2 },

    centerUI: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    shakeBtn: { backgroundColor: 'rgba(255, 152, 0, 0.9)', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
    shakeText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

    footer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 30 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, gap: 10 },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
