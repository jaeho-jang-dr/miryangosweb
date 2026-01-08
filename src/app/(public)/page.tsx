
'use client';

import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';

export default function LandingPage() {
    const [notices, setNotices] = useState<any[]>([]);
    const [clinicInfo, setClinicInfo] = useState({
        name: '밀양정형외과',
        phone: '055-356-5500',
        address: '경상남도 밀양시 중앙로 451',
        lunchTime: '13:00 - 14:00',
        weekdayHours: '08:30 - 17:30',
        saturdayHours: '08:30 - 12:30 (1, 3주 휴무)',
        holidayInfo: '일요일, 공휴일 휴진'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Settings
                const settingsRef = doc(db, 'settings', 'general');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    setClinicInfo(prev => ({ ...prev, ...settingsSnap.data() }));
                }

                // Fetch Notices
                const q = query(
                    collection(db, 'notices'),
                    where('isVisible', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(3)
                );
                const querySnapshot = await getDocs(q);
                setNotices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error loading data", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center justify-center bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-slate-900/80 z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />

                <div className="container relative z-20 px-4 md:px-6 text-center text-white">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
                        건강한 삶을 위한 <br />
                        <span className="text-blue-400">든든한 파트너</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
                        {clinicInfo.name}은 최신 의료 장비와 전문 의료진이 함께합니다.<br />
                        환자분의 쾌유를 위해 정성을 다하겠습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/inquiry"
                            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all hover:scale-105"
                        >
                            진료 예약하기
                        </Link>
                        <Link
                            href="/staff"
                            className="inline-flex items-center justify-center rounded-full bg-white/10 px-8 py-3 text-base font-semibold text-white border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm"
                        >
                            의료진 소개
                        </Link>
                    </div>
                </div>
            </section>

            {/* Quick Info Grid */}
            <section className="py-0 relative z-30 -mt-16 container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="p-8 flex items-start space-x-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
                        <Clock className="h-8 w-8 text-blue-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">진료 시간</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">평일 {clinicInfo.weekdayHours}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">토요일 {clinicInfo.saturdayHours}</p>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                                <p className="text-xs text-slate-400">점심시간 {clinicInfo.lunchTime}</p>
                                <p className="text-xs text-red-500 mt-1">
                                    {clinicInfo.holidayInfo}{clinicInfo.holidayInfo && !clinicInfo.holidayInfo.includes('휴무') && !clinicInfo.holidayInfo.includes('휴진') && ' 휴진'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 flex items-start space-x-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
                        <Phone className="h-8 w-8 text-blue-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">예약 및 문의</h3>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{clinicInfo.phone}</p>
                            <p className="text-sm text-slate-500">친절하게 상담해 드리겠습니다.</p>
                        </div>
                    </div>
                    <div className="p-8 flex items-start space-x-4 bg-blue-50 dark:bg-blue-900/10">
                        <ShieldCheck className="h-8 w-8 text-blue-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">전문 센터</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">척추센터 / 관절센터 / 도수치료</p>
                            <Link href="/about" className="text-sm font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center">
                                자세히 보기 <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Notices Section */}
            <section className="py-20 bg-white dark:bg-slate-950">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">병원 소식</h2>
                            <p className="text-slate-500">밀양정형외과의 새로운 소식을 알려드립니다.</p>
                        </div>
                        <Link href="/notices" className="text-blue-600 hover:text-blue-500 font-medium hidden sm:inline-flex items-center">
                            전체보기 <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {notices.length > 0 ? notices.map((notice) => (
                            <Link key={notice.id} href={`/notices/${notice.id || ''}`} className="group">
                                <div className="h-full p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900">
                                    <span className="inline-block px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-xs font-semibold text-blue-600 mb-4 border border-slate-100 dark:border-slate-700">NOTICE</span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {notice.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : '날짜 없음'}
                                    </p>
                                    <div className="text-sm text-slate-500 line-clamp-3">
                                        {notice.content || notice.body || '내용 없음'}
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="h-full p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse">
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Location Section */}
            <section className="py-20 bg-slate-50 dark:bg-slate-900">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/2 space-y-6">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                오시는 길
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-300">
                                {clinicInfo.name}는 환자분들의 편안한 방문을 위해<br />
                                넓은 주차 공간과 편리한 교통편을 제공합니다.
                            </p>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <MapPin className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">주소</h3>
                                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                                            {clinicInfo.address}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                        <Phone className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">대표 전화</h3>
                                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                                            {clinicInfo.phone}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2">
                            {/* Google Map Embed */}
                            <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700">
                                <iframe
                                    src="https://maps.google.com/maps?q=경상남도+밀양시+중앙로+451&t=m&z=17&output=embed&iwloc=near"
                                    className="w-full h-full border-0"
                                    loading="lazy"
                                    aria-label="Google Map"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-blue-600 dark:bg-blue-900">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">진료가 필요하신가요?</h2>
                    <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                        간편하게 온라인으로 예약을 신청하거나 문의를 남겨주세요.<br />
                        담당자가 확인 후 신속하게 연락드리겠습니다.
                    </p>
                    <Link
                        href="/inquiry"
                        className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-blue-600 shadow-lg hover:bg-blue-50 transition-colors"
                    >
                        온라인 예약 / 문의하기
                    </Link>
                </div>
            </section>
        </div>
    );
}
