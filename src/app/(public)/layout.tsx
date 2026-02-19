
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, Calendar, Stethoscope } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-public';
import { doc, getDoc } from 'firebase/firestore';
import dynamic from 'next/dynamic';

const Background3D = dynamic(() => import('@/components/ui/Background3D'), { ssr: false });

interface ClinicInfoState {
    name: string;
    phone: string;
    address: string;
    representative: string;
    businessNumber: string;
    lunchTime: string;
    weekdayHours: string;
    saturdayHours: string;
    holidayInfo: string;
}

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Check if user has admin role in Firestore
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    // Auto-grant admin role for drjang00@gmail.com
                    const isAdminEmail = currentUser.email === 'drjang00@gmail.com';

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const hasAdminRole = userData?.role === 'admin';

                        // If admin email but no admin role, update it
                        if (isAdminEmail && !hasAdminRole) {
                            const { setDoc } = await import('firebase/firestore');
                            await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(hasAdminRole);
                        }
                    } else {
                        // Create user document with admin role if admin email
                        if (isAdminEmail) {
                            const { setDoc } = await import('firebase/firestore');
                            await setDoc(userDocRef, {
                                email: currentUser.email,
                                displayName: currentUser.displayName,
                                photoURL: currentUser.photoURL,
                                role: 'admin',
                                createdAt: new Date()
                            });
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(false);
                        }
                    }
                } catch (error) {
                    console.error('Error checking admin role:', error);
                    // Fallback: if it's admin email, grant admin anyway
                    if (currentUser.email === 'drjang00@gmail.com') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const [clinicInfo, setClinicInfo] = useState<ClinicInfoState>({
        name: '밀양정형외과',
        phone: '055-123-4567',
        address: '경상남도 밀양시 시청로 123',
        representative: '홍길동',
        businessNumber: '123-45-67890',
        lunchTime: '13:00 - 14:00',
        weekdayHours: '08:30 - 17:30',
        saturdayHours: '08:30 - 12:30 (1, 3주 휴무)',
        holidayInfo: '일요일, 공휴일 휴무'
    });
    const pathname = usePathname();

    // Fetch Clinic Info on Mount with Real-time Updates
    useEffect(() => {
        let unsubscribe = () => { };

        const fetchSettings = async () => {
            try {
                const { doc, onSnapshot } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase-public');

                const docRef = doc(db, 'settings', 'general');

                // Use onSnapshot for real-time updates
                unsubscribe = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setClinicInfo(docSnap.data() as ClinicInfoState);
                    }
                }, (error) => {
                    console.error("Failed to load clinic settings:", error);
                });
            } catch (error) {
                console.error("Error setting up clinic settings listener:", error);
            }
        };
        fetchSettings();

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex min-h-screen flex-col font-sans relative">
            <Background3D />
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800" role="banner">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex h-16 items-center justify-between">

                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center space-x-2" aria-label={`${clinicInfo.name} 홈페이지로 이동`}>
                                <span className="text-xl font-bold tracking-tighter text-blue-600 dark:text-blue-400">
                                    {clinicInfo.name}
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-8" aria-label="주 내비게이션">
                            <NavLink href="/" label="홈" active={pathname === '/'} />
                            <NavLink href="/about" label="병원소개" active={pathname === '/about'} />
                            <NavLink href="/staff" label="의료진" active={pathname === '/staff'} />
                            <NavLink href="/archives" label="자료실" active={pathname === '/archives'} />
                            <NavLink href="/notices" label="공지사항" active={pathname === '/notices'} />

                            <NavLink href="/inquiry" label="예약/문의" active={pathname === '/inquiry'} />
                        </nav>

                        <div className="hidden md:flex items-center space-x-4">
                            {/* Dev Shortcuts - Only show to admin */}
                            {isAdmin && (
                                <div className="flex items-center gap-1 mr-2">
                                    <Link href="/admin" target="_blank" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="홈페이지 대시보드 (CMS)">
                                        <span className="text-xl">🦄</span>
                                    </Link>
                                    <Link href="/clinical" target="_blank" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300 hover:text-emerald-600" title="환자진료 대시보드 (EMR)">
                                        <Stethoscope className="w-5 h-5" />
                                    </Link>
                                </div>
                            )}

                            {/* Login Status */}
                            <div>
                                {user ? (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("로그아웃 하시겠습니까?")) {
                                                auth.signOut();
                                            }
                                        }}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                        aria-label={`${user.displayName || '회원'}님 로그아웃`}
                                    >
                                        {user.displayName || '회원'}님
                                    </button>
                                ) : (
                                    <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                        로그인
                                    </Link>
                                )}
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                            <div className="flex items-center text-slate-600 dark:text-slate-300">
                                <Phone className="h-4 w-4 mr-2" />
                                <span className="text-sm font-semibold">{clinicInfo.phone}</span>
                            </div>
                            <Link
                                href="/inquiry"
                                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                진료 예약
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 text-slate-600 dark:text-slate-300"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-nav"
                        >
                            {isMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMenuOpen && (
                    <div id="mobile-nav" className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 absolute w-full">
                        <nav className="flex flex-col p-4 space-y-4" aria-label="모바일 내비게이션">
                            <MobileNavLink href="/" label="홈" onClick={closeMenu} />
                            <MobileNavLink href="/about" label="병원소개" onClick={closeMenu} />
                            <MobileNavLink href="/staff" label="의료진" onClick={closeMenu} />
                            <MobileNavLink href="/archives" label="자료실" onClick={closeMenu} />
                            <MobileNavLink href="/notices" label="공지사항" onClick={closeMenu} />
                            <MobileNavLink href="/inquiry" label="예약/문의" onClick={closeMenu} />
                        </nav>
                    </div>
                )}
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800" role="contentinfo">
                <div className="container mx-auto px-4 py-12 md:px-6">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        <div className="space-y-4">
                            <Link href="/admin/login" className="hover:opacity-80 transition-opacity">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{clinicInfo.name}</h4>
                            </Link>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                환자 중심의 진료, 첨단 의료 기술로<br />
                                여러분의 건강을 지킵니다.
                            </p>
                        </div>
                        <div>
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">바로가기</h4>
                            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                                <li><Link href="/staff/profile?view=greeting" className="hover:text-blue-600">인사말</Link></li>
                                <li><Link href="/staff" className="hover:text-blue-600">의료진 소개</Link></li>
                                <li><Link href="/archives" className="hover:text-blue-600">자료실</Link></li>
                                <li><Link href="/notices" className="hover:text-blue-600">병원 소식</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">진료 시간</h4>
                            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                                <li className="flex justify-between"><span>평일</span> <span>{clinicInfo.weekdayHours}</span></li>
                                <li className="flex justify-between"><span>토요일</span> <span>{clinicInfo.saturdayHours}</span></li>
                                <li className="flex justify-between text-red-500"><span>휴진안내</span> <span>{clinicInfo.holidayInfo}</span></li>
                                <li className="text-xs text-slate-400 mt-2">점심시간 {clinicInfo.lunchTime}</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">고객센터</h4>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">{clinicInfo.phone}</div>
                            <p className="text-xs text-slate-500">
                                {clinicInfo.address}<br />
                                대표자: {clinicInfo.representative} | 사업자번호: {clinicInfo.businessNumber}
                            </p>
                        </div>
                    </div>
                    <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} {clinicInfo.name}. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={clsx(
                "text-sm font-medium transition-colors hover:text-blue-600",
                active ? "text-blue-600 font-bold" : "text-slate-600 dark:text-slate-300"
            )}
        >
            {label}
        </Link>
    );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="block text-base font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300"
        >
            {label}
        </Link>
    );
}
