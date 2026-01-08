'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-public';
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Save, Loader2, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [seedLoading, setSeedLoading] = useState(false);

    const { isAdmin, loading: roleLoading } = useAdminRole();
    const router = useRouter();

    useEffect(() => {
        if (!roleLoading && !isAdmin) {
            router.push('/admin');
        }
    }, [roleLoading, isAdmin, router]);

    if (roleLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
    }

    if (!isAdmin) return null;

    // Clinic Info State
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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, 'settings', 'general');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setClinicInfo(docSnap.data() as any);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`요청 시간이 초과되었습니다. (${timeoutMs / 1000}초)`)), timeoutMs)
            )
        ]);
    };

    // Helper to remove undefined values for Firestore
    const sanitizeData = (data: any) => {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined) {
                sanitized[key] = null;
            }
        });
        return sanitized;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Updated to use withTimeout wrapper and sanitize data
            const cleanData = sanitizeData(clinicInfo);
            await withTimeout(setDoc(doc(db, 'settings', 'general'), cleanData));
            setMessage('설정이 저장되었습니다.');
        } catch (error: any) {
            console.error("Error saving settings:", error);
            setMessage(`저장 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}. 잠시 후 다시 시도해주세요.`);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedData = async () => {
        if (!confirm('경고: 테스트용 샘플 데이터가 대량으로 추가됩니다. 계속하시겠습니까?')) return;

        setSeedLoading(true);
        try {
            // 1. Notices
            const notices = [
                { title: '설 연휴 진료 안내', content: '설 연휴 기간 동안 응급실은 24시간 운영합니다...', type: 'notice', isPinned: true },
                { title: '독감 예방 접종 시작', content: '2025-2026 절기 인플루엔자 국가예방접종 지원사업 안내...', type: 'notice', isPinned: false },
                { title: '3내과 신임 과장님 부임', content: '소화기내과 전문의 김명수 과장님이 새로 오셨습니다...', type: 'news', isPinned: false },
                { title: '건강검진 예약 마감 안내', content: '1월 건강검진 예약이 모두 마감되었습니다...', type: 'notice', isPinned: false },
                { title: '주차장 공사 안내', content: '1월 15일부터 20일까지 지하주차장 보수공사가 진행됩니다...', type: 'notice', isPinned: false },
            ];
            for (const n of notices) {
                await addDoc(collection(db, 'notices'), { ...n, createdAt: Timestamp.now(), author: 'Admin' });
            }

            // 2. Staff
            const depts = ['내과', '외과', '정형외과', '소아청소년과', '신경과', '이비인후과'];
            const positions = ['병원장', '진료과장', '전문의'];
            for (let i = 1; i <= 8; i++) {
                await addDoc(collection(db, 'staff'), {
                    name: `의사${i}`,
                    department: depts[i % depts.length],
                    position: positions[i % positions.length],
                    specialties: ['전문진료분야 설명...'],
                    career: ['서울대학교 의과대학 졸업', '삼성서울병원 전문의 수료'],
                    imageUrl: '',
                    order: i
                });
            }

            // 3. Articles (Archives)
            const articles = [
                { title: '당뇨병의 올바른 관리법', type: 'guide', summary: '당뇨병 환자가 꼭 지켜야 할 식습관과 운동법', tags: ['당뇨', '건강관리'], content: '## 당뇨병 관리의 핵심\n\n규칙적인 식사와 운동이 중요합니다...' },
                { title: '고혈압 예방을 위한 10가지 수칙', type: 'guide', summary: '침묵의 살인자 고혈압을 예방하는 생활습관', tags: ['고혈압', '예방'], content: '## 고혈압 예방 수칙\n\n1. 싱겁게 먹기\n2. 적정 체중 유지하기...' },
                { title: '최신 MRI 장비 도입', type: 'news', summary: '더 빠르고 정확한 3.0T MRI 도입', tags: ['장비소개', 'MRI'], content: '## 최첨단 3.0T MRI\n\n우리 병원은 최신형 MRI를 도입하여...' },
                { title: '독감 백신 접종 안내', type: 'news', summary: '올해 독감 백신 접종 일정 및 주의사항', tags: ['독감', '예방접종'], content: '## 독감 예방접종\n\n건강한 겨울을 위해...' },
            ];
            for (const a of articles) {
                await addDoc(collection(db, 'articles'), { ...a, createdAt: Timestamp.now(), author: 'Admin' });
            }

            // 4. Inquiries & Reservations (Generate ~15 items)
            const inquiryTypes = ['reservation', 'inquiry', 'reservation', 'reservation', 'inquiry'];
            const statuses = ['pending', 'confirmed', 'completed', 'pending', 'cancelled'];
            for (let i = 1; i <= 15; i++) {
                const type = inquiryTypes[i % inquiryTypes.length];
                const status = statuses[i % statuses.length];
                await addDoc(collection(db, 'inquiries'), {
                    authorName: `환자${i}`,
                    phone: `010-1234-${1000 + i}`,
                    type: type,
                    content: type === 'reservation' ? '내과 진료 예약 희망합니다.' : '건강검진 비용 문의드립니다.',
                    password: '1234',
                    isSecret: true,
                    status: status,
                    createdAt: Timestamp.now() // Ideally randomly distribute past dates, but now() is fine for dummy
                });
            }

            // 5. Users (Members)
            for (let i = 1; i <= 12; i++) {
                await addDoc(collection(db, 'users'), {
                    email: `user${i}@example.com`,
                    name: `회원${i}`,
                    role: i === 1 ? 'admin' : 'user', // First user is admin
                    createdAt: Timestamp.now(),
                    phone: `010-9876-${1000 + i}`
                });
            }

            // 6. Visits (For Dashboard "Today Visits")
            // Generate some visits for TODAY
            const today = new Date();
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            for (let i = 0; i < 24; i++) {
                // Random time today
                const visitTime = new Date(startOfToday.getTime() + Math.random() * (today.getTime() - startOfToday.getTime()));
                await addDoc(collection(db, 'visits'), {
                    visitorName: `방문자${i}`,
                    purpose: 'general',
                    visitDate: Timestamp.fromDate(visitTime),
                    createdAt: Timestamp.fromDate(visitTime)
                });
            }

            alert('샘플 데이터 생성이 완료되었습니다!');
        } catch (error) {
            console.error("Error seeding data:", error);
            alert('데이터 생성 중 오류가 발생했습니다: ' + error);
        } finally {
            setSeedLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">병원 환경 설정</h1>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Clinic Info Form */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Save className="h-5 w-5 text-blue-600" />
                        병원 기본 정보
                    </h2>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">병원명</label>
                            <input
                                type="text"
                                value={clinicInfo.name}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                                className="w-full rounded-md border p-2 dark:bg-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">대표 전화</label>
                            <input
                                type="text"
                                value={clinicInfo.phone}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                                className="w-full rounded-md border p-2 dark:bg-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">주소</label>
                            <input
                                type="text"
                                value={clinicInfo.address}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                                className="w-full rounded-md border p-2 dark:bg-slate-700"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">대표자명</label>
                                <input
                                    type="text"
                                    value={clinicInfo.representative}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, representative: e.target.value })}
                                    className="w-full rounded-md border p-2 dark:bg-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">사업자번호</label>
                                <input
                                    type="text"
                                    value={clinicInfo.businessNumber}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, businessNumber: e.target.value })}
                                    className="w-full rounded-md border p-2 dark:bg-slate-700"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">점심시간</label>
                            <input
                                type="text"
                                value={clinicInfo.lunchTime}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, lunchTime: e.target.value })}
                                className="w-full rounded-md border p-2 dark:bg-slate-700"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">평일 진료시간</label>
                                <input
                                    type="text"
                                    value={clinicInfo.weekdayHours || ''}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, weekdayHours: e.target.value })}
                                    className="w-full rounded-md border p-2 dark:bg-slate-700"
                                    placeholder="예: 09:00 - 18:00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">토요일 진료시간</label>
                                <input
                                    type="text"
                                    value={clinicInfo.saturdayHours || ''}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, saturdayHours: e.target.value })}
                                    className="w-full rounded-md border p-2 dark:bg-slate-700"
                                    placeholder="예: 09:00 - 13:00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">휴진 안내 (일요일/공휴일 등)</label>
                            <input
                                type="text"
                                value={clinicInfo.holidayInfo || ''}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, holidayInfo: e.target.value })}
                                className="w-full rounded-md border p-2 dark:bg-slate-700"
                                placeholder="예: 일요일/공휴일 휴무"
                            />
                        </div>

                        {message && (
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : '저장하기'}
                        </button>
                    </form>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Database className="h-5 w-5 text-orange-600" />
                        데이터 관리
                    </h2>

                    <div className="space-y-6">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-md border border-orange-100 dark:border-orange-800">
                            <h3 className="font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                샘플 데이터 생성
                            </h3>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                                공지사항, 의료진, 자료실, 예약 문의 등의 테스트용 데이터를 자동으로 생성합니다.
                                <br />홈페이지가 비어 보일 때 사용하세요.
                            </p>
                            <button
                                onClick={handleSeedData}
                                disabled={seedLoading}
                                className="w-full bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex justify-center items-center"
                            >
                                {seedLoading ? <Loader2 className="animate-spin h-5 w-5" /> : '샘플 데이터 생성하기'}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}
