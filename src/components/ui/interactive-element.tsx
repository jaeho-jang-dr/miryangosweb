"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface InteractiveElementProps {
    href?: string
    className?: string
    children: React.ReactNode
    as?: any // framer-motion component type
}

export function InteractiveElement({ href, className, children, as = motion.div }: InteractiveElementProps) {
    const Component = as

    const content = (
        <Component
            className={cn("cursor-pointer block", className)}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {children}
        </Component>
    )

    if (href) {
        return <Link href={href} className="block w-fit">{content}</Link>
    }

    return content
}
