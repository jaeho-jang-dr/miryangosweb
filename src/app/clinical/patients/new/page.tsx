
'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function NewPatientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Chart Number Mode State
    const [chartMode, setChartMode] = useState<'auto' | 'manual'>('auto');
    const [manualChartId, setManualChartId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        birthDate: '', // YYYY-MM-DD
        gender: 'male',
        phone: '',
        address: '',
        notes: ''
    });

    // Helper to generate a simple Chart Number (YYYYMMDD-XXXX)
    const generateChartNumber = () => {
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${yyyy}${mm}${dd}-${random}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let chartId = '';

            if (chartMode === 'auto') {
                chartId = generateChartNumber();
            } else {
                // Validate Manual Input
                if (!manualChartId.trim()) {
                    alert("차트 번호를 입력해주세요.");
                    setLoading(false);
                    return;
                }
                chartId = manualChartId.trim();

                // Check for duplicates
                const docRef = doc(db, 'patients', chartId);
                const docSnap = await getDoc(docRef); // Import getDoc needed
                if (docSnap.exists()) {
                    alert("이미 존재하는 차트 번호입니다. 다른 번호를 사용해주세요.");
                    setLoading(false);
                    return;
                }
            }

            await setDoc(doc(db, 'patients', chartId), {
                id: chartId, // Explicitly save ID in the doc as well
                name: formData.name,
                birthDate: formData.birthDate,
                gender: formData.gender,
                phone: formData.phone,
                address: formData.address,
                notes: formData.notes,
                lastVisit: null,
                createdAt: serverTimestamp(),
            });

            // If entry successful, confirm alert not strictly needed since router pushes, but let's just push
            router.push(`/clinical/patients`);
        } catch (error) {
            console.error("Error registering patient:", error);
            alert("환자 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFormatPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        let formatted = raw;
        if (raw.length > 3 && raw.length <= 7) {
            formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
        } else if (raw.length > 7) {
            formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
        }
        setFormData({ ...formData, phone: formatted });
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/clinical/patients"
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <UserPlus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">신규 환자 등록</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-8">

                {/* Chart Number Section (New) */}
                <section className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">차트 번호 설정</h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="chartMode"
                                    value="auto"
                                    checked={chartMode === 'auto'}
                                    onChange={() => setChartMode('auto')}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-slate-700 font-medium">자동 생성 (신규)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="chartMode"
                                    value="manual"
                                    checked={chartMode === 'manual'}
                                    onChange={() => setChartMode('manual')}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-slate-700 font-medium">직접 입력 (구 EMR 번호 유지)</span>
                            </label>
                        </div>

                        {chartMode === 'manual' && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <label className="block text-sm font-medium text-slate-700 mb-1">차트 번호 입력 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={manualChartId}
                                    onChange={(e) => setManualChartId(e.target.value)}
                                    className="w-full max-w-xs px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    placeholder="예: 20231015-001"
                                />
                                <p className="text-xs text-slate-500 mt-1">※ 중복된 번호는 등록할 수 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Basic Info */}
                <section>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">기본 정보</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">이름 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="홍길동"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">성별 <span className="text-red-500">*</span></label>
                            <div className="flex gap-4 p-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={formData.gender === 'male'}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-slate-700">남성</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={formData.gender === 'female'}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-slate-700">여성</span>
                                </label>
                            </div>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">생년월일 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="YYYYMMDD (예: 19800101)"
                                maxLength={8}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">연락처 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.phone}
                                onChange={handleAutoFormatPhone}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="010-0000-0000"
                            />
                        </div>
                    </div>
                </section>

                {/* Additional Info */}
                <section>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">추가 정보</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">주소</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="서울특별시 강남구..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">특이사항_메모</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                placeholder="알레르기, 기저질환 등 참고사항"
                            />
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-6 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mr-4 px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium shadow-sm transition-all hover:translate-y-[-1px]"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        환자 등록 완료
                    </button>
                </div>
            </form>
        </div>
    );
}
