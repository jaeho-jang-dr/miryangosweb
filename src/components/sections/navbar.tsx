"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"

const navItems = [
    { name: "소개", href: "#intro" },
    { name: "진료분야", href: "#departments" },
    { name: "아카이브", href: "#archive" },
    { name: "오시는 길", href: "/location" },
]

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isLogoHovered, setIsLogoHovered] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <>
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    isScrolled
                        ? "bg-white/80 backdrop-blur-md border-b border-gray-100"
                        : "bg-transparent"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <div
                            className="flex-shrink-0 relative z-50"
                            onMouseEnter={() => setIsLogoHovered(true)}
                            onMouseLeave={() => setIsLogoHovered(false)}
                        >
                            <InteractiveElement href="/">
                                <span className="text-xl md:text-2xl font-semibold tracking-tight relative z-10 transition-colors duration-300">
                                    miryang<span className="font-bold">os</span>
                                </span>
                            </InteractiveElement>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-8">
                            {navItems.map((item) => (
                                <InteractiveElement key={item.name} href={item.href}>
                                    <span className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
                                        {item.name}
                                    </span>
                                </InteractiveElement>
                            ))}
                            <InteractiveElement>
                                <Button variant="default" size="sm">
                                    예약 / 로그인
                                </Button>
                            </InteractiveElement>
                        </nav>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-gray-600 hover:text-black transition-colors"
                            >
                                <span className="sr-only">메뉴 열기</span>
                                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isOpen && (
                    <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2">
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <Button className="w-full">예약 / 로그인</Button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Hospital Image Overlay on Logo Hover */}
            <AnimatePresence>
                {isLogoHovered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 pointer-events-none"
                    >
                        <Image
                            src="/images/hospital.jpg"
                            alt="Hospital Building"
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-white/50 mix-blend-lighten" />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
