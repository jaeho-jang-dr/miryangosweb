// Section3DBackground.tsx
// A premium 3D background component using react-three-fiber and drei.
// Implements "Apple-style" minimalist yet dynamic aesthetics with glassmorphism and smooth animations.

import { Canvas, useFrame } from "@react-three/fiber";
import {
    OrbitControls,
    Sphere,
    MeshDistortMaterial,
    MeshWobbleMaterial,
    Float,
    Sparkles,
    Octahedron,
    TorusKnot,
    Environment,
    ContactShadows,
    Stars
} from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from 'three';

export type Variant = "waves" | "particles" | "grid" | "dots" | "cubes" | "rings" | "diamonds";

interface Props {
    variant: Variant;
    className?: string;
}

// Configuration for colors and geometries
const variantConfig = {
    waves: { color: "#3b82f6", secondary: "#93c5fd" }, // Blue blob
    particles: { color: "#fcd34d", secondary: "#fbbf24" }, // Gold sparkles
    grid: { color: "#6ee7b7", secondary: "#34d399" }, // Greenish
    dots: { color: "#f0abfc", secondary: "#e879f9" }, // Pink
    cubes: { color: "#93c5fd", secondary: "#60a5fa" }, // Blue cubes
    rings: { color: "#c4b5fd", secondary: "#8b5cf6" }, // Purple rings
    diamonds: { color: "#e0f2fe", secondary: "#ffffff" }, // White/Ice
} as const;

function AnimatedBlob({ color }: { color: string }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = Math.sin(t / 2);
        meshRef.current.rotation.y = Math.sin(t / 4);
    });

    return (
        <Sphere args={[1, 64, 64]} scale={2} ref={meshRef}>
            <MeshDistortMaterial
                color={color}
                envMapIntensity={1}
                clearcoat={1}
                clearcoatRoughness={0}
                metalness={0.1}
                distort={0.4}
                speed={2}
            />
        </Sphere>
    );
}

function FloatingDiamonds({ color }: { color: string }) {
    return (
        <group>
            {[...Array(6)].map((_, i) => (
                <Float key={i} speed={2} rotationIntensity={2} floatIntensity={2} floatingRange={[-1, 1]}>
                    <Octahedron
                        args={[0.8, 0]}
                        position={[
                            (Math.random() - 0.5) * 10,
                            (Math.random() - 0.5) * 6,
                            (Math.random() - 0.5) * 4
                        ]}
                    >
                        <meshPhysicalMaterial
                            color={color}
                            roughness={0}
                            metalness={0.2}
                            transmission={0.6}
                            thickness={2}
                            transparent
                            opacity={0.8}
                        />
                    </Octahedron>
                </Float>
            ))}
            <Sparkles count={50} scale={10} size={4} speed={0.4} opacity={0.5} color={color} />
        </group>
    );
}

function WobbleRings({ color }: { color: string }) {
    return (
        <group>
            <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5}>
                <TorusKnot args={[1.5, 0.2, 128, 32]} position={[0, 0, 0]} rotation={[0, 0, 0]}>
                    <MeshWobbleMaterial color={color} factor={1} speed={1} roughness={0.1} metalness={0.5} />
                </TorusKnot>
            </Float>
            <Sparkles count={30} scale={8} size={2} speed={0.4} opacity={0.3} color="white" />
        </group>
    );
}

export default function Section3DBackground({ variant, className }: Props) {
    const config = variantConfig[variant];

    const Scene = useMemo(() => {
        switch (variant) {
            case "waves":
                // Hero Section: A beautiful, distorted liquid blob
                return <AnimatedBlob color={config.color} />;

            case "diamonds":
                // CTA Section: Premium floating glass diamonds
                return <FloatingDiamonds color={config.color} />;

            case "rings":
            case "grid":
                // Rings: Abstract wobbling shapes
                return <WobbleRings color={config.color} />;

            case "particles":
            case "dots":
            default:
                // Subtle sparkle dust for content heavy sections
                return (
                    <group>
                        <Sparkles
                            count={100}
                            scale={12}
                            size={6}
                            speed={0.4}
                            opacity={0.6}
                            color={config.secondary}
                        />
                        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
                    </group>
                );
        }
    }, [variant, config]);

    return (
        <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ease-in-out ${className || ''}`}>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
                {/* Lighting setup for "Premium" feel */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} color={config.secondary} />

                {/* Environment for reflections */}
                <Environment preset="city" />

                {Scene}

                {/* Mouse Interaction */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    enableRotate={true}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 1.5}
                    minPolarAngle={Math.PI / 3}
                />
            </Canvas>
        </div>
    );
}

