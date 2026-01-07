
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context';
import { Activity, Users, FileText, Settings, LogOut, Search, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

// Using AdminAuth for now as the 'Staff' authentication source.
// In a larger system, this might be a distinct 'ClinicalAuthProvider'.

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

    // If we wanted to sidebar this, we could. 
    // Medical apps often benefit from full density, so a side-nav is good.
    // Let's use a "Medical" theme, perhaps slightly more utilitarian/dense than the CMS.

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans">
            {/* Clinical Sidebar */}
            <aside className="w-20 lg:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col transition-all duration-300">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-700">
                    <Activity className="w-8 h-8 text-emerald-400" />
                    <span className="hidden lg:block ml-3 font-bold text-lg tracking-wide text-emerald-50">EMR System</span>
                </div>

                <nav className="flex-1 py-6 space-y-2 px-3">
                    <ClinicalNavItem href="/clinical" icon={<Activity />} label="진료 대시보드" active={pathname === '/clinical'} />
                    <ClinicalNavItem href="/clinical/patients" icon={<Users />} label="환자 관리" active={pathname.startsWith('/clinical/patients')} />
                    <ClinicalNavItem href="/clinical/records" icon={<FileText />} label="진료 기록" active={pathname.startsWith('/clinical/records')} />
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center justify-center lg:justify-start lg:px-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold ring-2 ring-slate-800">
                            Dr
                        </div>
                        <div className="hidden lg:block ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
                            <p className="text-xs text-slate-500">Medical Staff</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center lg:justify-start lg:px-2 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden lg:block ml-3 text-sm">로그아웃</span>
                    </button>
                    <Link
                        href="/admin"
                        className="mt-2 w-full flex items-center justify-center lg:justify-start lg:px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="hidden lg:block ml-3 text-xs">CMS 이동</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header - Patient Search Global */}
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {getPageTitle(pathname)}
                    </h2>

                    <div className="flex items-center gap-4">
                        {/* Global Search Bar Placeholder */}
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="환자 이름/차트번호 검색 (Alt+K)"
                                className="pl-10 pr-4 py-2 w-80 bg-slate-100 dark:bg-slate-900 border-none rounded-full text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

function ClinicalNavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center justify-center lg:justify-start px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 group",
                active
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
            )}
            title={label}
        >
            <span className={clsx("w-5 h-5", active ? "text-white" : "group-hover:scale-110 transition-transform")}>
                {icon}
            </span>
            <span className="hidden lg:block ml-3 text-sm font-medium">{label}</span>
        </Link>
    );
}

function getPageTitle(pathname: string) {
    if (pathname === '/clinical') return '진료실 대시보드';
    if (pathname.startsWith('/clinical/patients')) return '원무 관리';
    if (pathname.startsWith('/clinical/records')) return '진료 기록실';
    return 'Miryang OS EMR';
}
