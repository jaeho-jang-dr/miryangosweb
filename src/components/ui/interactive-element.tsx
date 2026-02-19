"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface InteractiveElementProps {
    href?: string
    className?: string
    children: React.ReactNode
    /** aria-label for accessibility when content is not descriptive text */
    ariaLabel?: string
}

export function InteractiveElement({ href, className, children, ariaLabel }: InteractiveElementProps) {
    const content = (
        <motion.div
            className={cn("cursor-pointer block", className)}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {children}
        </motion.div>
    )

    if (href) {
        return (
            <Link href={href} className="block w-fit" aria-label={ariaLabel}>
                {content}
            </Link>
        )
    }

    return content
}
