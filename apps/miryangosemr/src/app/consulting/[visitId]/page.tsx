'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, Timestamp, query, where, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit, MedicalOrder, Patient, ChartVersion } from '@shared/types/clinical';
import { getAuth } from 'firebase/auth';
import { Mic, ArrowLeft, Save, Square, CheckCircle, Search, X, Stethoscope, ClipboardList, Activity, Pill, Plus, UserPlus, History, Clock } from 'lucide-react';

import { RADIOLOGY_LIST, LAB_LIST, PRESCRIPTION_CATEGORIES, PRESCRIPTION_LIST, PrescriptionItem, PHYSICAL_THERAPY_LIST, PHYSICAL_THERAPY_BUNDLES, TEST_GROUPS, PROCEDURE_GROUPS, MEDICATION_GROUPS, PT_GROUPS, SURGICAL_GROUPS, SYMPTOMS } from '@shared/data/clinical-resources';
import { SYMPTOM_EXPRESSIONS, SymptomExpression } from '@shared/data/symptom-expressions';
import { detectXrayCommand, buildXrayOrderText, XRAY_BODY_PARTS, getBodyPartsByRegion, XrayBodyPart, XrayViewOption, XrayDetectionResult } from '@shared/data/xray-view-options';
import { useVoiceDictation } from '@shared/hooks/useVoiceDictation';
import ImageUpload from '@shared/components/image-upload';
import { determineNextStatus, STATUS_LABELS } from '@shared/lib/workflow-engine';
import { logAudit } from '@shared/lib/audit-client';
import { signVisit } from '@shared/lib/signature-client';

import dynamic from 'next/dynamic';
import EMRLayout from '@/components/layout/EMRLayout';

// Dynamic imports for heavy components (3.6 optimization)
const PrescriptionModule = dynamic(() => import('@/components/clinical/PrescriptionModule'), { ssr: false });
const ConfirmCompleteModal = dynamic(() => import('@/components/clinical/ConfirmCompleteModal'), { ssr: false });

interface DetectedOrder {
    id: string;
    text: string;
    type: MedicalOrder['type'];
    isBundleItem?: boolean;
    bundleName?: string;
}

interface OrderGroupItem {
    id: string;
    text: string;
    type?: string;
    subType?: 'sided' | 'dosage_1_2';
}

export default function ConsultingDetailPage() {
    return (
        <EMRLayout>
            <ConsultingDetailPageContent />
        </EMRLayout>
    );
}

function ConsultingDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.visitId as string;

    // --- STATE DECLARATIONS ---
    const [visit, setVisit] = useState<Visit | null>(null);
    const [medicalOrders, setMedicalOrders] = useState<MedicalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeField, setActiveField] = useState<'cc' | 'pe' | 'test' | 'diagnosis' | 'plan' | null>('plan');

    const [activeOrderGroup, setActiveOrderGroup] = useState<'symptom' | 'physical_exam' | 'diagnosis' | 'test' | 'procedure' | 'medication' | 'pt' | 'surgical'>('test');
    const [selectedPEFindings, setSelectedPEFindings] = useState<string[]>([]);
    const [activeSubGroupId, setActiveSubGroupId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        cc: '',
        pe: '',
        test: '',
        testResult: '',
        diagnosis: '',
        plan: ''
    });
    const [medicalImages, setMedicalImages] = useState<string[]>([]);
    const [detectedOrders, setDetectedOrders] = useState<DetectedOrder[]>([]);

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

    // Context-based Diagnosis Suggestions
    interface ContextSuggestion { code: string; ko: string; en: string; confidence: number; source: string; reason: string; }
    interface GroupedSuggestions { symptomBased: ContextSuggestion[]; peBased: ContextSuggestion[]; testBased: ContextSuggestion[]; }
    const [contextSuggestions, setContextSuggestions] = useState<GroupedSuggestions>({ symptomBased: [], peBased: [], testBased: [] });

    // Patient Info & Past Visits (1.1)
    const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
    const [pastVisits, setPastVisits] = useState<Visit[]>([]);

    // Confirm Complete Modal (1.3)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingNextStatus, setPendingNextStatus] = useState<string>('completed');

    // Chart Version History (1.5)
    const [chartVersions, setChartVersions] = useState<ChartVersion[]>([]);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // Toast messages (replacing alert)
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // --- HELPER FUNCTIONS ---

    const addOrder = (type: MedicalOrder['type'], name: string) => {
        const newOrder: MedicalOrder = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            visitId,
            type,
            name,
            status: 'ordered',
            createdAt: Timestamp.now()
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
        const detected: DetectedOrder[] = [];

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

        PHYSICAL_THERAPY_LIST.forEach(item => {
            if (item.keywords.some(k => text.includes(k))) {
                if (!detected.some(d => d.text === item.text.split(' ')[0])) {
                    detected.push({ ...item, type: 'procedure' });
                }
            }
        });

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

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }, []);

    // Save chart version snapshot (1.5)
    const saveChartVersion = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            await addDoc(collection(db, 'visits', visitId, 'versions'), {
                visitId,
                savedBy: user?.uid || 'unknown',
                savedByName: user?.displayName || user?.email || 'unknown',
                savedAt: serverTimestamp(),
                snapshot: {
                    chiefComplaint: formData.cc,
                    physicalExam: formData.pe,
                    testOrder: formData.test,
                    testResult: formData.testResult,
                    diagnosis: formData.diagnosis,
                    treatmentNote: formData.plan,
                    orders: medicalOrders,
                    images: medicalImages,
                },
            });
        } catch (e) {
            console.warn('[ChartVersion] Failed to save version:', e);
        }
    };

    // Determine next status for complete action
    const getNextStatus = () => {
        const nextState = determineNextStatus({
            status: 'consulting',
            testOrder: formData.test,
            testResult: formData.testResult,
            testStatus: formData.testResult.trim() ? 'completed' : visit?.testStatus,
            treatmentNote: formData.plan,
            diagnosis: formData.diagnosis,
        });
        return nextState ? nextState.status : 'completed';
    };

    // Show confirm modal instead of saving directly (1.3)
    const handleCompleteClick = () => {
        const nextStatus = getNextStatus();
        setPendingNextStatus(nextStatus);
        setShowConfirmModal(true);
    };

    const handleSave = async (complete: boolean = false) => {
        if (!visitId) {
            showToast('환자 정보가 없습니다.');
            return;
        }

        setSaving(true);
        try {
            const docRef = doc(db, 'visits', visitId);
            const updates: Record<string, unknown> = {
                chiefComplaint: formData.cc,
                physicalExam: formData.pe,
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
                updates.status = pendingNextStatus;
                updates.statusChangedAt = serverTimestamp();
            }

            await updateDoc(docRef, updates);

            // Save chart version snapshot (1.5)
            await saveChartVersion();

            logAudit({
                action: complete ? 'status_change' : 'update',
                collection: 'visits',
                documentId: visitId,
                after: updates as Record<string, unknown>,
                description: complete ? `진료 완료 → ${updates.status}` : '차트 저장',
            });

            if (complete) {
                signVisit(visitId).then(result => {
                    if (!result.signed) console.warn('[전자서명] 서명 실패:', result.error);
                });

                setShowConfirmModal(false);
                const destLabel = updates.status === 'testing' ? '검사실' :
                    updates.status === 'treatment' ? '치료실' : STATUS_LABELS[updates.status as keyof typeof STATUS_LABELS];
                showToast(`${destLabel}로 이동되었습니다.`);
                setTimeout(() => router.push('/consulting'), 500);
            } else {
                showToast('저장되었습니다.');
            }
        } catch (e: unknown) {
            console.error("Save Error:", e);
            showToast(`저장 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAddInitialVisit = async () => {
        if (!visit) return;
        if (!confirm('새 부위에 대한 초진을 추가하시겠습니까?\n현재 차트를 자동 저장 후 새 초진 차트를 생성합니다.')) return;

        try {
            await handleSave(false);

            const newVisitRef = await addDoc(collection(db, 'visits'), {
                patientId: visit.patientId,
                patientName: visit.patientName,
                status: 'consulting',
                type: 'new' as const,
                parentVisitId: visitId,
                date: serverTimestamp(),
                statusChangedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            logAudit({
                action: 'create',
                collection: 'visits',
                documentId: newVisitRef.id,
                after: { patientId: visit.patientId, patientName: visit.patientName, type: 'new', parentVisitId: visitId },
                description: '초진추가 생성',
            });
            router.push(`/consulting/${newVisitRef.id}`);
        } catch (e) {
            console.error('초진추가 오류:', e);
            alert('초진 추가 중 오류가 발생했습니다.');
        }
    };

    // --- HOOKS ---

    const { isListening, interimTranscript, toggle, isSupported } = useVoiceDictation({
        onFinalResult: (text) => {
            const xrayResult = detectXrayCommand(text);
            if (xrayResult) {
                setXrayPopup({
                    bodyPart: xrayResult.bodyPart,
                    side: xrayResult.side,
                });
                return;
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

    // --- MEMOIZED VALUES ---
    const filteredSymptomsByCategory = useMemo(() => {
        return SYMPTOM_EXPRESSIONS
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
            }, {} as Record<string, SymptomExpression[]>);
    }, [formData.cc]);

    // --- EFFECTS ---

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
                        pe: data.physicalExam || '',
                        test: data.testOrder || '',
                        testResult: data.testResult || '',
                        diagnosis: data.diagnosis || '',
                        plan: data.treatmentNote || ''
                    });
                    setMedicalOrders(data.orders || []);
                    setMedicalImages(data.images || []);

                    if (data.physicalExam) {
                        const peItems = (data.physicalExam as string).split(',').map((s: string) => s.trim()).filter(Boolean);
                        const PE_LABEL_MAP: Record<string, string> = {
                            '압통': '압통 (Tenderness)', '부종': '부종 (Swelling)', '관절변형': '관절변형 (Deformity)',
                            '관절운동제한': '관절운동제한 (ROM limitation)', '근경직': '근경직 (Muscle Spasm)',
                            '근력약화': '근력약화 (Muscle Weakness)', '근위축': '근위축 (Muscle Atrophy)',
                            '염발음': '염발음 (Crepitus)', '발적': '발적 (Redness)', '열감': '열감 (Warmth)',
                            '반상출혈': '반상출혈 (Ecchymosis)', '함요부종': '함요부종 (Pitting Edema)',
                            '감각이상': '감각이상 (Sensory Change)', '저림': '저림 (Numbness)',
                            '반사이상': '반사이상 (Reflex Change)', '보행이상': '보행이상 (Gait Abnormality)',
                        };
                        const restored = peItems.map((item: string) => PE_LABEL_MAP[item] || '').filter(Boolean);
                        if (restored.length > 0) setSelectedPEFindings(restored);
                    }

                    if (data.status === 'reception') {
                        await updateDoc(docRef, {
                            status: 'consulting',
                            statusChangedAt: serverTimestamp(),
                            startedAt: serverTimestamp()
                        });
                    }
                } else {
                    alert("존재하지 않는 차트입니다.");
                    router.push('/consulting');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (visitId) fetchVisit();
    }, [visitId, router]);

    // Fetch patient info (1.1)
    useEffect(() => {
        if (!visit?.patientId) return;
        const fetchPatient = async () => {
            try {
                const snap = await getDoc(doc(db, 'patients', visit.patientId));
                if (snap.exists()) {
                    setPatientInfo({ ...snap.data(), id: snap.id } as Patient);
                }
            } catch (e) { console.warn('Patient fetch error:', e); }
        };
        fetchPatient();
    }, [visit?.patientId]);

    // Subscribe to past visits (1.1)
    useEffect(() => {
        if (!visit?.patientId) return;
        const q = query(
            collection(db, 'visits'),
            where('patientId', '==', visit.patientId),
            where('status', '==', 'paid'),
            orderBy('date', 'desc'),
            limit(10)
        );
        const unsub = onSnapshot(q, (snap) => {
            setPastVisits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)));
        });
        return () => unsub();
    }, [visit?.patientId]);

    // Load chart versions (1.5)
    useEffect(() => {
        if (!visitId) return;
        const q = query(
            collection(db, 'visits', visitId, 'versions'),
            orderBy('savedAt', 'desc'),
            limit(20)
        );
        const unsub = onSnapshot(q, (snap) => {
            setChartVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChartVersion)));
        });
        return () => unsub();
    }, [visitId]);

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

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!formData.cc.trim() && !formData.pe.trim() && !formData.test.trim()) {
                setContextSuggestions({ symptomBased: [], peBased: [], testBased: [] });
                return;
            }
            try {
                const res = await fetch('/api/clinical/diagnosis/suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cc: formData.cc,
                        pe: formData.pe,
                        testOrder: formData.test,
                        testResult: formData.testResult,
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setContextSuggestions(data);
                }
            } catch (e) {
                console.error('Context Suggest Error:', e);
            }
        };
        const timeoutId = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.cc, formData.pe, formData.test, formData.testResult]);

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
                                {visit.parentVisitId ? '초진추가' : visit.type === 'new' ? '신환' : '재진'}
                            </span>
                            {visit.type === 'return' && !visit.parentVisitId && (
                                <button
                                    onClick={handleAddInitialVisit}
                                    className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                                >
                                    <UserPlus className="w-3 h-3" /> 초진추가
                                </button>
                            )}
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
                        onClick={() => router.push(`/voice-chart?visitId=${visitId}&patientName=${encodeURIComponent(visit.patientName)}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-white font-medium shadow-md"
                    >
                        <Mic className="w-4 h-4" /> 음성진료
                    </button>

                    <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                        <Save className="w-4 h-4" /> 저장
                    </button>
                    <button onClick={handleCompleteClick} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 text-white font-bold shadow-md">
                        <CheckCircle className="w-4 h-4" />
                        {formData.test.trim() && !formData.testResult.trim() && visit?.testStatus !== 'completed'
                            ? '검사실로 보내기'
                            : formData.plan.trim()
                                ? '치료실로 보내기'
                                : '수납으로 보내기'}
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden flex bg-slate-50">
                {/* Left Column: History */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-2">환자 정보</h3>
                        <div className="space-y-1.5 text-sm text-slate-600">
                            {patientInfo ? (
                                <>
                                    <p>성별: {patientInfo.gender === 'male' ? '남' : '여'} / 생년: {patientInfo.birthDate}</p>
                                    <p>연락처: {patientInfo.phoneMasked || patientInfo.phone || '미등록'}</p>
                                    {patientInfo.memo && (
                                        <p className="text-red-500 font-bold">특이사항: {patientInfo.memo}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-400 italic">정보 로딩 중...</p>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-700">과거 진료 기록</h3>
                            <button
                                onClick={() => setShowVersionHistory(true)}
                                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                title="차트 버전 기록"
                            >
                                <History className="w-3 h-3" /> 버전 ({chartVersions.length})
                            </button>
                        </div>
                        {pastVisits.length > 0 ? (
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                {pastVisits.map(pv => (
                                    <button
                                        key={pv.id}
                                        onClick={() => {
                                            if (pv.diagnosis) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    diagnosis: prev.diagnosis
                                                        ? prev.diagnosis + '\n[참조] ' + pv.diagnosis
                                                        : '[참조] ' + pv.diagnosis,
                                                }));
                                                showToast('과거 진단이 참조로 삽입되었습니다.');
                                            }
                                        }}
                                        className="w-full text-left p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all text-xs group"
                                    >
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span className="text-slate-500">
                                                {pv.date ? new Date(pv.date.seconds * 1000).toLocaleDateString() : '-'}
                                            </span>
                                        </div>
                                        <p className="font-medium text-slate-700 truncate">{pv.diagnosis || pv.chiefComplaint || '(기록 없음)'}</p>
                                        {pv.treatmentNote && (
                                            <p className="text-slate-400 truncate mt-0.5">{pv.treatmentNote}</p>
                                        )}
                                        <span className="text-blue-500 text-[10px] opacity-0 group-hover:opacity-100 mt-1 block">클릭하여 진단 참조 삽입</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 text-sm mt-4">과거 기록 없음</div>
                        )}
                    </div>
                </div>

                {/* Center Column: Charting */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    {isListening && interimTranscript && (
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-lg">{interimTranscript}</p>
                        </div>
                    )}

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
                    <div onClick={() => { setActiveField('cc'); setActiveOrderGroup('symptom'); }} className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'cc' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'cc' ? 'text-emerald-700' : 'text-slate-500'}`}>Subjective (C.C / 증상)</label>
                        <textarea value={formData.cc} onChange={(e) => setFormData({ ...formData, cc: e.target.value })} placeholder="환자의 증상을 입력하세요..." className="w-full min-h-[100px] text-lg resize-none outline-none placeholder:text-slate-300 bg-transparent" />
                    </div>

                    {/* P/E Section */}
                    <div onClick={() => { setActiveField('pe'); setActiveOrderGroup('physical_exam'); }} className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'pe' ? 'border-amber-500 shadow-md ring-4 ring-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'pe' ? 'text-amber-700' : 'text-slate-500'}`}>Objective (이학 검사)</label>
                        <textarea value={formData.pe} onChange={(e) => setFormData({ ...formData, pe: e.target.value })} placeholder="이학적 검사 소견을 입력하세요... (예: ROM 제한, 압통, 부종 등)" className="w-full min-h-[80px] text-lg resize-none outline-none placeholder:text-slate-300 bg-transparent" />
                    </div>

                    {/* Test Section */}
                    <div onClick={() => { setActiveField('test'); setActiveOrderGroup('test'); }} className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'test' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'test' ? 'text-emerald-700' : 'text-slate-500'}`}>Objective (검사 오더)</label>
                        <textarea value={formData.test} onChange={(e) => setFormData({ ...formData, test: e.target.value })} placeholder="검사 오더..." className="w-full min-h-[60px] text-lg resize-none outline-none bg-transparent" />
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
                    <div onClick={() => { setActiveField('diagnosis'); setActiveOrderGroup('diagnosis'); }} className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text relative ${activeField === 'diagnosis' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <label className={`block text-sm font-bold uppercase tracking-wider ${activeField === 'diagnosis' ? 'text-emerald-700' : 'text-slate-500'}`}>Assessment (진단)</label>
                            <button onClick={(e) => { e.stopPropagation(); setIsKcdSearchOpen(true); }} className="text-xs bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1"><Search className="w-3 h-3" /> 상병검색</button>
                        </div>
                        <textarea value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} className="w-full min-h-[80px] text-lg resize-none outline-none bg-transparent" />
                    </div>

                    {/* Plan Section */}
                    <div onClick={() => { setActiveField('plan'); if (!['procedure', 'medication', 'pt', 'surgical'].includes(activeOrderGroup)) { setActiveOrderGroup('procedure'); } }} className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text flex-1 ${activeField === 'plan' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'plan' ? 'text-emerald-700' : 'text-slate-500'}`}>Plan (치료 및 처방)</label>
                        <textarea value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })} className="w-full h-full min-h-[150px] text-lg resize-none outline-none bg-transparent" />
                        {medicalOrders.some(o => o.type !== 'test') && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-slate-50 rounded-lg">
                                {medicalOrders.filter(o => o.type !== 'test').map(order => (
                                    <div key={order.id} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-sm shadow-sm">
                                        <span className="text-xs font-bold uppercase mr-1 text-blue-400">{order.type.substring(0, 3)}</span>
                                        <span>{order.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeOrder(order.id); }}><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Assistant - simplified for migration */}
                <div className="w-[480px] border-l border-slate-200 bg-white hidden xl:flex flex-col shadow-inner">
                    <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto no-scrollbar">
                        <button onClick={() => { setActiveOrderGroup('symptom'); setActiveSubGroupId(null); }} className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === 'symptom' ? 'bg-white border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:bg-white/50'}`}><Activity className="w-5 h-5" />증상</button>
                        <button onClick={() => { setActiveOrderGroup('physical_exam'); setActiveSubGroupId(null); }} className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === 'physical_exam' ? 'bg-white border-amber-600 text-amber-600' : 'border-transparent text-slate-400 hover:bg-white/50'}`}><Stethoscope className="w-5 h-5" />이학검사</button>
                        <button onClick={() => { setActiveOrderGroup('diagnosis'); setActiveSubGroupId(null); }} className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === 'diagnosis' ? 'bg-white border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:bg-white/50'}`}><Search className="w-5 h-5" />진단</button>
                        {([
                            { id: 'test' as const, label: '검사', icon: ClipboardList, color: 'text-indigo-600' },
                            { id: 'procedure' as const, label: '특수치료', icon: Activity, color: 'text-rose-600' },
                            { id: 'medication' as const, label: '약물', icon: Pill, color: 'text-blue-600' },
                            { id: 'pt' as const, label: '물리치료', icon: Activity, color: 'text-teal-600' },
                            { id: 'surgical' as const, label: '처치/수술', icon: Stethoscope, color: 'text-slate-700' },
                        ]).map((group) => (
                            <button key={group.id} onClick={() => { setActiveOrderGroup(group.id); setActiveSubGroupId(null); }} className={`flex-none w-20 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${activeOrderGroup === group.id ? `bg-white border-blue-600 ${group.color}` : 'border-transparent text-slate-400 hover:bg-white/50'}`}>
                                <group.icon className="w-5 h-5" />{group.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 bg-white">
                        {activeOrderGroup === 'symptom' && (
                            <div className="space-y-2">
                                {SYMPTOMS.map(s => (
                                    <button key={s.id} onClick={() => setFormData(prev => ({ ...prev, cc: (prev.cc ? prev.cc + ', ' : '') + s.text }))} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                                        <span className="text-xs font-bold text-slate-400 mr-2">{s.category}</span>{s.text}
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeOrderGroup === 'physical_exam' && (() => {
                            const toggleFinding = (label: string) => {
                                setSelectedPEFindings(prev => {
                                    const isSelected = prev.includes(label);
                                    const updated = isSelected ? prev.filter(f => f !== label) : [...prev, label];
                                    const peText = updated.map(f => f.split(' (')[0]).join(', ');
                                    setFormData(fd => ({ ...fd, pe: peText }));
                                    return updated;
                                });
                            };
                            return (
                                <div className="space-y-4">
                                    {selectedPEFindings.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                            {selectedPEFindings.map(f => (
                                                <span key={f} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                    {f.split(' (')[0]}
                                                    <button onClick={() => toggleFinding(f)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {PE_FINDINGS.map(group => (
                                        <div key={group.category}>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">{group.category}</h4>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {group.items.map(item => {
                                                    const isSelected = selectedPEFindings.includes(item.label);
                                                    return (
                                                        <button key={item.id} onClick={() => toggleFinding(item.label)} className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${isSelected ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-slate-100 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                                                            <span className={`text-sm font-medium ${isSelected ? 'text-amber-800' : 'text-slate-700'}`}>{item.label}</span>
                                                            {isSelected && <CheckCircle className="w-4 h-4 text-amber-500 ml-auto" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        {activeOrderGroup === 'diagnosis' && (
                            <div className="space-y-4">
                                <button onClick={() => setIsKcdSearchOpen(true)} className="w-full py-3 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"><Search className="w-4 h-4" /> 상병코드(KCD) 검색</button>

                                {/* 직접 검색 결과 */}
                                {(() => {
                                    const q = formData.diagnosis.split('\n').pop() || '';
                                    const cleanQ = q.trim();
                                    return cleanQ ? (
                                        <div className="mb-2">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                <Search className="w-3 h-3" /> 직접 검색 결과
                                            </h4>
                                            {kcdSearchResults.length === 0 && <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>}
                                            <div className="space-y-1">
                                                {kcdSearchResults.slice(0, 8).map((item) => (
                                                    <button key={`search-${item.code}`} onClick={() => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` }))} className="w-full text-left p-2 hover:bg-purple-50 rounded-lg group transition-colors flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                            <p className="text-xs text-slate-400">{item.en} <span className="text-purple-400 font-bold ml-1">{item.code}</span></p>
                                                        </div>
                                                        <Plus className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* 증상 기반 추천 */}
                                {contextSuggestions.symptomBased.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2 flex items-center gap-1 border-b border-emerald-100 pb-1">
                                            <Activity className="w-3 h-3" /> 증상 기반 추천
                                        </h4>
                                        <div className="space-y-1">
                                            {contextSuggestions.symptomBased.map((item) => (
                                                <button key={`sym-${item.code}`} onClick={() => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` }))} className="w-full text-left p-2.5 hover:bg-emerald-50 rounded-lg group transition-colors border border-transparent hover:border-emerald-200">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                            <p className="text-xs text-slate-400">{item.en} <span className="text-emerald-500 font-bold ml-1">{item.code}</span></p>
                                                            <p className="text-[10px] text-emerald-400 mt-0.5">{item.reason}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-2">
                                                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${item.confidence * 100}%` }} />
                                                            </div>
                                                            <Plus className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 이학검사 기반 추천 */}
                                {contextSuggestions.peBased.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-500 uppercase mb-2 flex items-center gap-1 border-b border-amber-100 pb-1">
                                            <Stethoscope className="w-3 h-3" /> 이학검사 기반 추천
                                        </h4>
                                        <div className="space-y-1">
                                            {contextSuggestions.peBased.map((item) => (
                                                <button key={`pe-${item.code}`} onClick={() => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` }))} className="w-full text-left p-2.5 hover:bg-amber-50 rounded-lg group transition-colors border border-transparent hover:border-amber-200">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                            <p className="text-xs text-slate-400">{item.en} <span className="text-amber-500 font-bold ml-1">{item.code}</span></p>
                                                            <p className="text-[10px] text-amber-400 mt-0.5">{item.reason}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-2">
                                                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${item.confidence * 100}%` }} />
                                                            </div>
                                                            <Plus className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 검사 결과 기반 추천 */}
                                {contextSuggestions.testBased.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center gap-1 border-b border-indigo-100 pb-1">
                                            <ClipboardList className="w-3 h-3" /> 검사 결과 기반 추천
                                        </h4>
                                        <div className="space-y-1">
                                            {contextSuggestions.testBased.map((item) => (
                                                <button key={`test-${item.code}`} onClick={() => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` }))} className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-lg group transition-colors border border-transparent hover:border-indigo-200">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                            <p className="text-xs text-slate-400">{item.en} <span className="text-indigo-500 font-bold ml-1">{item.code}</span></p>
                                                            <p className="text-[10px] text-indigo-400 mt-0.5">{item.reason}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-2">
                                                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${item.confidence * 100}%` }} />
                                                            </div>
                                                            <Plus className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 추천 없을 때 안내 */}
                                {contextSuggestions.symptomBased.length === 0 &&
                                 contextSuggestions.peBased.length === 0 &&
                                 contextSuggestions.testBased.length === 0 &&
                                 !formData.diagnosis.trim() && (
                                    <div className="text-center py-8 text-slate-400">
                                        <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm font-medium">증상/이학검사를 입력하면</p>
                                        <p className="text-sm">KCD-8 진단이 자동 추천됩니다</p>
                                        <p className="text-xs mt-2 text-slate-300">직접 진단명을 입력하여 검색할 수도 있습니다</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeOrderGroup === 'test' && (
                            <div className="space-y-4">
                                {TEST_GROUPS.map(group => (
                                    <div key={group.id}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <button key={item.id} onClick={() => addOrder('test', item.text)} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between group">
                                                    <span>{item.text}</span>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeOrderGroup === 'procedure' && (
                            <div className="space-y-4">
                                {PROCEDURE_GROUPS.map(group => (
                                    <div key={group.id}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <button key={item.id} onClick={() => addOrder('procedure', item.text)} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-between group">
                                                    <span>{item.text}</span>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeOrderGroup === 'medication' && (
                            <div className="space-y-4">
                                {MEDICATION_GROUPS.map(group => (
                                    <div key={group.id}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <button key={item.id} onClick={() => addOrder('medication', item.text)} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-between group">
                                                    <span>{item.text}</span>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeOrderGroup === 'pt' && (
                            <div className="space-y-4">
                                {PT_GROUPS.map(group => (
                                    <div key={group.id}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <button key={item.id} onClick={() => addOrder('pt', item.text)} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-teal-50 hover:border-teal-200 transition-all flex items-center justify-between group">
                                                    <span>{item.text}</span>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-teal-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeOrderGroup === 'surgical' && (
                            <div className="space-y-4">
                                {SURGICAL_GROUPS.map(group => (
                                    <div key={group.id}>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <button key={item.id} onClick={() => addOrder('surgical', item.text)} className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between group">
                                                    <span>{item.text}</span>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KCD Modal */}
            {isKcdSearchOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsKcdSearchOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">상병코드 검색</h3>
                            <button onClick={() => setIsKcdSearchOpen(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4">
                            <input type="text" placeholder="병명 또는 코드 검색..." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" autoFocus value={kcdQuery} onChange={(e) => setKcdQuery(e.target.value)} />
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
                            {kcdSearchResults.length > 0 ? (
                                <div className="space-y-1">
                                    {kcdSearchResults.map((item) => (
                                        <button key={item.code} onClick={() => { setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis ? prev.diagnosis + '\n' : '') + `${item.ko} (${item.code})` })); setIsKcdSearchOpen(false); }} className="w-full text-left p-3 hover:bg-purple-50 rounded-lg group transition-colors flex justify-between items-center border border-slate-100">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{item.ko}</p>
                                                <p className="text-xs text-slate-400">{item.en} <span className="text-purple-500 font-bold ml-1">{item.code}</span></p>
                                            </div>
                                            <Plus className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            ) : kcdQuery.trim() ? (
                                <p className="text-center text-slate-400 py-4 text-sm">검색 결과가 없습니다.</p>
                            ) : (
                                <p className="text-center text-slate-400 py-4 text-sm">병명 또는 코드를 입력하세요.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Complete Modal (1.3) */}
            {showConfirmModal && (
                <ConfirmCompleteModal
                    patientName={visit.patientName}
                    nextStatus={pendingNextStatus}
                    chartSummary={{
                        cc: formData.cc,
                        diagnosis: formData.diagnosis,
                        plan: formData.plan,
                        testOrder: formData.test,
                    }}
                    saving={saving}
                    onConfirm={() => handleSave(true)}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}

            {/* Version History Modal (1.5) */}
            {showVersionHistory && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowVersionHistory(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-slate-600" /> 차트 버전 기록</h3>
                            <button onClick={() => setShowVersionHistory(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {chartVersions.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">저장된 버전이 없습니다.</p>
                            ) : chartVersions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        if (confirm('이 버전의 내용을 현재 차트에 복원하시겠습니까?')) {
                                            setFormData({
                                                cc: v.snapshot.chiefComplaint || '',
                                                pe: v.snapshot.physicalExam || '',
                                                test: v.snapshot.testOrder || '',
                                                testResult: v.snapshot.testResult || '',
                                                diagnosis: v.snapshot.diagnosis || '',
                                                plan: v.snapshot.treatmentNote || '',
                                            });
                                            if (v.snapshot.orders) setMedicalOrders(v.snapshot.orders);
                                            if (v.snapshot.images) setMedicalImages(v.snapshot.images);
                                            setShowVersionHistory(false);
                                            showToast('버전이 복원되었습니다.');
                                        }
                                    }}
                                    className="w-full text-left p-3 bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-600">
                                            {v.savedAt ? new Date(v.savedAt.seconds * 1000).toLocaleString() : '(시간 미정)'}
                                        </span>
                                        <span className="text-xs text-slate-400">{v.savedByName || '알 수 없음'}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        {v.snapshot.diagnosis || v.snapshot.chiefComplaint || '(내용 없음)'}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{toastMessage}</span>
                </div>
            )}

            {/* X-ray View Selection Popup */}
            {xrayPopup && (
                <XrayPopup
                    bodyPart={xrayPopup.bodyPart}
                    side={xrayPopup.side}
                    onSideChange={(side) => setXrayPopup(prev => prev ? { ...prev, side } : null)}
                    onSelectView={(fullText) => { addOrder('test', fullText); setXrayPopup(null); }}
                    onClose={() => setXrayPopup(null)}
                />
            )}
        </div>
    );
}

const PE_FINDINGS = [
    { category: '기본 소견', items: [
        { id: 'tenderness', label: '압통 (Tenderness)' },
        { id: 'swelling', label: '부종 (Swelling)' },
        { id: 'deformity', label: '관절변형 (Deformity)' },
        { id: 'rom_limit', label: '관절운동제한 (ROM limitation)' },
    ]},
    { category: '근골격 소견', items: [
        { id: 'muscle_spasm', label: '근경직 (Muscle Spasm)' },
        { id: 'muscle_weakness', label: '근력약화 (Muscle Weakness)' },
        { id: 'muscle_atrophy', label: '근위축 (Muscle Atrophy)' },
        { id: 'crepitus', label: '염발음 (Crepitus)' },
    ]},
    { category: '피부/혈관 소견', items: [
        { id: 'redness', label: '발적 (Redness)' },
        { id: 'warmth', label: '열감 (Warmth)' },
        { id: 'ecchymosis', label: '반상출혈 (Ecchymosis)' },
        { id: 'edema', label: '함요부종 (Pitting Edema)' },
    ]},
    { category: '신경학적 소견', items: [
        { id: 'sensory_change', label: '감각이상 (Sensory Change)' },
        { id: 'numbness', label: '저림 (Numbness)' },
        { id: 'reflex_change', label: '반사이상 (Reflex Change)' },
        { id: 'gait_abnormal', label: '보행이상 (Gait Abnormality)' },
    ]},
];

// Extracted Component: XrayPopup
interface XrayPopupProps {
    bodyPart: XrayBodyPart;
    side: 'Lt' | 'Rt' | 'Both' | null;
    onSideChange: (side: 'Lt' | 'Rt' | 'Both') => void;
    onSelectView: (fullText: string) => void;
    onClose: () => void;
}

function XrayPopup({ bodyPart, side, onSideChange, onSelectView, onClose }: XrayPopupProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-600" />{bodyPart.nameKo} X-ray</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{bodyPart.nameEn} -- 촬영 옵션을 선택하세요</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    {bodyPart.sided && (
                        <div className="flex gap-2 mt-3">
                            {(['Lt', 'Rt', 'Both'] as const).map(s => (
                                <button key={s} onClick={() => onSideChange(s)} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${side === s ? 'border-indigo-500 bg-indigo-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>{s === 'Lt' ? 'Lt (좌)' : s === 'Rt' ? 'Rt (우)' : 'Both (양측)'}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                    <div className="space-y-2">
                        {bodyPart.viewOptions.map(option => {
                            const sidePrefix = side && bodyPart.sided ? `${side} ` : '';
                            const fullText = `${sidePrefix}${bodyPart.nameEn} ${option.label}`;
                            return (
                                <button key={option.id} onClick={() => { if (bodyPart.sided && !side) { alert('좌/우/양측을 먼저 선택해주세요.'); return; } onSelectView(fullText); }} className="w-full text-left p-3 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex items-center justify-between">
                                    <div><p className="font-bold text-slate-700 group-hover:text-indigo-700 text-sm">{sidePrefix}{bodyPart.nameEn} {option.label}</p></div>
                                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">취소</button>
                </div>
            </div>
        </div>
    );
}
