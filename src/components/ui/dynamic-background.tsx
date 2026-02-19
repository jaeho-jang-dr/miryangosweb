"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Activity, Dna, Pill, Heart, type LucideIcon } from "lucide-react"

function FloatingIcon({
    icon: Icon,
    delay,
    duration,
    initialX,
    initialY,
    size
}: {
    icon: LucideIcon,
    delay: number,
    duration: number,
    initialX: number,
    initialY: number,
    size: number
}) {
    return (
        <motion.div
            className="absolute text-sky-200 pointer-events-none z-0"
            initial={{
                x: initialX,
                y: initialY,
                opacity: 0,
                scale: 0.5,
                rotate: 0
            }}
            animate={{
                y: [initialY, initialY - 100, initialY],
                x: [initialX, initialX + 50, initialX - 50, initialX],
                opacity: [0, 0.2, 0.4, 0.2, 0], // Increased opacity for visibility
                scale: [0.8, 1, 0.8],
                rotate: [0, 45, -45, 0]
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay
            }}
        >
            <Icon size={size} strokeWidth={1} />
        </motion.div>
    )
}

// 안정적인 값으로 고정하여 Math.random()이 매 렌더마다 다른 값을 생성하는 문제를 방지
const STABLE_ELEMENTS: Array<{
    icon: LucideIcon;
    x: string;
    y: string;
    delay: number;
    duration: number;
    size: number;
}> = [
    { icon: Plus,     x: "10%", y: "20%", delay: 0,   duration: 20, size: 80 },
    { icon: Activity, x: "85%", y: "15%", delay: 2,   duration: 18, size: 60 },
    { icon: Dna,      x: "20%", y: "80%", delay: 4,   duration: 22, size: 70 },
    { icon: Pill,     x: "75%", y: "70%", delay: 1,   duration: 16, size: 50 },
    { icon: Heart,    x: "50%", y: "40%", delay: 3,   duration: 24, size: 90 },
    { icon: Plus,     x: "90%", y: "50%", delay: 5,   duration: 19, size: 55 },
    { icon: Activity, x: "15%", y: "45%", delay: 0.5, duration: 21, size: 65 },
];

export function DynamicBackground() {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // useMemo는 조건부 return 이전에 위치해야 하므로 STABLE_ELEMENTS 상수로 모듈 레벨에서 관리
    // (이전 코드의 훅 규칙 위반 수정)
    if (!isMounted) return null

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {STABLE_ELEMENTS.map((el, i: number) => (
                <div
                    key={i}
                    className="absolute"
                    style={{ left: el.x, top: el.y }}
                >
                    <FloatingIcon
                        icon={el.icon}
                        delay={el.delay}
                        duration={el.duration}
                        size={el.size}
                        initialX={0}
                        initialY={0}
                    />
                </div>
            ))}

            {/* Subtle gradient overlay to blend deeper */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none" />
        </div>
    )
}
