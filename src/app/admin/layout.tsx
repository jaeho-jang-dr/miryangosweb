
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context';
import { useAdminRole } from '@/hooks/useAdminRole';
import { LayoutDashboard, Megaphone, Users, Calendar, Settings, LogOut, FileText, User as UserIcon, Stethoscope, MessageSquare, Activity, Building, Hospital } from 'lucide-react';
import clsx from 'clsx';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminAuthProvider>
    );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAdminAuth();
    const { role, loading: roleLoading, isAdmin, isManager } = useAdminRole();
    const pathname = usePathname();

    // Don't show layout on login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6 text-blue-600" />
                        Admin CMS
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Miryang OS Hospital</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {/* Shortcuts */}
                    <div className="flex gap-2 mb-4 px-2">
                        <Link href="/" target="_blank" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-rose-500 hover:text-rose-600 transition-colors" title="홈페이지 바로가기">
                            <Hospital className="w-5 h-5" />
                        </Link>
                        <Link href="/clinical" target="_blank" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors" title="진료실 바로가기">
                            <Stethoscope className="w-5 h-5" />
                        </Link>
                    </div>

                    <NavItem href="/admin" label="대시보드" icon={<LayoutDashboard className="h-4 w-4" />} active={pathname === '/admin'} />
                    <NavItem href="/clinical" label="환자 관리 (진료실)" icon={<Activity className="h-4 w-4" />} active={pathname.startsWith('/clinical')} />
                    <NavItem href="/admin/users" label="회원 관리" icon={<UserIcon className="h-4 w-4" />} active={pathname.startsWith('/admin/users')} />
                    <NavItem href="/admin/notices" label="공지사항 관리" icon={<Megaphone className="h-4 w-4" />} active={pathname.startsWith('/admin/notices')} />
                    <NavItem href="/admin/staff" label="의료진 관리" icon={<Stethoscope className="h-4 w-4" />} active={pathname === '/admin/staff' || pathname === '/admin/staff/new' || (pathname.startsWith('/admin/staff/') && pathname !== '/admin/staff/profile')} />
                    <NavItem href="/admin/staff/profile" label="의료진 프로필" icon={<UserIcon className="h-4 w-4" />} active={pathname === '/admin/staff/profile'} />
                    <NavItem href="/admin/inquiries" label="문의/예약" icon={<MessageSquare className="h-4 w-4" />} active={pathname.startsWith('/admin/inquiries')} />
                    <NavItem href="/admin/reservations" label="예약 현황" icon={<Calendar className="h-4 w-4" />} active={pathname.startsWith('/admin/reservations')} />
                    <NavItem href="/admin/articles" label="자료실 관리" icon={<FileText className="h-4 w-4" />} active={pathname.startsWith('/admin/articles')} />

                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                        <NavItem href="/admin/basic" label="기초 자료 관리" icon={<Building className="h-4 w-4" />} active={pathname.startsWith('/admin/basic')} />
                        <NavItem href="/admin/settings" label="설정" icon={<Settings className="h-4 w-4" />} active={pathname.startsWith('/admin/settings')} />
                    </div>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="mb-4 flex items-center px-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                            {role && role.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.displayName || 'Admin'}</p>
                            <p className="text-xs text-slate-500 truncate w-32">{user?.email}</p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 capitalize mt-0.5">{role || 'Loading...'}</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 md:hidden">
                    <span className="font-bold text-lg">Admin Pannel</span>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
        >
            <span className="mr-3">{icon}</span>
            {label}
        </Link>
    )
}
