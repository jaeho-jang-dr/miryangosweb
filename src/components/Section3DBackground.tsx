// Section3DBackground.tsx
// A lightweight 3D background component using react-three-fiber.
// Each `variant` renders a different simple geometry with bright pastel colors.

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Plane, Sphere, Torus, TorusKnot, RoundedBox, Octahedron, Float, Environment } from "@react-three/drei";
import { useMemo } from "react";

export type Variant = "waves" | "particles" | "grid" | "dots" | "cubes" | "rings" | "diamonds";

interface Props {
    variant: Variant;
    className?: string;
}

// Helper to pick material/color per variant
const variantConfig = {
    waves: { color: "#a0e7e5", geometry: "plane" },
    particles: { color: "#ffeb99", geometry: "sphere" },
    grid: { color: "#b7e4c7", geometry: "torus" },
    dots: { color: "#f5c6ff", geometry: "sphere" },
    cubes: { color: "#93c5fd", geometry: "box" }, // Pastel Blue, solid shading
    rings: { color: "#c4b5fd", geometry: "knot" }, // Pastel Purple, solid shading
    diamonds: { color: "#e0f2fe", geometry: "octahedron" }, // Very light blue/white for CTA
} as const;

export default function Section3DBackground({ variant, className }: Props) {
    const config = variantConfig[variant];

    const mesh = useMemo(() => {
        switch (config.geometry) {
            case "plane":
                return (
                    <Plane args={[10, 10, 32, 32]} rotation={[-Math.PI / 2, 0, 0]}>
                        <meshStandardMaterial color={config.color} wireframe={true} opacity={0.4} transparent />
                    </Plane>
                );
            case "sphere":
                return (
                    <Sphere args={[2, 32, 32]}>
                        <meshStandardMaterial color={config.color} wireframe={true} opacity={0.5} transparent />
                    </Sphere>
                );
            case "torus":
                return (
                    <Torus args={[2, 0.5, 16, 100]}>
                        <meshStandardMaterial color={config.color} wireframe={true} opacity={0.5} transparent />
                    </Torus>
                );
            case "box":
                // Floating randomized cubes
                return (
                    <group>
                        {[...Array(8)].map((_, i) => (
                            <Float key={i} speed={1.5} rotationIntensity={1} floatIntensity={2}>
                                <RoundedBox
                                    args={[1.2, 1.2, 1.2]}
                                    radius={0.2}
                                    smoothness={4}
                                    position={[
                                        (Math.random() - 0.5) * 15,
                                        (Math.random() - 0.5) * 8,
                                        (Math.random() - 0.5) * 5
                                    ]}
                                    rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
                                >
                                    <meshStandardMaterial color={config.color} roughness={0.3} metalness={0.1} />
                                </RoundedBox>
                            </Float>
                        ))}
                    </group>
                );
            case "knot":
                // Floating TorusKnots
                return (
                    <group>
                        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                            <TorusKnot args={[2.8, 0.6, 128, 32]} rotation={[0, 0, 0]} position={[3, 0, -2]}>
                                <meshStandardMaterial color={config.color} roughness={0.2} metalness={0.6} />
                            </TorusKnot>
                        </Float>
                        <Float speed={1.5} rotationIntensity={0.7} floatIntensity={1.5}>
                            <TorusKnot args={[1.5, 0.4, 100, 16]} rotation={[Math.PI / 2, 0, 0]} position={[-4, 2, -4]}>
                                <meshStandardMaterial color="#a78bfa" roughness={0.2} metalness={0.6} />
                            </TorusKnot>
                        </Float>
                    </group>
                );
            case "octahedron":
                // Floating Diamonds/Octahedrons
                return (
                    <group>
                        {[...Array(10)].map((_, i) => (
                            <Float key={i} speed={2} rotationIntensity={2} floatIntensity={1.5} floatingRange={[-1, 1]}>
                                <Octahedron
                                    args={[0.8]}
                                    position={[
                                        (Math.random() - 0.5) * 12,
                                        (Math.random() - 0.5) * 6,
                                        (Math.random() - 0.5) * 4
                                    ]}
                                    rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
                                >
                                    <meshStandardMaterial color={config.color} roughness={0.1} metalness={0.8} />
                                </Octahedron>
                            </Float>
                        ))}
                    </group>
                );
            default:
                return null;
        }
    }, [config]);

    return (
        <div className={`absolute inset-0 z-0 pointer-events-none ${className || ''}`}>
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color={config.color} />
                <Environment preset="city" />
                {mesh}
                {/* Subtle rotation for liveliness */}
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                {/* Optional star field for extra sparkle */}
                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
}

