'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Activity, Settings, LogOut, Search, Menu, X, Hospital, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import WorkflowToastContainer from '@/components/clinical/WorkflowToast';

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
    const { role, loading: roleLoading, isAdmin, isManager, isOperator } = useAdminRole();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // 인증 가드: 임상 스태프(admin/manager/operator)만 접근 허용
    const isClinicalStaff = isAdmin || isManager || isOperator;

    // 워크플로우 엔진: 전체 clinical 영역에서 환자 자동 전환 감시 (로딩 완료 후 권한이 있을 때만 활성화)
    const { toasts, removeToast } = useWorkflowEngine({ enabled: !roleLoading && isClinicalStaff });

    // 세션 타임아웃: 30분 비활동 시 자동 로그아웃 (5분 전 경고)
    const { showWarning, remainingSeconds, dismissWarning } = useSessionTimeout(
        () => signOut(),
        30 * 60 * 1000, // 30분
        5 * 60 * 1000,  // 5분 전 경고
    );

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (roleLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">권한 확인 중...</p>
                </div>
            </div>
        );
    }

    if (user && !isClinicalStaff) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center max-w-md mx-auto p-8">
                    <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한 없음</h2>
                    <p className="text-slate-500 mb-1">임상 시스템은 의료진만 사용할 수 있습니다.</p>
                    <p className="text-sm text-slate-400 mb-6">현재 역할: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{role || 'none'}</span></p>
                    <p className="text-xs text-slate-400 mb-6">관리자에게 admin, manager, 또는 operator 역할을 요청하세요.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={signOut} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors">
                            로그아웃
                        </button>
                        <a href="/admin" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                            관리자 페이지
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Dynamic Background Elements */}
            <DynamicBackground />

            {/* Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 flex justify-center">
                <nav
                    className={clsx(
                        "mx-auto flex items-center justify-between gap-2 p-2 rounded-full transition-all duration-300 max-w-7xl w-full",
                        isScrolled
                            ? "bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm"
                            : "bg-transparent border border-transparent shadow-none"
                    )}
                >

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
                        <NavItem href="/clinical/consulting" label="진료실" active={pathname.startsWith('/clinical/consulting') || pathname.startsWith('/clinical/voice-chart')} />
                        <NavItem href="/clinical/lab" label="검사실" active={pathname.startsWith('/clinical/lab')} />
                        <NavItem href="/clinical/treatment" label="치료실" active={pathname.startsWith('/clinical/treatment')} />
                        <NavItem href="/clinical/records" label="기록조회" active={pathname.startsWith('/clinical/records')} />
                        <div className="flex items-center gap-1 ml-2">
                            <Link href="/" target="_blank" className="relative px-2 py-2 text-rose-500 hover:scale-110 transition-transform" title="홈페이지 바로가기">
                                <Hospital className="w-5 h-5" />
                            </Link>
                            <Link href="/admin" target="_blank" className="relative px-2 py-2 text-xl hover:scale-110 transition-transform" title="CMS 대시보드 바로가기">
                                🦄
                            </Link>
                            <a href={process.env.NEXT_PUBLIC_EMR_URL || 'https://miryangosemr.web.app'} target="_blank" rel="noopener noreferrer" className="relative px-2 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors" title="EMR 앱 바로가기">
                                EMR
                            </a>
                        </div>
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
                            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="clinical-mobile-menu"
                            className="md:hidden p-2 text-slate-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                        </button>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        id="clinical-mobile-menu"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-x-4 top-24 z-40 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 border border-white/50 md:hidden"
                        role="navigation"
                        aria-label="진료 시스템 모바일 내비게이션"
                    >
                        <div className="flex flex-col gap-2">
                            <MobileNavItem href="/clinical" label="대시보드" onClick={() => setIsMobileMenuOpen(false)} active={pathname === '/clinical'} />
                            <MobileNavItem href="/clinical/reception" label="접수/수납" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/reception')} />
                            <MobileNavItem href="/clinical/consulting" label="진료실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/consulting') || pathname.startsWith('/clinical/voice-chart')} />
                            <MobileNavItem href="/clinical/lab" label="검사실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/lab')} />
                            <MobileNavItem href="/clinical/treatment" label="치료실" onClick={() => setIsMobileMenuOpen(false)} active={pathname.startsWith('/clinical/treatment')} />
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

            {/* 세션 타임아웃 경고 */}
            {showWarning && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">세션 만료 예정</h3>
                        <p className="text-slate-500 text-sm mb-1">보안을 위해 {Math.floor(remainingSeconds / 60)}분 {remainingSeconds % 60}초 후 자동 로그아웃됩니다.</p>
                        <p className="text-xs text-slate-400 mb-6">의료법 제23조 — 비활동 세션 보호</p>
                        <button
                            onClick={dismissWarning}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                        >
                            계속 사용
                        </button>
                    </div>
                </div>
            )}

            {/* 워크플로우 자동 전환 알림 */}
            <WorkflowToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link href={href} className="relative px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap">
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
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Soft Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/20 blur-3xl animate-blob mix-blend-multiply filter" />
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-3xl animate-blob animation-delay-2000 mix-blend-multiply filter" />
            <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-200/20 blur-3xl animate-blob animation-delay-4000 mix-blend-multiply filter" />
            {/* 외부 CDN URL 의존성 제거: 노이즈 효과는 CSS로 대체 */}
        </div>
    );
}
