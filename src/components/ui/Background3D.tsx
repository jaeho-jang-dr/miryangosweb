'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere({ position, scale, color, speed }: { position: [number, number, number], scale: number, color: string, speed: number }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ref.current) {
            // Gentle rotation
            ref.current.rotation.x = state.clock.getElapsedTime() * 0.1 * speed;
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.15 * speed;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere args={[1, 64, 64]} position={position} scale={scale} ref={ref}>
                <MeshDistortMaterial
                    color={color}
                    attach="material"
                    distort={0.4} // Strength of distortion
                    speed={2 * speed} // Speed of distortion
                    roughness={0.4}
                    metalness={0.1}
                />
            </Sphere>
        </Float>
    );
}

function Scene() {
    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -10, -5]} intensity={1} color="#10b981" />

            {/* Main Organic Shape - Bottom Right - Vibrantly Visible */}
            <AnimatedSphere
                position={[2.5, -1.5, 0]}
                scale={2.8}
                color="#34d399" // emerald-400 (Much stronger than 200)
                speed={1.2}
            />

            {/* Secondary Shape - Top Left - Vibrantly Visible */}
            <AnimatedSphere
                position={[-3, 2, -1]}
                scale={2.0}
                color="#60a5fa" // blue-400 (Much stronger than 100)
                speed={1}
            />

            {/* Accent Shape - Far Background */}
            <AnimatedSphere
                position={[0, 0, -5]}
                scale={2}
                color="#a78bfa" // violet-400 (Adds contrast)
                speed={0.6}
            />

            {/* Subtle Particles/Stars for Depth - Increased Count */}
            <Stars radius={40} depth={40} count={2000} factor={4} saturation={1} fade speed={1} />
        </>
    );
}

export default function Background3D() {
    return (
        <div className="fixed inset-0 -z-50 pointer-events-none opacity-40">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true }}>
                <Scene />
            </Canvas>
        </div>
    );
}
