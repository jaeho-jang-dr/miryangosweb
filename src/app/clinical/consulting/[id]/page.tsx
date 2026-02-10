'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Visit, MedicalOrder } from '@/types/clinical';
import { Loader2, Mic, ArrowLeft, Save, Square, Play, Pause, ChevronDown, CheckCircle, Search, X, Stethoscope, ClipboardList, Activity, Pill, Trash2, Plus } from 'lucide-react';

import { RADIOLOGY_LIST, LAB_LIST, PRESCRIPTION_CATEGORIES, PRESCRIPTION_LIST, PrescriptionItem, PHYSICAL_THERAPY_LIST, PHYSICAL_THERAPY_BUNDLES, TEST_GROUPS, PROCEDURE_GROUPS, MEDICATION_GROUPS, PT_GROUPS, SURGICAL_GROUPS } from '@/data/clinical-resources';
import { SYMPTOM_EXPRESSIONS, SymptomExpression } from '@/data/symptom-expressions';
import { detectXrayCommand, buildXrayOrderText, XRAY_BODY_PARTS, getBodyPartsByRegion, XrayBodyPart, XrayViewOption, XrayDetectionResult } from '@/data/xray-view-options';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';
import ImageUpload from '@/components/image-upload';
import { determineNextStatus, STATUS_LABELS } from '@/lib/workflow-engine';

import PrescriptionModule from '@/components/clinical/PrescriptionModule';

