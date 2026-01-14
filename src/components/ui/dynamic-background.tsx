"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Activity, Dna, Pill, Heart } from "lucide-react"

function FloatingIcon({
    icon: Icon,
    delay,
    duration,
    initialX,
    initialY,
    size
}: {
    icon: any,
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

export function DynamicBackground() {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null

    // Fixed set of background elements to prevent hydration mismatch
    // while still looking "random"
    // Generate stable random values once on mount
    const elements = useMemo(() => [
        { icon: Plus, x: "10%", y: "20%", delay: 0, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Activity, x: "85%", y: "15%", delay: 2, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Dna, x: "20%", y: "80%", delay: 4, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Pill, x: "75%", y: "70%", delay: 1, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Heart, x: "50%", y: "40%", delay: 3, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Plus, x: "90%", y: "50%", delay: 5, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
        { icon: Activity, x: "15%", y: "45%", delay: 0.5, duration: Math.random() * 10 + 15, size: Math.random() * 60 + 40 },
    ], [])

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {elements.map((el, i) => (
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
