'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Visit } from '@/types/clinical';
import { Loader2, Mic, ArrowLeft, Save, Square, Play, Pause, ChevronDown, CheckCircle, Search, X, Stethoscope, ClipboardList, Activity, Pill } from 'lucide-react';

interface Transcript {
    text: string;
    isFinal: boolean;
}

import { RADIOLOGY_LIST, LAB_LIST, PRESCRIPTION_CATEGORIES, PRESCRIPTION_LIST, PrescriptionItem } from '@/data/clinical-resources';
import { SYMPTOM_EXPRESSIONS, SymptomExpression } from '@/data/symptom-expressions';
import { searchKCD } from '@/lib/kcd-search';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';

// Bundle Definitions


export default function ConsultingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.id as string;

    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeField, setActiveField] = useState<'cc' | 'test' | 'diagnosis' | 'plan' | null>('plan');

    // State for Context-Aware Sidebar
    const [symptomCategory, setSymptomCategory] = useState<string>('Musculoskeletal');
    const [testCategory, setTestCategory] = useState<'Radiology' | 'Lab'>('Radiology');
    const [activePrescriptionCategory, setActivePrescriptionCategory] = useState('nerve_joint');
    const [activeRadiologyOptions, setActiveRadiologyOptions] = useState<Record<string, string[]>>({});

    // State for Symptom Suggestions
    const [symptomSuggestions, setSymptomSuggestions] = useState<SymptomExpression[]>([]);

    // KCD Search State
    interface KCDCode { code: string; ko: string; en: string; }
    const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<KCDCode[]>([]);
    const [isKcdSearchOpen, setIsKcdSearchOpen] = useState(false);
    const [kcdQuery, setKcdQuery] = useState('');

    // STT Hook
    const { isListening, interimTranscript, toggle, isSupported } = useVoiceDictation({
        onFinalResult: (text) => {
            if (activeField) {
                setFormData(prev => ({
                    ...prev,
                    [activeField]: (prev[activeField] || '') + ' ' + text
                }));
            }
        }
    });

    // Form Data
    const [formData, setFormData] = useState({
        cc: '',
        test: '',
        testResult: '', // Result field
        diagnosis: '',
        plan: ''
    });

    useEffect(() => {
        if (visitId) fetchVisit();
    }, [visitId]);

    const fetchVisit = async () => {
        try {
            const docRef = doc(db, 'visits', visitId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setVisit({ ...data, id: snap.id } as Visit);
                setFormData({
                    cc: data.chiefComplaint || '',
                    test: data.testOrder || '',
                    testResult: data.testResult || '',
                    diagnosis: data.diagnosis || '',
                    plan: data.treatmentNote || ''
                });

                if (data.status === 'reception') {
                    await updateDoc(docRef, {
                        status: 'consulting',
                        startedAt: serverTimestamp()
                    });
                }
            } else {
                alert("존재하지 않는 차트입니다.");
                router.push('/clinical/consulting');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (complete: boolean = false) => {
        if (!visitId) {
            alert("환자 정보가 없습니다.");
            return;
        }

        if (complete) {
            // Confirm dialog removed for debugging responsiveness
            // if (!confirm("처치실로 이동하시겠습니까? (상태가 '처치대기'로 변경됩니다)")) return;
        }

        setSaving(true);
        try {
            const docRef = doc(db, 'visits', visitId);
            const updates: any = {
                chiefComplaint: formData.cc,
                testOrder: formData.test,
                testResult: formData.testResult,
                // Auto-complete test if result is entered
                testStatus: formData.testResult.trim() ? 'completed' : (visit?.testStatus || 'ordered'),
                diagnosis: formData.diagnosis,
                treatmentNote: formData.plan,
                updatedAt: serverTimestamp()
            };

            if (complete) {
                updates.status = 'treatment';
            }

            await updateDoc(docRef, updates);

            if (complete) {
                alert("처치실로 이동되었습니다.");
                router.push('/clinical/consulting');
            } else {
                alert("저장되었습니다.");
            }
        } catch (e: any) {
            console.error("Save Error:", e);
            alert(`저장 중 오류가 발생했습니다: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };



    if (loading) return <div className="p-20 text-center">Loading...</div>;
    if (!visit) return null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col max-w-7xl mx-auto">
            {/* Top Bar: Patient Info & Actions */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {visit.patientName}
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {visit.type === 'new' ? '신환' : '재진'}
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500">
                            접수: {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Voice Controls */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-sm font-medium text-slate-700">
                            {isListening ? 'Listening...' : '마이크 대기'}
                        </span>
                    </div>

                    <button
                        onClick={() => toggle()}
                        className={`p-3 rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                        title={isListening ? "기록 중지 (Space)" : "기록 시작 (Space)"}
                    >
                        {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                    >
                        <Save className="w-4 h-4" /> 저장
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 text-white font-bold shadow-md"
                    >
                        <CheckCircle className="w-4 h-4" /> 처치실로 보내기
                    </button>
                </div>
            </div>

            {/* Main Workspace: 3-Column Layout */}
            <div className="flex-1 overflow-hidden flex bg-slate-50">
                {/* 1. History / Profile (Left) */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-2">환자 정보</h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>성별/나이: 생략</p>
                            <p>연락처: 생략</p>
                            <p className="text-red-500 font-bold">특이사항: 페니실린 알러지</p>
                        </div>
                    </div>
                    <div className="p-4 flex-1">
                        <h3 className="font-bold text-slate-700 mb-4">과거 진료 기록</h3>
                        <div className="text-center text-slate-400 text-sm mt-10">
                            기록 없음
                        </div>
                    </div>
                </div>

                {/* 2. Charting Area (Center - Dynamic Inputs) */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 max-w-4xl mx-auto w-full">

                    {/* Live Transcript Feedback */}
                    {isListening && interimTranscript && (
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 mb-4">
                            <p className="text-lg">{interimTranscript}</p>
                        </div>
                    )}

                    {/* Section: CC (Subjective) */}
                    <div
                        onClick={() => setActiveField('cc')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'cc' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'cc' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Subjective (C.C / 증상)
                        </label>
                        <div className="relative">
                            <textarea
                                value={formData.cc}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, cc: value });

                                    // Symptom Search Logic
                                    if (value.trim()) {
                                        // Check the last line for keywords
                                        const lines = value.split('\n');
                                        const lastLine = lines[lines.length - 1].trim();

                                        if (lastLine.length >= 2) {
                                            const matches = SYMPTOM_EXPRESSIONS.filter(item =>
                                                item.expression.includes(lastLine) ||
                                                item.keywords.some(k => lastLine.includes(k))
                                            ).slice(0, 5);
                                            setSymptomSuggestions(matches);
                                        } else {
                                            setSymptomSuggestions([]);
                                        }
                                    } else {
                                        setSymptomSuggestions([]);
                                    }
                                }}
                                placeholder="환자의 증상을 입력하세요..."
                                className="w-full min-h-[100px] text-lg resize-none outline-none placeholder:text-slate-300"
                            />

                            {/* Symptom Suggestions Popup */}
                            {activeField === 'cc' && symptomSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">비슷한 증상 표현을 찾았습니다</span>
                                        <button onClick={() => setSymptomSuggestions([])}><X className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {symptomSuggestions.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Replace the last line or append
                                                    const current = formData.cc;
                                                    const lines = current.split('\n');
                                                    lines.pop(); // Remove partial input (last line)

                                                    const newValue = lines.length > 0
                                                        ? lines.join('\n') + '\n' + item.standardTerm + '\n'
                                                        : item.standardTerm + '\n';

                                                    setFormData({ ...formData, cc: newValue });
                                                    setSymptomSuggestions([]);

                                                    // Refocus textarea if needed (handled by React state update usually)
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <div className="font-bold text-slate-800 text-sm">{item.standardTerm}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">"{item.expression}"</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeField === 'cc' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>

                    {/* Section: Objective (Test) - NEW */}
                    {/* Section: Objective (Test) - NEW */}
                    <div
                        onClick={() => setActiveField('test')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'test' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <label className={`block text-sm font-bold uppercase tracking-wider ${activeField === 'test' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                Objective (검사 / Physical)
                            </label>
                            {visit.testStatus === 'completed' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                    검사결과 도착
                                </span>
                            )}
                        </div>
                        <textarea
                            value={formData.test}
                            onChange={(e) => setFormData({ ...formData, test: e.target.value })}
                            placeholder="필요한 검사 오더를 말씀하세요..."
                            className="w-full min-h-[60px] text-lg resize-none outline-none placeholder:text-slate-300"
                        />

                        {/* Result Entry / Display */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" /> 검사 결과 / 판독 (Result)
                            </label>
                            <textarea
                                value={formData.testResult}
                                onChange={(e) => setFormData({ ...formData, testResult: e.target.value })}
                                placeholder="검사 결과를 이곳에 직접 입력할 수도 있습니다..."
                                className="w-full min-h-[60px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-300 focus:outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {activeField === 'test' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>

                    {/* Section: Diagnosis */}
                    <div
                        onClick={() => setActiveField('diagnosis')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'diagnosis' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-sm font-bold uppercase tracking-wider ${activeField === 'diagnosis' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                Assessment (진단)
                            </label>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsKcdSearchOpen(true); }}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                            >
                                <Search className="w-3 h-3" /> 상병검색 (KCD)
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={formData.diagnosis}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, diagnosis: value });

                                    // KCD Search Logic (Inline)
                                    if (value.trim()) {
                                        const lines = value.split('\n');
                                        const lastLine = lines[lines.length - 1].trim();

                                        if (lastLine.length >= 2) {
                                            const matches = searchKCD(lastLine).slice(0, 5);
                                            setDiagnosisSuggestions(matches);
                                        } else {
                                            setDiagnosisSuggestions([]);
                                        }
                                    } else {
                                        setDiagnosisSuggestions([]);
                                    }
                                }}
                                placeholder="진단명을 말씀하세요..."
                                className="w-full min-h-[80px] text-lg resize-none outline-none placeholder:text-slate-300"
                            />

                            {/* Diagnosis Suggestions Popup */}
                            {activeField === 'diagnosis' && diagnosisSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">추천 진단명 (KCD)</span>
                                        <button onClick={() => setDiagnosisSuggestions([])}><X className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {diagnosisSuggestions.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Replace the last line or append
                                                    const current = formData.diagnosis;
                                                    const lines = current.split('\n');
                                                    lines.pop();

                                                    const formattedDiagnosis = `[${item.code}] ${item.ko}`;
                                                    const newValue = lines.length > 0
                                                        ? lines.join('\n') + '\n' + formattedDiagnosis + '\n'
                                                        : formattedDiagnosis + '\n';

                                                    setFormData({ ...formData, diagnosis: newValue });
                                                    setDiagnosisSuggestions([]);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <div className="font-bold text-slate-800 text-sm">
                                                    <span className="text-emerald-600 mr-2">[{item.code}]</span>
                                                    {item.ko}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{item.en}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeField === 'diagnosis' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>

                    {/* KCD Search Modal */}
                    {isKcdSearchOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsKcdSearchOpen(false)}>
                            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-800">상병코드 검색 (ICD-10/KCD)</h3>
                                    <button onClick={() => setIsKcdSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="병명 또는 코드 검색 (예: 감기, 허리, M54)"
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                            autoFocus
                                            value={kcdQuery}
                                            onChange={(e) => setKcdQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                                        {kcdQuery && searchKCD(kcdQuery).length > 0 ? (
                                            searchKCD(kcdQuery).map((item) => (
                                                <button
                                                    key={item.code}
                                                    onClick={() => {
                                                        const diagnosisText = `[${item.code}] ${item.ko}`;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            diagnosis: prev.diagnosis ? prev.diagnosis + '\n' + diagnosisText : diagnosisText
                                                        }));
                                                        setIsKcdSearchOpen(false);
                                                        setKcdQuery('');
                                                    }}
                                                    className="w-full text-left p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 group"
                                                >
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-mono text-emerald-600 font-bold w-12">{item.code}</span>
                                                        <span className="font-medium text-slate-700 group-hover:text-emerald-700">{item.ko}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 ml-14">{item.en}</div>
                                                </button>
                                            ))
                                        ) : kcdQuery ? (
                                            <div className="text-center py-8 text-slate-400">검색 결과가 없습니다.</div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                검색어를 입력하세요.<br />(예: 감기, 요통, M51)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section: Plan */}
                    <div
                        onClick={() => setActiveField('plan')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text flex-1 ${activeField === 'plan' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'plan' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Plan (치료 및 처방)
                        </label>
                        <textarea
                            value={formData.plan}
                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            placeholder="처방 내용을 말씀하세요..."
                            className="w-full h-full min-h-[150px] text-lg resize-none outline-none placeholder:text-slate-300 bg-transparent"
                        />
                        {activeField === 'plan' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Context-Aware Assistant (Right) */}
                <div className="w-[480px] border-l border-slate-200 bg-slate-50 hidden xl:flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            {activeField === 'cc' && <><Stethoscope className="w-5 h-5 text-emerald-500" /> 주증상 선택</>}
                            {activeField === 'test' && <><ClipboardList className="w-5 h-5 text-indigo-500" /> 검사 오더</>}
                            {activeField === 'diagnosis' && <><Activity className="w-5 h-5 text-rose-500" /> 상병/진단</>}
                            {(!activeField || activeField === 'plan') && <><Pill className="w-5 h-5 text-blue-500" /> 빠른 처방</>}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {/* Dynamic Content Based on Active Field */}

                        {/* 1. SUBJECTIVE -> SYMPTOMS */}
                        {activeField === 'cc' && (
                            <div className="flex flex-col gap-2 h-full">
                                {/* Category Tabs (Scrollable) - Custom Ordered */}
                                {/* Category Tabs (All Visible) */}
                                <div className="flex flex-wrap gap-1.5 pb-2">
                                    {/* Strict Order: Musculoskeletal -> Neurological -> General -> Others */}
                                    {['Musculoskeletal', 'Neurological', 'General', 'Respiratory', 'Digestive', 'Circulatory', 'Skin', 'Eye/Ear', 'Urinary', 'Psychiatric']
                                        .filter(cat => Array.from(new Set(SYMPTOM_EXPRESSIONS.map(s => s.category))).includes(cat as any))
                                        .map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSymptomCategory(cat)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${symptomCategory === cat
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-emerald-200'
                                                    }`}
                                            >
                                                {
                                                    {
                                                        'Musculoskeletal': '근골격계',
                                                        'Neurological': '신경계',
                                                        'General': '전신/대사',
                                                        'Respiratory': '호흡기',
                                                        'Digestive': '소화기',
                                                        'Circulatory': '순환기',
                                                        'Skin': '피부',
                                                        'Eye/Ear': '안/이비후',
                                                        'Urinary': '비뇨기',
                                                        'Psychiatric': '정신/심리'
                                                    }[cat] || cat
                                                }
                                            </button>
                                        ))}
                                </div>

                                {SYMPTOM_EXPRESSIONS.filter(s => s.category === symptomCategory).map((symptom, idx) => (
                                    <div
                                        key={`${symptom.standardTerm}-${idx}`}
                                        className="w-full text-left p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group relative"
                                    >
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + '\n' : '') + symptom.standardTerm }))}
                                        >
                                            <div className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">
                                                {symptom.standardTerm}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                "{symptom.expression}"
                                            </div>
                                        </div>

                                        {/* Side Selection Options for Musculoskeletal items with hasSide */}
                                        {symptom.hasSide && (
                                            <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + '\n' : '') + `${symptom.standardTerm} (Lt)` }));
                                                    }}
                                                    className="flex-1 py-1 text-xs bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded border border-slate-200"
                                                >
                                                    좌(L)
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + '\n' : '') + `${symptom.standardTerm} (Rt)` }));
                                                    }}
                                                    className="flex-1 py-1 text-xs bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded border border-slate-200"
                                                >
                                                    우(R)
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + '\n' : '') + `${symptom.standardTerm} (Bi)` }));
                                                    }}
                                                    className="flex-1 py-1 text-xs bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded border border-slate-200"
                                                >
                                                    양측
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2. OBJECTIVE -> LAB TESTS */}
                        {activeField === 'test' && (
                            <div className="flex flex-col gap-2 h-full">
                                {/* Category Tabs */}
                                <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
                                    <button
                                        onClick={() => setTestCategory('Radiology')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${testCategory === 'Radiology' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <div className="flex items-center gap-1"><span className="text-xs">☢️</span> 영상/초음파</div>
                                    </button>
                                    <button
                                        onClick={() => setTestCategory('Lab')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${testCategory === 'Lab' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <div className="flex items-center gap-1"><span className="text-xs">🩸</span> 혈액/검사</div>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {testCategory === 'Radiology' ? (
                                        RADIOLOGY_LIST.map((item: any) => (
                                            <div key={item.id} className="w-full bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-slate-700 text-sm">{item.text}</span>
                                                    {item.type === 'simple' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const opts = activeRadiologyOptions[item.id] || [];
                                                                let text = item.text + (opts.length > 0 ? ` + ${opts.join(', ')}` : '');
                                                                setFormData(prev => ({ ...prev, test: (prev.test ? prev.test + '\n' : '') + text }));
                                                            }}
                                                            className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100"
                                                        >
                                                            추가
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Sub Options (Multi-select) */}
                                                {item.subOptions && (
                                                    <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                                        {item.subOptions.map((opt: string) => (
                                                            <button
                                                                key={opt}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const current = activeRadiologyOptions[item.id] || [];
                                                                    const newOpts = current.includes(opt)
                                                                        ? current.filter(o => o !== opt)
                                                                        : [...current, opt];
                                                                    setActiveRadiologyOptions(prev => ({ ...prev, [item.id]: newOpts }));
                                                                }}
                                                                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${(activeRadiologyOptions[item.id] || []).includes(opt)
                                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {item.type === 'sided' && (
                                                    <div className="flex gap-2 mt-2">
                                                        {['Lt', 'Rt', 'Both'].map(side => (
                                                            <button
                                                                key={side}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const opts = activeRadiologyOptions[item.id] || [];
                                                                    let text = item.text + (opts.length > 0 ? ` + ${opts.join(', ')}` : '');
                                                                    text += ` (${side})`;
                                                                    setFormData(prev => ({ ...prev, test: (prev.test ? prev.test + '\n' : '') + text }));
                                                                }}
                                                                className="flex-1 py-1 text-xs border border-indigo-100 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 hover:font-bold transition-colors"
                                                            >
                                                                {side}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        LAB_LIST.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setFormData(prev => ({ ...prev, test: (prev.test ? prev.test + '\n' : '') + item.text }))}
                                                className="w-full text-left p-3 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700 hover:text-rose-700 hover:bg-rose-50 flex justify-between items-center"
                                            >
                                                <span>{item.text}</span>
                                                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.category}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. ASSESSMENT -> KCD SEARCH (Existing + Shortcuts) */}
                        {activeField === 'diagnosis' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
                                    <p className="font-bold mb-1">💡 팁</p>
                                    입력란 상단의 '상병코드 검색' 버튼을 눌러 정확한 ICD-10 코드를 입력하세요.
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase">자주 쓰는 진단</p>
                                    <button onClick={() => setIsKcdSearchOpen(true)} className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" /> 검색창 열기
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 4. PLAN -> BUNDLES (Default) */}
                        {/* 4. PLAN -> FAST PRESCRIPTION (REDESIGNED) */}
                        {(!activeField || activeField === 'plan') && (
                            <div className="flex flex-col h-full gap-2">
                                {/* Category Tabs (Grid) */}
                                <div className="grid grid-cols-4 gap-1 mb-2">
                                    {PRESCRIPTION_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActivePrescriptionCategory(cat.id)}
                                            className={`px-1 py-2 text-[11px] font-bold rounded-lg transition-all break-keep leading-tight ${activePrescriptionCategory === cat.id
                                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100'
                                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* List Content */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {PRESCRIPTION_LIST.filter(item => item.category === activePrescriptionCategory).map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-all shadow-sm group"
                                        >
                                            {/* Main Title Button */}
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + item.text }))}
                                                className="text-left w-full font-bold text-slate-700 text-sm group-hover:text-blue-700 mb-2 truncate"
                                            >
                                                {item.text}
                                            </button>

                                            {/* Sub-Actions */}
                                            {item.subType === 'sided' && (
                                                <div className="flex gap-1">
                                                    {['Lt', 'Rt', 'Both'].map(side => (
                                                        <button
                                                            key={side}
                                                            onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + `${item.text} (${side})` }))}
                                                            className="flex-1 py-1 text-xs bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-100 transition-colors"
                                                        >
                                                            {side}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {item.subType === 'dosage_1_2' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + `${item.text} (0.5 amp)` }))}
                                                        className="flex-1 py-1 text-xs bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-100 transition-colors"
                                                    >
                                                        0.5A
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + `${item.text} (1.0 amp)` }))}
                                                        className="flex-1 py-1 text-xs bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-100 transition-colors"
                                                    >
                                                        1.0A
                                                    </button>
                                                </div>
                                            )}

                                            {item.subType === 'dosage_1_2_3' && (
                                                <div className="flex gap-1">
                                                    {[1, 2, 3].map(cnt => (
                                                        <button
                                                            key={cnt}
                                                            onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + `${item.text} (${cnt}ea)` }))}
                                                            className="flex-1 py-1 text-xs bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-100 transition-colors"
                                                        >
                                                            {cnt}개
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {item.subType === 'options' && item.options && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {item.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + `${item.text} (${opt})` }))}
                                                            className="flex-1 py-1 text-xs bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded border border-slate-100 transition-colors min-w-[30px]"
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
