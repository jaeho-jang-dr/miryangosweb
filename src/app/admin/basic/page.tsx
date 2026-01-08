'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-public';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Loader2, Building, CheckCircle } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useRouter } from 'next/navigation';

export default function AdminBasicInfoPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const { isAdmin, loading: roleLoading } = useAdminRole();
    const router = useRouter();

    // useEffect(() => {
    //     if (!roleLoading && !isAdmin) {
    //         router.push('/admin');
    //     }
    // }, [roleLoading, isAdmin, router]);

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
        // if (isAdmin) fetchSettings();
        fetchSettings(); // Always fetch
    }, [isAdmin]);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const cleanData = { ...clinicInfo };
            Object.keys(cleanData).forEach(key => {
                if ((cleanData as any)[key] === undefined) {
                    (cleanData as any)[key] = null;
                }
            });

            await setDoc(doc(db, 'settings', 'general'), cleanData);
            setMessage('설정이 저장되었습니다.');
        } catch (error: any) {
            console.error("Error saving settings:", error);
            setMessage(`저장 실패: ${error.message || '오류 발생'}`);
        } finally {
            setLoading(false);
        }
    };

    if (roleLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
    }

    // if (!isAdmin) return null;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">기초 자료 관리</h1>
                    <p className="text-slate-500 mt-1">병원 이름, 주소, 진료 시간 등 기본 정보를 설정합니다.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Building className="h-5 w-5 text-blue-600" />
                    병원 정보 입력
                </h2>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">병원명</label>
                            <input
                                type="text"
                                value={clinicInfo.name}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                                className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">대표 전화</label>
                            <input
                                type="text"
                                value={clinicInfo.phone}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                                className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">주소</label>
                            <input
                                type="text"
                                value={clinicInfo.address}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                                className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">대표자명</label>
                            <input
                                type="text"
                                value={clinicInfo.representative}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, representative: e.target.value })}
                                className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">사업자번호</label>
                            <input
                                type="text"
                                value={clinicInfo.businessNumber}
                                onChange={(e) => setClinicInfo({ ...clinicInfo, businessNumber: e.target.value })}
                                className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">진료 시간 설정</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">평일 진료시간</label>
                                <input
                                    type="text"
                                    value={clinicInfo.weekdayHours || ''}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, weekdayHours: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="예: 09:00 - 18:00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">점심시간</label>
                                <input
                                    type="text"
                                    value={clinicInfo.lunchTime}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, lunchTime: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">토요일 진료시간</label>
                                <input
                                    type="text"
                                    value={clinicInfo.saturdayHours || ''}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, saturdayHours: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="예: 09:00 - 13:00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">휴진 안내</label>
                                <input
                                    type="text"
                                    value={clinicInfo.holidayInfo || ''}
                                    onChange={(e) => setClinicInfo({ ...clinicInfo, holidayInfo: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="예: 일요일/공휴일 휴무"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        {message && (
                            <div className="text-sm text-green-600 font-bold flex items-center gap-2 animate-pulse">
                                <CheckCircle className="h-4 w-4" />
                                {message}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>
                                    <Save className="h-5 w-5" />
                                    저장하기
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
