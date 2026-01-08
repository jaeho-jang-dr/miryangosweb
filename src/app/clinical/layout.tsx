'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context';
import { Activity, Users, FileText, Settings, LogOut, Search, ClipboardList, Stethoscope, Syringe, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// Using AdminAuth for now as the 'Staff' authentication source.
export default function ClinicalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthProvider>
            <ClinicalLayoutContent>{children}</ClinicalLayoutContent>
        </AdminAuthProvider>
    );
}

function ClinicalLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAdminAuth();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="relative min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Dynamic Background Elements */}
            <DynamicBackground />

            {/* Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 flex justify-center">
                <nav className="mx-auto flex items-center justify-between gap-2 p-2 bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-full transition-all hover:shadow-md hover:bg-white/80 max-w-5xl w-full">

                    {/* Logo / Brand */}
                    <div className="flex items-center px-4">
                        <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="ml-3 font-semibold text-slate-800 tracking-tight hidden sm:block">Miryang OS</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-1">
                        <NavItem href="/clinical" label="대시보드" active={pathname === '/clinical'} />
                        <NavItem href="/clinical/reception" label="접수/수납" active={pathname.startsWith('/clinical/reception')} />
                        <NavItem href="/clinical/consulting" label="진료실" active={pathname.startsWith('/clinical/consulting')} />
                        <NavItem href="/clinical/treatment" label="치료실" active={pathname.startsWith('/clinical/treatment')} />
                        <NavItem href="/clinical/lab" label="검사실" active={pathname.startsWith('/clinical/lab')} />
                        <NavItem href="/clinical/records" label="기록조회" active={pathname.startsWith('/clinical/records')} />
                    </div>

                    {/* User Profile / Search */}
                    <div className="flex items-center gap-2 px-2">
                        <button aria-label="Search Patients" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors relative group">
                            <Search className="w-5 h-5" />
                            <span className="absolute right-0 top-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                        <div className="relative group">
                            <button className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-100 transition-colors">
                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold ring-2 ring-white">
                                    Dr
                                </div>
                                <span className="text-sm font-medium text-slate-600 hidden lg:block max-w-[100px] truncate">
                                    {user?.email?.split('@')[0]}
                                </span>
                            </button>

                            {/* Dropdown for Profile */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100">
                                <Link href="/admin" className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                                    <Settings className="w-4 h-4 mr-2" />
                                    CMS 관리자
                                </Link>
                                <button onClick={signOut} className="w-full flex items-center px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    로그아웃
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            aria-label="Toggle Menu"
                            className="md:hidden p-2 text-slate-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-x-4 top-24 z-40 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 border border-white/50 md:hidden"
                    >
                        <div className="flex flex-col gap-2">
                            <MobileNavItem href="/clinical" label="대시보드" onClick={() => setIsMobileMenuOpen(false)} active={pathname === '/clinical'} />
                            <MobileNavItem href="/clinical/reception" label="접수/수납" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/reception')} />
                            <MobileNavItem href="/clinical/consulting" label="진료실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/consulting')} />
                            <MobileNavItem href="/clinical/treatment" label="치료실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/treatment')} />
                            <MobileNavItem href="/clinical/lab" label="검사실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/lab')} />
                            <MobileNavItem href="/clinical/records" label="기록조회" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/records')} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout Area */}
            <main className="relative z-10 pt-24 pb-6 px-4 md:px-6 max-w-7xl mx-auto h-screen flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 h-full"
                    >
                        {/* Card container for the page content to sit comfortably on the background */}
                        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg shadow-slate-200/50 h-full overflow-hidden flex flex-col relative">
                            {/* Page Content */}
                            <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link href={href} className="relative px-5 py-2.5 text-sm font-medium transition-colors">
            {active && (
                <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-slate-900 rounded-full shadow-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            <span className={clsx("relative z-10 transition-colors duration-200", active ? "text-white" : "text-slate-500 hover:text-slate-900")}>
                {label}
            </span>
        </Link>
    );
}

function MobileNavItem({ href, label, onClick, active }: { href: string; label: string; onClick: () => void; active: boolean }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={clsx(
                "p-4 rounded-2xl text-center font-medium transition-all",
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
            )}
        >
            {label}
        </Link>
    );
}

function DynamicBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Soft Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/20 blur-3xl animate-blob mix-blend-multiply filter" />
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-3xl animate-blob animation-delay-2000 mix-blend-multiply filter" />
            <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-200/20 blur-3xl animate-blob animation-delay-4000 mix-blend-multiply filter" />

            {/* Grid Pattern Overlay (Optional, very subtle) */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>
    );
}