export default function ConsultingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.id as string;

    // --- STATE DECLARATIONS ---
    const [visit, setVisit] = useState<Visit | null>(null);
    const [medicalOrders, setMedicalOrders] = useState<MedicalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeField, setActiveField] = useState<'cc' | 'test' | 'diagnosis' | 'plan' | null>('plan');

    const [activeOrderGroup, setActiveOrderGroup] = useState<'symptom' | 'diagnosis' | 'test' | 'procedure' | 'medication' | 'pt' | 'surgical'>('test');
    const [activeSubGroupId, setActiveSubGroupId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        cc: '',
        test: '',
        testResult: '',
        diagnosis: '',
        plan: ''
    });
    const [medicalImages, setMedicalImages] = useState<string[]>([]);
    const [detectedOrders, setDetectedOrders] = useState<any[]>([]);

    const [symptomSuggestions, setSymptomSuggestions] = useState<SymptomExpression[]>([]);

    // X-ray View Selection Popup State
    const [xrayPopup, setXrayPopup] = useState<{
        bodyPart: XrayBodyPart;
        side: 'Lt' | 'Rt' | 'Both' | null;
    } | null>(null);

    // KCD Search State
    interface KCDCode { code: string; ko: string; en: string; }
    const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<KCDCode[]>([]);
    const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState('');
    const [isKcdSearchOpen, setIsKcdSearchOpen] = useState(false);
    const [kcdQuery, setKcdQuery] = useState('');
    const [kcdSearchResults, setKcdSearchResults] = useState<KCDCode[]>([]);

    // --- HELPER FUNCTIONS ---

    const addOrder = (type: MedicalOrder['type'], name: string) => {
        const newOrder: MedicalOrder = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            visitId,
            type,
            name,
            status: 'ordered',
            createdAt: Timestamp.now() as any
        };
        setMedicalOrders(prev => [...prev, newOrder]);

        if (type === 'test') {
            setFormData(prev => ({ ...prev, test: (prev.test ? prev.test + '\n' : '') + name }));
        } else {
            setFormData(prev => ({ ...prev, plan: (prev.plan ? prev.plan + '\n' : '') + name }));
        }
    };

    const removeOrder = (orderId: string) => {
        setMedicalOrders(prev => prev.filter(o => o.id !== orderId));
    };

    function detectSmartOrders(text: string) {
        const detected: any[] = [];

        // 1. Check Bundles First
        PHYSICAL_THERAPY_BUNDLES.forEach(bundle => {
            if (bundle.keywords.some(k => text.replace(/\s+/g, '').includes(k))) {
                bundle.items.forEach((itemName, idx) => {
                    detected.push({
                        id: `${bundle.id}_${idx}`,
                        text: itemName,
                        type: 'procedure',
                        isBundleItem: true,
                        bundleName: bundle.name
                    });
                });
            }
        });

        // 2. Check Individual Items
        PHYSICAL_THERAPY_LIST.forEach(item => {
            if (item.keywords.some(k => text.includes(k))) {
                if (!detected.some(d => d.text === item.text.split(' ')[0])) {
                    detected.push({ ...item, type: 'procedure' });
                }
            }
        });

        // 3. Radiology
        RADIOLOGY_LIST.forEach(item => {
            if (text.includes(item.text.split(' ')[0])) {
                detected.push({ ...item, type: 'test' });
            }
        });

        if (detected.length > 0) {
            setDetectedOrders(prev => {
                const newOnly = detected.filter(d =>
                    !prev.some(p => p.id === d.id) &&
                    !medicalOrders.some(m => m.name.includes(d.text))
                );
                return [...prev, ...newOnly];
            });
        }
    }

    const handleSave = async (complete: boolean = false) => {
        if (!visitId) {
            alert("환자 정보가 없습니다.");
            return;
        }

        setSaving(true);
        try {
            const docRef = doc(db, 'visits', visitId);
            const updates: any = {
                chiefComplaint: formData.cc,
                testOrder: formData.test,
                testResult: formData.testResult,
                testStatus: formData.testResult.trim() ? 'completed' : (formData.test.trim() ? (visit?.testStatus || 'ordered') : undefined),
                diagnosis: formData.diagnosis,
                treatmentNote: formData.plan,
                orders: medicalOrders,
                images: medicalImages,
                updatedAt: serverTimestamp()
            };

            if (complete) {
                // 워크플로우 엔진이 다음 상태를 자동 결정
                const nextState = determineNextStatus({
                    status: 'consulting',
                    testOrder: formData.test,
                    testResult: formData.testResult,
                    testStatus: formData.testResult.trim() ? 'completed' : visit?.testStatus,
                    treatmentNote: formData.plan,
                    diagnosis: formData.diagnosis,
                });

                if (nextState) {
                    updates.status = nextState.status;
                    updates.statusChangedAt = serverTimestamp();
                } else {
                    // 오더가 없으면 기본적으로 치료실로
                    updates.status = 'treatment';
                    updates.statusChangedAt = serverTimestamp();
                }
            }

            await updateDoc(docRef, updates);

            if (complete) {
                const destLabel = updates.status === 'testing' ? '검사실' :
                    updates.status === 'treatment' ? '치료실' : STATUS_LABELS[updates.status as keyof typeof STATUS_LABELS];
                alert(`${destLabel}로 이동되었습니다.`);
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

    // --- HOOKS ---

    // STT Hook
    const { isListening, interimTranscript, toggle, isSupported } = useVoiceDictation({
        onFinalResult: (text) => {
            // Check for X-ray voice commands first
            const xrayResult = detectXrayCommand(text);
            if (xrayResult) {
                setXrayPopup({
                    bodyPart: xrayResult.bodyPart,
                    side: xrayResult.side,
                });
                return; // Don't append raw X-ray command text to field
            }

            if (activeField) {
                setFormData(prev => ({
                    ...prev,
                    [activeField]: (prev[activeField] || '') + ' ' + text
                }));
                detectSmartOrders(text);
            }
        }
    });

    // --- EFFECTS ---

    // 1. Initial Data Fetch
    useEffect(() => {
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
                    setMedicalOrders(data.orders || []);
                    setMedicalImages(data.images || []);

                    if (data.status === 'reception') {
                        await updateDoc(docRef, {
                            status: 'consulting',
                            statusChangedAt: serverTimestamp(),
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

        if (visitId) fetchVisit();
    }, [visitId, router]); // dependency added for router

    // 2. KCD Search (Modal)
    useEffect(() => {
        const search = async () => {
            if (!diagnosisSearchQuery || diagnosisSearchQuery.length < 2) {
                setDiagnosisSuggestions([]);
                return;
            }
            try {
                const res = await fetch(`/api/clinical/diagnosis/search?q=${encodeURIComponent(diagnosisSearchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setDiagnosisSuggestions(data.slice(0, 5));
                }
            } catch (e) {
                console.error("KCD Search Error", e);
            }
        };
        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [diagnosisSearchQuery]);

    // 3. KCD Search (Assistant Panel)
    useEffect(() => {
        const search = async () => {
            const query = (activeOrderGroup === 'diagnosis' ? formData.diagnosis : kcdQuery).split('\n').pop() || '';
            const cleanQuery = query.trim();

            if (!cleanQuery) {
                setKcdSearchResults([]);
                return;
            }
            try {
                const res = await fetch(`/api/clinical/diagnosis/search?q=${encodeURIComponent(cleanQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setKcdSearchResults(data);
                }
            } catch (e) {
                console.error("KCD Search Error", e);
            }
        };
        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [formData.diagnosis, kcdQuery, activeOrderGroup]);

    if (loading) return <div className="p-20 text-center">Loading...</div>;
    if (!visit) return null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col max-w-7xl mx-auto">
            {/* Top Bar */}
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
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-sm font-medium text-slate-700">
                            {isListening ? 'Listening...' : '마이크 대기'}
                        </span>
                    </div>

                    <button
                        onClick={() => toggle()}
                        className={`p-3 rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                    >
                        {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    <button
                        onClick={() => router.push(`/clinical/voice-chart?visitId=${visitId}&patientName=${encodeURIComponent(visit.patientName)}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-white font-medium shadow-md"
                    >
                        <Mic className="w-4 h-4" /> 음성진료
                    </button>

                    <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                        <Save className="w-4 h-4" /> 저장
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 text-white font-bold shadow-md">
                        <CheckCircle className="w-4 h-4" />
                        {formData.test.trim() && !formData.testResult.trim() && visit?.testStatus !== 'completed'
                            ? '검사실로 보내기'
                            : '치료실로 보내기'}
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden flex bg-slate-50">
                {/* Left Column: History */}
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
                        <div className="text-center text-slate-400 text-sm mt-10">기록 없음</div>
                    </div>
                </div>

                {/* Center Column: Charting */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    {/* Live Transcript */}
                    {isListening && interimTranscript && (
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-lg">{interimTranscript}</p>
                        </div>
                    )}

                    {/* Smart Order Suggestions Notification */}
                    {detectedOrders.length > 0 && (
                        <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-3">
                                <Activity className="w-6 h-6" />
                                <div>
                                    <p className="font-bold">음성에서 {detectedOrders.length}개의 오더를 감지했습니다.</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {detectedOrders.map(o => (
                                            <span key={o.id} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{o.text}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        detectedOrders.forEach(o => addOrder(o.type, o.text));
                                        setDetectedOrders([]);
                                    }}
                                    className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors"
                                >
                                    모두 추가
                                </button>
                                <button onClick={() => setDetectedOrders([])} className="p-2 hover:bg-white/10 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CC Section */}
                    <div
                        onClick={() => {
                            setActiveField('cc');
                            setActiveOrderGroup('symptom');
                        }}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'cc' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'cc' ? 'text-emerald-700' : 'text-slate-500'}`}>Subjective (C.C / 증상)</label>
                        <textarea
                            value={formData.cc}
                            onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                            placeholder="환자의 증상을 입력하세요..."
                            className="w-full min-h-[100px] text-lg resize-none outline-none placeholder:text-slate-300 bg-transparent"
                        />
                    </div>

                    {/* Test Section */}
                    <div
                        onClick={() => {
                            setActiveField('test');
                            setActiveOrderGroup('test');
                        }}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'test' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'test' ? 'text-emerald-700' : 'text-slate-500'}`}>Objective (검사 / Physical)</label>
                        <textarea
                            value={formData.test}
                            onChange={(e) => setFormData({ ...formData, test: e.target.value })}
                            placeholder="검사 오더..."
                            className="w-full min-h-[60px] text-lg resize-none outline-none bg-transparent"
                        />
                        {medicalOrders.some(o => o.type === 'test') && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-slate-50 rounded-lg">
                                {medicalOrders.filter(o => o.type === 'test').map(order => (
                                    <div key={order.id} className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded text-sm shadow-sm">
                                        <span>{order.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeOrder(order.id); }}><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Diagnosis Section */}
                    <div
                        onClick={() => {
                            setActiveField('diagnosis');
                            setActiveOrderGroup('diagnosis');
                        }}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'diagnosis' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-sm font-bold uppercase tracking-wider ${activeField === 'diagnosis' ? 'text-emerald-700' : 'text-slate-500'}`}>Assessment (진단)</label>
                            <button onClick={(e) => { e.stopPropagation(); setIsKcdSearchOpen(true); }} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1"><Search className="w-3 h-3" /> 상병검색</button>
                        </div>
                        <textarea
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            className="w-full min-h-[80px] text-lg resize-none outline-none bg-transparent"
                        />
                    </div>

                    {/* Plan Section */}
                    <div
                        onClick={() => {
                            setActiveField('plan');
                            // If current group is not a treatment group, switch to default treatment group
                            if (!['procedure', 'medication', 'pt', 'surgical'].includes(activeOrderGroup)) {
                                setActiveOrderGroup('procedure');
                            }
                        }}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text flex-1 ${activeField === 'plan' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'plan' ? 'text-emerald-700' : 'text-slate-500'}`}>Plan (치료 및 처방)</label>
                        <textarea
                            value={formData.plan}
                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            className="w-full h-full min-h-[150px] text-lg resize-none outline-none bg-transparent"
                        />
                        {medicalOrders.some(o => o.type !== 'test') && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-slate-50 rounded-lg">
                                {medicalOrders.filter(o => o.type !== 'test').map(order => (
                                    <div key={order.id} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-sm shadow-sm">
                                        <span className="text-xs font-bold uppercase mr-1 text-blue-400">{order.type.substr(0, 3)}</span>
                                        <span>{order.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeOrder(order.id); }}><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Assistant */}
                <div className="w-[480px] border-l border-slate-200 bg-white hidden xl:flex flex-col shadow-inner">
                    {/* Top Navigation for Groups */}
                    <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => { setActiveOrderGroup('symptom'); setActiveSubGroupId(null); }}
                            className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === 'symptom' ? 'bg-white border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                        >
                            <Activity className="w-5 h-5" />
                            증상
                        </button>
                        <button
                            onClick={() => { setActiveOrderGroup('diagnosis'); setActiveSubGroupId(null); }}
                            className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === 'diagnosis' ? 'bg-white border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                        >
                            <Search className="w-5 h-5" />
                            진단
                        </button>
                        {[
                            { id: 'test', label: '검사', icon: ClipboardList, color: 'text-indigo-600' },
                            { id: 'procedure', label: '특수치료', icon: Activity, color: 'text-rose-600' },
                            { id: 'medication', label: '약물', icon: Pill, color: 'text-blue-600' },
                            { id: 'pt', label: '물리치료', icon: Activity, color: 'text-teal-600' },
                            { id: 'surgical', label: '처치/수술', icon: Stethoscope, color: 'text-slate-700' },
                        ].map(group => (
                            <button
                                key={group.id}
                                onClick={() => {
                                    setActiveOrderGroup(group.id as any);
                                    setActiveSubGroupId(null);
                                }}
                                className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === group.id ? `bg-white border-blue-600 ${group.color}` : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                            >
                                <group.icon className="w-5 h-5" />
                                {group.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Search/Filter Bar for Symptoms & Diagnosis */}
                        {(activeOrderGroup === 'symptom' || activeOrderGroup === 'diagnosis') && (
                            <div className="p-3 border-b border-slate-100 bg-slate-50">
                                <input
                                    type="text"
                                    value={activeOrderGroup === 'symptom' ? formData.cc : formData.diagnosis}
                                    disabled
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600"
                                    placeholder={activeOrderGroup === 'symptom' ? "입력된 증상 기반 추천..." : "입력된 진단명 기반 추천..."}
                                />
                                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                    * 좌측 입력창에 내용을 작성하면 자동으로 필터링됩니다.
                                </p>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden flex">
                            {/* Sub-group Sidebar (Only for standard medical orders) */}
                            {['test', 'procedure', 'medication', 'pt', 'surgical'].includes(activeOrderGroup) && (
                                <div className="w-32 bg-slate-50 border-r border-slate-200 overflow-y-auto">
                                    {(activeOrderGroup === 'test' ? TEST_GROUPS :
                                        activeOrderGroup === 'procedure' ? PROCEDURE_GROUPS :
                                            activeOrderGroup === 'medication' ? MEDICATION_GROUPS :
                                                activeOrderGroup === 'pt' ? PT_GROUPS :
                                                    SURGICAL_GROUPS).map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => setActiveSubGroupId(sub.id)}
                                                            className={`w-full px-3 py-4 text-left text-[11px] font-bold border-b border-slate-100 transition-all ${activeSubGroupId === sub.id ? 'bg-white text-blue-600 border-r-4 border-r-blue-600' : 'text-slate-500 hover:bg-white'}`}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    ))}
                                </div>
                            )}

                            {/* Items Content */}
                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                {/* 1. SYMPTOM VIEW */}
                                {activeOrderGroup === 'symptom' && (
                                    <div className="space-y-4">
                                        {Object.entries(
                                            SYMPTOM_EXPRESSIONS
                                                .filter(s => {
                                                    if (!formData.cc.trim()) return true;
                                                    const search = formData.cc.toLowerCase();
                                                    return s.keywords.some(k => search.includes(k)) ||
                                                        s.expression.includes(search) ||
                                                        s.standardTerm.includes(search);
                                                })
                                                .reduce((acc, curr) => {
                                                    (acc[curr.category] = acc[curr.category] || []).push(curr);
                                                    return acc;
                                                }, {} as Record<string, SymptomExpression[]>)
                                        ).map(([category, items]) => (
                                            <div key={category}>
                                                <h4 className="text-xs font-black text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">{category}</h4>
                                                <div className="space-y-1">
                                                    {items.map((item, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + ' ' : '') + item.expression }))}
                                                            className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg group transition-colors flex justify-between items-start"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">{item.expression}</p>
                                                                <p className="text-xs text-slate-400">{item.standardTerm}</p>
                                                            </div>
                                                            <Plus className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 mt-1" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {SYMPTOM_EXPRESSIONS.length === 0 && (
                                            <div className="text-center text-slate-400 text-sm py-10">
                                                추천 증상이 없습니다.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. DIAGNOSIS (KCD) VIEW */}
                                {activeOrderGroup === 'diagnosis' && (
                                    <div className="space-y-4">
                                        {(() => {
                                            const query = formData.diagnosis.split('\n').pop() || '';
                                            const cleanQuery = query.trim();

                                            return (
                                                <div>
                                                    <div className="mb-4">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase mb-2">검색 결과</h4>
                                                        {kcdSearchResults.length === 0 && cleanQuery && (
                                                            <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
                                                        )}
                                                        {kcdSearchResults.length === 0 && !cleanQuery && (
                                                            <p className="text-sm text-slate-400">진단명을 입력하면 검색됩니다.</p>
                                                        )}
                                                        <div className="space-y-1">
                                                            {kcdSearchResults.map((item) => (
                                                                <button
                                                                    key={item.code}
                                                                    onClick={() => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` }))}
                                                                    className="w-full text-left p-2 hover:bg-purple-50 rounded-lg group transition-colors flex justify-between items-center"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                                        <p className="text-xs text-slate-400">{item.en} <span className="text-purple-400 font-bold ml-1">{item.code}</span></p>
                                                                    </div>
                                                                    <Plus className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* 3. STANDARD ORDER GROUPS */}
                                {['test', 'procedure', 'medication', 'pt', 'surgical'].includes(activeOrderGroup) && (() => {
                                    const currentGroup = (activeOrderGroup === 'test' ? TEST_GROUPS :
                                        activeOrderGroup === 'procedure' ? PROCEDURE_GROUPS :
                                            activeOrderGroup === 'medication' ? MEDICATION_GROUPS :
                                                activeOrderGroup === 'pt' ? PT_GROUPS :
                                                    SURGICAL_GROUPS);
                                    const subGroup = currentGroup.find(g => g.id === (activeSubGroupId || currentGroup[0].id));

                                    // Special: Radiology sub-group shows expanded X-ray body parts
                                    if (activeOrderGroup === 'test' && (subGroup?.id === 'radiology' || (!activeSubGroupId && currentGroup[0]?.id === 'radiology'))) {
                                        const bodyPartsByRegion = getBodyPartsByRegion();
                                        return (
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black text-slate-400 uppercase mb-2">방사선 검사 — 부위를 선택하세요</h4>
                                                {Object.entries(bodyPartsByRegion).map(([region, parts]) => (
                                                    <div key={region}>
                                                        <h5 className="text-[10px] font-bold text-indigo-500 uppercase mb-2 border-b border-indigo-100 pb-1">{region}</h5>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {parts.map(part => (
                                                                <button
                                                                    key={part.id}
                                                                    onClick={() => setXrayPopup({ bodyPart: part, side: null })}
                                                                    className="text-left p-2.5 rounded-lg border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                                                >
                                                                    <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{part.nameKo}</p>
                                                                    <p className="text-[10px] text-slate-400">{part.nameEn}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-slate-400 uppercase mb-4">{subGroup?.label}</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {subGroup?.items.map((item: any) => (
                                                    <div key={item.id} className="group relative bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-500 hover:shadow-md transition-all">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-bold text-slate-700 text-sm">{item.text}</span>
                                                            <button
                                                                onClick={() => addOrder(activeOrderGroup === 'test' ? 'test' : 'procedure', item.text)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Sided Options (Lt/Rt/Both) */}
                                                        {item.subType === 'sided' && (
                                                            <div className="flex gap-1 mt-2">
                                                                {['Lt', 'Rt', 'Both'].map(side => (
                                                                    <button
                                                                        key={side}
                                                                        onClick={() => addOrder(activeOrderGroup === 'test' ? 'test' : 'procedure', `${item.text} (${side})`)}
                                                                        className="flex-1 py-1.5 text-[10px] bg-slate-50 hover:bg-blue-600 hover:text-white rounded border border-slate-100 font-bold transition-all"
                                                                    >
                                                                        {side}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Dosage Options */}
                                                        {item.subType === 'dosage_1_2' && (
                                                            <div className="flex gap-1 mt-2">
                                                                {['0.5A', '1.0A'].map(dose => (
                                                                    <button
                                                                        key={dose}
                                                                        onClick={() => addOrder('medication', `${item.text} (${dose})`)}
                                                                        className="flex-1 py-1.5 text-[10px] bg-slate-50 hover:bg-blue-600 hover:text-white rounded border border-slate-100 font-bold transition-all"
                                                                    >
                                                                        {dose}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KCD Modal (Simplified) */}
            {isKcdSearchOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsKcdSearchOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">상병코드 검색</h3>
                            <button onClick={() => setIsKcdSearchOpen(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                placeholder="병명 또는 코드 검색..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500"
                                autoFocus
                                value={kcdQuery}
                                onChange={(e) => setKcdQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* X-ray View Selection Popup */}
            {xrayPopup && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setXrayPopup(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                                        {xrayPopup.bodyPart.nameKo} X-ray
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {xrayPopup.bodyPart.nameEn} — 촬영 옵션을 선택하세요
                                    </p>
                                </div>
                                <button onClick={() => setXrayPopup(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Side Selection (only for sided body parts) */}
                            {xrayPopup.bodyPart.sided && (
                                <div className="flex gap-2 mt-3">
                                    {(['Lt', 'Rt', 'Both'] as const).map(side => (
                                        <button
                                            key={side}
                                            onClick={() => setXrayPopup(prev => prev ? { ...prev, side } : null)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                                                xrayPopup.side === side
                                                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-md'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                                            }`}
                                        >
                                            {side === 'Lt' ? 'Lt (좌)' : side === 'Rt' ? 'Rt (우)' : 'Both (양측)'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* View Options */}
                        <div className="p-4 max-h-[50vh] overflow-y-auto">
                            <div className="space-y-2">
                                {xrayPopup.bodyPart.viewOptions.map(option => {
                                    const sidePrefix = xrayPopup.side && xrayPopup.bodyPart.sided
                                        ? `${xrayPopup.side} `
                                        : '';
                                    const fullText = `${sidePrefix}${xrayPopup.bodyPart.nameEn} ${option.label}`;

                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                if (xrayPopup.bodyPart.sided && !xrayPopup.side) {
                                                    alert('좌/우/양측을 먼저 선택해주세요.');
                                                    return;
                                                }
                                                addOrder('test', fullText);
                                                setXrayPopup(null);
                                            }}
                                            className="w-full text-left p-3 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-700 group-hover:text-indigo-700 text-sm">
                                                    {sidePrefix}{xrayPopup.bodyPart.nameEn} {option.label}
                                                </p>
                                            </div>
                                            <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setXrayPopup(null)}
                                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
