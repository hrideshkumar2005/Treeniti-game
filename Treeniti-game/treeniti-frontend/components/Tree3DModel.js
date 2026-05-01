import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

// 🍎 Realistic Apple Component
function RealisticApple({ position }) {
    const appleMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
        color: '#d11a2a', // Deep apple red
        roughness: 0.15, 
        metalness: 0.1 
    }), []);
    
    const stemMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
        color: '#4a2e00', 
        roughness: 0.9 
    }), []);
    
    const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
        color: '#2e8b57', // Sea green
        roughness: 0.7,
        side: THREE.DoubleSide
    }), []);

    return (
        <group position={position}>
            {/* Apple Body */}
            <mesh material={appleMaterial} castShadow scale={[1.05, 0.95, 1.05]}>
                <sphereGeometry args={[0.15, 24, 24]} />
            </mesh>
            
            {/* Stem */}
            <mesh position={[0, 0.16, 0]} material={stemMaterial} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
            </mesh>

            {/* Leaf */}
            <mesh position={[0.05, 0.17, 0]} rotation={[0, 0, Math.PI / 4]} material={leafMaterial} castShadow>
                <coneGeometry args={[0.04, 0.1, 3]} />
            </mesh>
        </group>
    );
}

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
        'Seed': 0.5,
        'Sprout': 0.8,
        'Plant': 1.1,
        'Growing Plant': 1.1,
        'Young Tree': 1.4,
        'Mature Tree': 1.8,
        'Mature Tree (Harvest)': 1.8
    };
    const scale = scales[stage] || 1;

    // Materials
    const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 0.8 }), []);
    const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4CAF50', roughness: 0.5 }), []);
    const fruitMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#F44336', roughness: 0.2 }), []);

    return (
        <group ref={group} scale={[scale, scale, scale]} position={[0, -0.5, 0]}>
            {stage === 'Seed' ? (
                <mesh position={[0, 0.2, 0]} castShadow material={trunkMaterial}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                </mesh>
            ) : (
                <>
                    {/* Trunk */}
                    <mesh position={[0, 0.6, 0]} castShadow material={trunkMaterial}>
                        <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
                    </mesh>
                    
                    {/* Leaves / Canopy */}
                    {stage !== 'Sprout' && (
                        <mesh position={[0, 1.5, 0]} castShadow material={leafMaterial}>
                            <coneGeometry args={[0.9, 2.0, 12]} />
                        </mesh>
                    )}
                    
                    {/* Sprout Leaves */}
                    {stage === 'Sprout' && (
                        <mesh position={[0, 1.2, 0]} castShadow material={leafMaterial}>
                            <sphereGeometry args={[0.4, 8, 8]} />
                        </mesh>
                    )}

                    {/* Harvest Fruits */}
                    {stage === 'Mature Tree (Harvest)' && (
                        <group>
                            <RealisticApple position={[0.5, 1.3, 0]} />
                            <RealisticApple position={[-0.4, 1.1, 0.4]} />
                            <RealisticApple position={[0, 1.7, -0.4]} />
                            <RealisticApple position={[0.3, 0.9, -0.4]} />
                            <RealisticApple position={[-0.2, 1.4, 0.6]} />
                            <RealisticApple position={[0.6, 1.0, 0.3]} />
                        </group>
                    )}
                </>
            )}
        </group>
    );
}

// 🌍 3D Scene Wrapper
export default function Tree3DScene({ stage, isShaking }) {
    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight 
                position={[5, 10, 5]} 
                intensity={1.8} 
                castShadow 
                shadow-mapSize-width={1024} 
                shadow-mapSize-height={1024} 
            />
            
            <ProceduralTree stage={stage} isShaking={isShaking} />

            {/* Soil / Ground Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <circleGeometry args={[4, 32]} />
                <meshStandardMaterial color="#3E2723" roughness={1} />
            </mesh>
        </>
    );
}
