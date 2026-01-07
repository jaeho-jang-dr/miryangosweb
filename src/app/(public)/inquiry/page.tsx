
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InquiryPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clinicInfo, setClinicInfo] = useState({
        name: 'Miryang OS Hospital',
        phone: '055-123-4567',
        address: '경상남도 밀양시 시청로 123',
        lunchTime: '13:00 - 14:00',
        weekdayHours: '08:30 - 17:30',
        saturdayHours: '08:30 - 12:30 (1, 3주 휴무)',
        holidayInfo: '일요일, 공휴일'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase-public');
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setClinicInfo(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const [formData, setFormData] = useState({
        type: 'reservation', // reservation | inquiry
        name: '',
        contact: '',
        message: '',
        agreedToPolicy: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.agreedToPolicy) {
            setError('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            await addDoc(collection(db, 'inquiries'), {
                type: formData.type,
                name: formData.name,
                contact: formData.contact,
                message: formData.message,
                status: 'new', // new | confirmed | completed | cancelled
                createdAt: serverTimestamp(),
            });

            setIsSuccess(true);
            setFormData({
                type: 'reservation',
                name: '',
                contact: '',
                message: '',
                agreedToPolicy: false
            });

            // Optional: Redirect after a delay or keep showing success message
        } catch (err) {
            console.error("Error submitting inquiry:", err);
            setError('문의 접수 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">접수가 완료되었습니다.</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                    담당자가 확인 후 빠른 시일 내에 연락드리겠습니다.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    새로운 문의하기
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-20">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">예약 / 문의</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    진료 예약이나 궁금한 점을 남겨주세요.<br />
                    빠르고 친절하게 답변해 드리겠습니다.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Contact Info Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-blue-50 dark:bg-slate-900 p-6 rounded-2xl border border-blue-100 dark:border-slate-800">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">진료 시간</h3>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex justify-between">
                                <span>평일</span>
                                <span className="font-medium text-slate-900 dark:text-slate-200">{clinicInfo.weekdayHours}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>토요일</span>
                                <span className="font-medium text-slate-900 dark:text-slate-200">{clinicInfo.saturdayHours}</span>
                            </div>
                            <div className="pt-2 border-t border-blue-100 dark:border-slate-800 mt-2">
                                <p className="text-xs">점심시간 {clinicInfo.lunchTime}</p>
                                <p className="text-xs text-red-500 mt-1">
                                    {clinicInfo.holidayInfo}{!clinicInfo.holidayInfo.includes('휴무') && !clinicInfo.holidayInfo.includes('휴진') && ' 휴진'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">병원 정보</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">전화문의</p>
                                <p className="text-xl font-bold text-blue-600">{clinicInfo.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">주소</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 break-keep">
                                    {clinicInfo.address}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inquiry Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">문의 유형</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="reservation">진료 예약</option>
                                    <option value="inquiry">일반 문의</option>
                                </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="홍길동"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">연락처</label>
                            <input
                                type="tel"
                                required
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="010-1234-5678"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">내용</label>
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                placeholder="문의하실 내용을 상세히 적어주세요. 예약의 경우 희망 날짜와 시간을 적어주시면 좋습니다."
                            />
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-6">
                            <input
                                type="checkbox"
                                id="policy"
                                checked={formData.agreedToPolicy}
                                onChange={(e) => setFormData({ ...formData, agreedToPolicy: e.target.checked })}
                                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <label htmlFor="policy" className="text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-bold text-slate-900 dark:text-slate-200">[필수] 개인정보 수집 및 이용 동의</span><br />
                                귀하는 개인정보 수집 및 이용에 동의하지 않을 권리가 있으며, 동의를 거부하실 경우 문의 접수가 제한됩니다.<br />
                                수집 항목: 이름, 연락처 / 이용 목적: 문의 상담 및 예약 처리 / 보유 기간: 처리 완료 후 1년
                            </label>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg dark:bg-red-900/20 dark:text-red-400 mb-6">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    처리 중...
                                </>
                            ) : (
                                '문의하기'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
