
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const [clinicInfo, setClinicInfo] = useState({
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
                        setClinicInfo(docSnap.data() as any);
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
        <div className="flex min-h-screen flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex h-16 items-center justify-between">

                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center space-x-2">
                                <span className="text-xl font-bold tracking-tighter text-blue-600 dark:text-blue-400">
                                    {clinicInfo.name}
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-8">
                            <NavLink href="/" label="홈" active={pathname === '/'} />
                            <NavLink href="/about" label="병원소개" active={pathname === '/about'} />
                            <NavLink href="/staff" label="의료진" active={pathname === '/staff'} />
                            <NavLink href="/archives" label="자료실" active={pathname === '/archives'} />
                            <NavLink href="/notices" label="공지사항" active={pathname === '/notices'} />
                            <NavLink href="/inquiry" label="예약/문의" active={pathname === '/inquiry'} />
                        </nav>

                        <div className="hidden md:flex items-center space-x-4">
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
                        >
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 absolute w-full">
                        <nav className="flex flex-col p-4 space-y-4">
                            <MobileNavLink href="/" label="홈" onClick={() => setIsMenuOpen(false)} />
                            <MobileNavLink href="/about" label="병원소개" onClick={() => setIsMenuOpen(false)} />
                            <MobileNavLink href="/staff" label="의료진" onClick={() => setIsMenuOpen(false)} />
                            <MobileNavLink href="/archives" label="자료실" onClick={() => setIsMenuOpen(false)} />
                            <MobileNavLink href="/notices" label="공지사항" onClick={() => setIsMenuOpen(false)} />
                            <MobileNavLink href="/inquiry" label="예약/문의" onClick={() => setIsMenuOpen(false)} />
                        </nav>
                    </div>
                )}
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
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
                                <li><Link href="/about" className="hover:text-blue-600">인사말</Link></li>
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
