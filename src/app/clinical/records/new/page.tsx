
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, FileText, User, Calendar } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
}

export default function NewRecordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId');

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        cc: '',       // Chief Complaint
        diagnosis: '',
        plan: '',
        template: 'default' // Future use
    });

    useEffect(() => {
        if (patientId) {
            fetchPatient();
        }
    }, [patientId]);

    const fetchPatient = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'patients', patientId as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
            }
        } catch (error) {
            console.error("Error fetching patient for chart:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (tmpl: string) => {
        // Simple template logic for MVP
        if (tmpl === 'cold') {
            setFormData(prev => ({
                ...prev,
                cc: '기침, 콧물, 발열',
                diagnosis: 'J00 급성 비인두염(감기)',
                plan: '약물 처방 3일분, 수분 섭취 권장'
            }));
        } else if (tmpl === 'muscle') {
            setFormData(prev => ({
                ...prev,
                cc: '허리 통증, 움직임 제한',
                diagnosis: 'M54.5 요통',
                plan: '물리치료, 진통소염제 처방'
            }));
        }
        setFormData(prev => ({ ...prev, template: tmpl }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !patient) return;

        setSubmitting(true);
        try {
            // 1. Create Visit Record
            await addDoc(collection(db, 'visits'), {
                patientId: patientId,
                date: serverTimestamp(),
                cc: formData.cc,
                diagnosis: formData.diagnosis,
                plan: formData.plan,
                templateId: formData.template
            });

            // 2. Update Patient's Last Visit
            const patientRef = doc(db, 'patients', patientId);
            await updateDoc(patientRef, {
                lastVisit: serverTimestamp()
            });

            router.push(`/clinical/patients/${patientId}`);
        } catch (error) {
            console.error("Error saving record:", error);
            alert("진료 기록 저장 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></div>;
    if (!patientId) return <div className="p-12 text-center">환자 정보가 선택되지 않았습니다.</div>;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            진료 기록 작성
                        </h1>
                        {patient && (
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                <User className="w-3 h-3" /> {patient.name} ({patient.gender === 'male' ? '남' : '여'} / {patient.birthDate})
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="text-sm border-slate-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                        value={formData.template}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        aria-label="템플릿 선택"
                    >
                        <option value="default">템플릿 선택...</option>
                        <option value="cold">감기/몸살</option>
                        <option value="muscle">근육통/요통</option>
                        <option value="digest">소화불량/위염</option>
                    </select>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium shadow-sm"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        저장 완료
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Charting Area */}
                <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-auto pb-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                C.C (주호소) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.cc}
                                onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="환자가 호소하는 증상을 입력하세요 (예: 두통, 복통)"
                                autoFocus
                            />
                        </div>

                        <div className="mb-4 flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                Diagnosis (진단) <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm bg-slate-50"
                                placeholder="상병명 또는 진단 내용을 입력하세요"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                Plan / Prescription (치료 및 처방)
                            </label>
                            <textarea
                                value={formData.plan}
                                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                className="w-full h-full min-h-[150px] px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm bg-slate-50"
                                placeholder="처방 약물, 주의사항, 다음 내원일 등"
                            />
                        </div>
                    </div>
                </div>

                {/* Reference Area (Past History) - Simple placeholder for MVP */}
                <div className="hidden lg:flex lg:col-span-1 flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> 과거 진료 기록
                        </h3>
                    </div>
                    <div className="flex-1 p-4 overflow-auto text-center text-slate-500 text-sm">
                        <p className="mt-10">이전 기록을 불러오려면<br />상세 페이지를 확인하세요.</p>
                        {/* In a fuller version, we would fetch and list past visits here */}
                    </div>
                </div>
            </div>
        </div>
    );
}
