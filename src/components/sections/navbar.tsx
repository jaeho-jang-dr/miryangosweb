"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"
import { useLanguage } from "@/lib/language-context"



export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isLogoHovered, setIsLogoHovered] = React.useState(false)
    const { language, toggleLanguage, t } = useLanguage()

    const navItems = [
        { name: t.navbar.menu.intro, href: "#intro" },
        { name: t.navbar.menu.departments, href: "#departments" },
        { name: t.navbar.menu.archive, href: "#archive" },
        { name: t.navbar.menu.location, href: "/location" },
    ]

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
                                    {t.navbar.logoText}<span className="font-bold">{t.navbar.logoSuffix}</span>
                                </span>
                            </InteractiveElement>
                        </div>

                        {/* Admin Link Button - Next to Logo */}
                        <div className="ml-3 relative z-50">
                            <Link
                                href="/admin/settings"
                                className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-2 py-1 transition-colors"
                            >
                                관리자
                            </Link>
                        </div>

                        {/* Language Toggle Button - Next to Logo */}
                        <div className="ml-4 mr-auto md:ml-6">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600"
                                aria-label="Toggle Language"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>{language === 'ko' ? 'En' : '한글'}</span>
                            </button>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-8">
                            {navItems.map((item) => (
                                <InteractiveElement key={item.name} href={item.href}>
                                    <span className="text-sm font-medium text-gray-600 hover:text-blue-600 hover:scale-110 inline-block transition-all duration-200 transform hover:-translate-y-1 hover:drop-shadow-md cursor-pointer">
                                        {item.name}
                                    </span>
                                </InteractiveElement>
                            ))}
                            <InteractiveElement>
                                <Button variant="default" size="sm">
                                    {t.navbar.menu.reservation}
                                </Button>
                            </InteractiveElement>
                        </nav>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-gray-600 hover:text-black transition-colors"
                            >
                                <span className="sr-only">{t.navbar.mobileMenuOpen}</span>
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
                                <Button className="w-full">{t.navbar.menu.reservation}</Button>
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
