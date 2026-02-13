'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, subDays } from 'date-fns';
import { Visit, TreatmentExecution } from '@shared/types/clinical';
import { useVoiceDictation } from '@shared/hooks/useVoiceDictation';
import { changeVisitStatus } from '@shared/lib/workflow-engine';
import { logAudit } from '@shared/lib/audit-client';
import PatientStatusBadges from '@/components/clinical/PatientStatusBadges';
import TreatmentTimer from '@/components/clinical/TreatmentTimer';
import EMRLayout from '@/components/layout/EMRLayout';
import { parseTreatmentNote } from '@/lib/treatment-modalities';
import {
    ClipboardList, User, CheckCircle, Clock, Stethoscope,
    ArrowLeft, ArrowRight, Plus, AlertTriangle, Save, Mic, Square,
    Zap, Syringe, Scan, Sparkles
} from 'lucide-react';

// ──────────────────────────────────────────
// 진단별 추천 오더 매핑 (정형외과)
// ──────────────────────────────────────────

interface PresetCategory {
    label: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
}

type PresetMap = Record<string, PresetCategory[]>;

const BODY_PART_KEYWORDS: Record<string, string[]> = {
    spine: ['M51', 'M54', 'M47', 'M48', 'M50', 'M43', '요추', '경추', '흉추', '추간판', '디스크', '척추', '허리', '목'],
    knee: ['M17', 'M23', 'S83', 'M22', 'M76.5', '무릎', '슬관절', '반월판', '십자인대'],
    shoulder: ['M75', 'M19.0', 'S43', 'M24.4', '어깨', '견관절', '오십견', '회전근개', '충돌'],
    ankle: ['M77.5', 'S93', 'S82', 'M19.1', '발목', '족관절', '아킬레스', '족저근막'],
    wrist: ['M65', 'S62', 'S63', 'M19.0', '손목', '수근관', '방아쇠'],
    hip: ['M16', 'M70.6', 'S72', '고관절', '엉덩이'],
    elbow: ['M77.0', 'M77.1', 'S53', '팔꿈치', '주관절', '테니스', '골프'],
};

const TREATMENT_PRESETS: PresetMap = {
    spine: [
        {
            label: '물리치료',
            icon: <Zap className="w-3.5 h-3.5" />,
            color: 'emerald',
            items: ['핫팩 20분', '간섭파치료(ICT) 15분', '초음파치료 5분', 'TENS 15분', '경추견인 15분', '요추견인 15분', '적외선치료 15분'],
        },
        {
            label: '도수/주사',
            icon: <Syringe className="w-3.5 h-3.5" />,
            color: 'blue',
            items: ['도수치료', '경막외주사(Block)', '트리거포인트 주사', '신경차단술', 'PRP 주사'],
        },
        {
            label: '검사',
            icon: <Scan className="w-3.5 h-3.5" />,
            color: 'orange',
            items: ['요추 X-ray (AP/Lat)', '경추 X-ray (AP/Lat)', '요추 MRI', '경추 MRI', '근전도검사(EMG)'],
        },
    ],
    knee: [
        {
            label: '물리치료',
            icon: <Zap className="w-3.5 h-3.5" />,
            color: 'emerald',
            items: ['핫팩 20분', '간섭파치료(ICT) 15분', '초음파치료 5분', 'TENS 15분', '냉찜질 15분', '적외선치료 15분'],
        },
        {
            label: '도수/주사',
            icon: <Syringe className="w-3.5 h-3.5" />,
            color: 'blue',
            items: ['관절강 내 주사', '히알루론산 주사', 'PRP 주사', '트리거포인트 주사', '도수치료'],
        },
        {
            label: '검사',
            icon: <Scan className="w-3.5 h-3.5" />,
            color: 'orange',
            items: ['무릎 X-ray (AP/Lat/Merchant)', '무릎 X-ray (Rosenberg)', '무릎 MRI', '초음파검사(US)'],
        },
    ],
    shoulder: [
        {
            label: '물리치료',
            icon: <Zap className="w-3.5 h-3.5" />,
            color: 'emerald',
            items: ['핫팩 20분', '초음파치료 5분', '간섭파치료(ICT) 15분', 'TENS 15분', '적외선치료 15분', '레이저치료'],
        },
        {
            label: '도수/주사',
            icon: <Syringe className="w-3.5 h-3.5" />,
            color: 'blue',
            items: ['견봉하 주사', '관절강 내 주사', 'PRP 주사', '트리거포인트 주사', '도수치료', '체외충격파(ESWT)'],
        },
        {
            label: '검사',
            icon: <Scan className="w-3.5 h-3.5" />,
            color: 'orange',
            items: ['어깨 X-ray (AP/Axial)', '어깨 MRI', '초음파검사(US)'],
        },
    ],
    ankle: [
        {
            label: '물리치료',
            icon: <Zap className="w-3.5 h-3.5" />,
            color: 'emerald',
            items: ['핫팩 20분', '초음파치료 5분', '간섭파치료(ICT) 15분', 'TENS 15분', '냉찜질 15분', '적외선치료 15분'],
        },
        {
            label: '도수/주사',
            icon: <Syringe className="w-3.5 h-3.5" />,
            color: 'blue',
            items: ['관절강 내 주사', 'PRP 주사', '트리거포인트 주사', '체외충격파(ESWT)', '도수치료'],
        },
        {
            label: '검사',
            icon: <Scan className="w-3.5 h-3.5" />,
            color: 'orange',
            items: ['발목 X-ray (AP/Lat)', '발목 MRI', '초음파검사(US)'],
        },
    ],
    general: [
        {
            label: '물리치료',
            icon: <Zap className="w-3.5 h-3.5" />,
            color: 'emerald',
            items: ['핫팩 20분', '간섭파치료(ICT) 15분', '초음파치료 5분', 'TENS 15분', '적외선치료 15분'],
        },
        {
            label: '주사/시술',
            icon: <Syringe className="w-3.5 h-3.5" />,
            color: 'blue',
            items: ['트리거포인트 주사', '관절강 내 주사', 'PRP 주사', '도수치료', '체외충격파(ESWT)'],
        },
        {
            label: '검사',
            icon: <Scan className="w-3.5 h-3.5" />,
            color: 'orange',
            items: ['X-ray', 'MRI', '초음파검사(US)', '혈액검사(CBC)', '골밀도검사(DEXA)'],
        },
    ],
};

// wrist, hip, elbow — use general with slight differences but let's keep it simple
TREATMENT_PRESETS.wrist = TREATMENT_PRESETS.general;
TREATMENT_PRESETS.hip = TREATMENT_PRESETS.general;
TREATMENT_PRESETS.elbow = [
    {
        label: '물리치료',
        icon: <Zap className="w-3.5 h-3.5" />,
        color: 'emerald',
        items: ['핫팩 20분', '초음파치료 5분', '간섭파치료(ICT) 15분', 'TENS 15분', '적외선치료 15분'],
    },
    {
        label: '주사/시술',
        icon: <Syringe className="w-3.5 h-3.5" />,
        color: 'blue',
        items: ['트리거포인트 주사', 'PRP 주사', '체외충격파(ESWT)', '도수치료'],
    },
    {
        label: '검사',
        icon: <Scan className="w-3.5 h-3.5" />,
        color: 'orange',
        items: ['팔꿈치 X-ray (AP/Lat)', '팔꿈치 MRI', '초음파검사(US)'],
    },
];

function detectBodyPart(visit: Visit): string {
    const text = [
        visit.diagnosis || '',
        visit.chiefComplaint || '',
        visit.treatmentNote || '',
        visit.testOrder || '',
        visit.history || '',
    ].join(' ').toUpperCase();

    for (const [part, keywords] of Object.entries(BODY_PART_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw.toUpperCase()))) {
            return part;
        }
    }
    return 'general';
}

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────

export default function TreatmentPage() {
    return (
        <EMRLayout>
            <TreatmentPageContent />
        </EMRLayout>
    );
}

function TreatmentPageContent() {
    const [waitingList, setWaitingList] = useState<Visit[]>([]);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; visit: Visit | null }>({ isOpen: false, visit: null });

    // 오더 입력
    const [orderInput, setOrderInput] = useState('');
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [saving, setSaving] = useState(false);

    // 치료 실행 추적 (2.1)
    const [treatmentExecs, setTreatmentExecs] = useState<TreatmentExecution[]>([]);
    const [treatmentStartedAt, setTreatmentStartedAt] = useState<Timestamp | undefined>();
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    // 음성 입력 (공유 훅 사용)
    const onVoiceResult = useCallback((text: string) => {
        setOrderInput(prev => (prev ? prev + ' ' : '') + text);
    }, []);
    const { isListening, interimTranscript, toggle: toggleVoice, stop: stopListening, isSupported: voiceSupported } = useVoiceDictation({
        onFinalResult: onVoiceResult,
    });

    // ── Firestore 구독 ──
    useEffect(() => {
        const today = subDays(startOfDay(new Date()), 7);
        const q = query(collection(db, 'visits'), where('status', '==', 'treatment'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let visits = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Visit[];
            const minDate = today.getTime() / 1000;
            visits = visits.filter(v => v.date && v.date.seconds >= minDate);
            visits.sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
            setWaitingList(visits);
            setLoading(false);

            if (selectedVisit) {
                const updated = visits.find(v => v.id === selectedVisit.id);
                if (updated) setSelectedVisit(updated);
                else setSelectedVisit(null);
            }
        });

        return () => unsubscribe();
    }, [selectedVisit?.id]);

    // ── 치료 실행 초기화 (선택 환자 변경 시) ──
    useEffect(() => {
        if (!selectedVisit?.treatmentNote) {
            setTreatmentExecs([]);
            setTreatmentStartedAt(undefined);
            return;
        }
        // Parse treatment note into executions if not already tracked
        const parsed = parseTreatmentNote(selectedVisit.treatmentNote);
        const execs: TreatmentExecution[] = parsed.map((item, idx) => ({
            id: `exec_${idx}_${Date.now()}`,
            modality: item.name,
            status: 'pending' as const,
            durationMinutes: item.minutes,
        }));
        setTreatmentExecs(execs);
        setTreatmentStartedAt(undefined);
    }, [selectedVisit?.id, selectedVisit?.treatmentNote]);

    const handleStartModality = (id: string) => {
        if (!treatmentStartedAt) {
            setTreatmentStartedAt(Timestamp.now());
        }
        setTreatmentExecs(prev => prev.map(e =>
            e.id === id ? { ...e, status: 'in_progress' as const, startedAt: Timestamp.now() } : e
        ));
    };

    const handleCompleteModality = (id: string) => {
        setTreatmentExecs(prev => prev.map(e =>
            e.id === id ? { ...e, status: 'completed' as const, completedAt: Timestamp.now() } : e
        ));
    };

    // ── 프리셋 칩 클릭 ──
    const appendPreset = (item: string) => {
        setOrderInput(prev => {
            if (!prev.trim()) return item;
            if (prev.includes(item)) return prev;
            return prev.trim() + '\n' + item;
        });
    };

    // ── 액션 핸들러 ──
    const handleSendBackToConsulting = async (visit: Visit) => {
        try {
            await changeVisitStatus(visit.id, 'consulting');
            setSelectedVisit(null);
            stopListening();
        } catch (error: unknown) {
            alert('상태 변경 실패: ' + (error as Error).message);
        }
    };

    const handleForceToPayment = async (visit: Visit) => {
        try {
            await changeVisitStatus(visit.id, 'completed');
            setSelectedVisit(null);
            stopListening();
        } catch (error: unknown) {
            alert('상태 변경 실패: ' + (error as Error).message);
        }
    };

    const handleSaveOrder = async () => {
        if (!selectedVisit || !orderInput.trim()) return;
        setSaving(true);
        stopListening();
        try {
            await updateDoc(doc(db, 'visits', selectedVisit.id), {
                treatmentNote: orderInput.trim(),
                updatedAt: serverTimestamp(),
            });
            setIsEditingOrder(false);
        } catch (error) {
            alert('오더 저장 실패: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = (visit: Visit) => {
        setConfirmModal({ isOpen: true, visit });
    };

    const processComplete = async () => {
        const visit = confirmModal.visit;
        if (!visit) return;
        try {
            await changeVisitStatus(visit.id, 'completed');
            logAudit({
                action: 'status_change',
                collection: 'visits',
                documentId: visit.id,
                after: { status: 'completed' },
                description: `치료 완료 → 수납 (${visit.patientName})`,
            });
            setConfirmModal({ isOpen: false, visit: null });
            setSelectedVisit(null);
            showToast(`${visit.patientName}님 치료 완료 → 수납대기`);
        } catch (error) {
            console.error('Error updating visit:', error);
            showToast('처리 중 오류가 발생했습니다: ' + (error as Error).message);
            setConfirmModal({ isOpen: false, visit: null });
        }
    };

    // ── 현재 선택된 환자의 추천 프리셋 ──
    const bodyPart = selectedVisit ? detectBodyPart(selectedVisit) : 'general';
    const presets = TREATMENT_PRESETS[bodyPart] || TREATMENT_PRESETS.general;
    const bodyPartLabel: Record<string, string> = {
        spine: '척추/허리/목',
        knee: '무릎',
        shoulder: '어깨',
        ankle: '발목/족부',
        wrist: '손목/손',
        hip: '고관절',
        elbow: '팔꿈치',
        general: '일반',
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6 p-4 max-w-7xl mx-auto">
            {/* 왼쪽: 치료 대기 목록 */}
            <div className="w-1/3 min-w-[320px] flex flex-col gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                        <ClipboardList className="w-6 h-6 text-purple-600" />
                        치료 대기 (Nursing)
                    </h2>
                    <p className="text-slate-500 text-sm">의사가 처방한 치료를 수행합니다.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Loading...</div>
                    ) : waitingList.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p>대기 중인 환자가 없습니다.</p>
                        </div>
                    ) : (
                        waitingList.map(visit => (
                            <div
                                key={visit.id}
                                onClick={() => {
                                    setSelectedVisit(visit);
                                    setIsEditingOrder(false);
                                    stopListening();
                                }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                                    selectedVisit?.id === visit.id
                                        ? 'bg-purple-50 border-purple-500 shadow-md ring-1 ring-purple-500'
                                        : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{visit.patientName}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        visit.treatmentNote
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {visit.treatmentNote ? '치료대기' : '오더없음'}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-4 mb-2">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {visit.date ? new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                    {visit.diagnosis && (
                                        <span className="truncate max-w-[120px] text-slate-600">{visit.diagnosis}</span>
                                    )}
                                </div>
                                <PatientStatusBadges visit={visit} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 오른쪽: 상세 & 오더 */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                {selectedVisit ? (
                    <>
                        {/* 헤더 */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedVisit.patientName}</h2>
                                        <p className="text-slate-500 text-sm">치료실 입실 확인됨</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        추천: {bodyPartLabel[bodyPart]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 본문 */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4" /> 진단 / 주호소
                                    </h3>
                                    <p className="text-lg text-slate-800 font-medium leading-relaxed">
                                        {selectedVisit.diagnosis || <span className="text-slate-400 italic">진단명 없음</span>}
                                    </p>
                                    {selectedVisit.chiefComplaint && (
                                        <p className="text-sm text-slate-500 mt-1">{selectedVisit.chiefComplaint}</p>
                                    )}
                                    {selectedVisit.testOrder && (
                                        <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                                            <Scan className="w-3 h-3" /> 검사 오더: {selectedVisit.testOrder}
                                        </p>
                                    )}
                                </div>

                                {!selectedVisit.treatmentNote && !isEditingOrder ? (
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-start gap-3 mb-4">
                                            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="text-lg font-bold text-amber-800">치료 오더가 없습니다</h3>
                                                <p className="text-sm text-amber-600 mt-1">
                                                    진료실에서 오더 없이 치료실로 전송된 환자입니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleSendBackToConsulting(selectedVisit)}
                                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                                            >
                                                <ArrowLeft className="w-5 h-5" />
                                                진료실로 돌려보내기
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingOrder(true); setOrderInput(''); }}
                                                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                                            >
                                                <Plus className="w-5 h-5" />
                                                오더 직접 입력
                                            </button>
                                        </div>
                                    </div>
                                ) : isEditingOrder ? (
                                    <div className="bg-white border-2 border-purple-300 rounded-xl shadow-sm overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-purple-200">
                                            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                추천 오더 — {bodyPartLabel[bodyPart]} 기반
                                            </h4>
                                            <div className="space-y-3">
                                                {presets.map((cat) => (
                                                    <div key={cat.label}>
                                                        <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                                            {cat.icon} {cat.label}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {cat.items.map((item) => {
                                                                const isSelected = orderInput.includes(item);
                                                                return (
                                                                    <button
                                                                        key={item}
                                                                        onClick={() => appendPreset(item)}
                                                                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                                                            isSelected
                                                                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-400 hover:bg-purple-50'
                                                                        }`}
                                                                    >
                                                                        {isSelected ? '✓ ' : ''}{item}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-bold text-purple-700 flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4" /> 오더 내용
                                                </h3>
                                                {voiceSupported && (
                                                    <button
                                                        onClick={() => toggleVoice()}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                                            isListening
                                                                ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700'
                                                        }`}
                                                    >
                                                        {isListening ? (
                                                            <><Square className="w-3.5 h-3.5 fill-current" /> 음성 중지</>
                                                        ) : (
                                                            <><Mic className="w-3.5 h-3.5" /> 음성 입력</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {isListening && (
                                                <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                    {interimTranscript || '음성 인식 중... 말씀하세요'}
                                                </div>
                                            )}

                                            <textarea
                                                value={orderInput}
                                                onChange={(e) => setOrderInput(e.target.value)}
                                                placeholder={'치료 내용을 입력하거나 음성으로 말씀하세요...\n프리셋을 클릭하면 자동으로 추가됩니다.'}
                                                className="w-full h-32 p-3 border border-slate-200 rounded-xl text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                                autoFocus
                                            />
                                            <div className="flex gap-3 mt-3">
                                                <button
                                                    onClick={() => { setIsEditingOrder(false); stopListening(); }}
                                                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 font-bold rounded-xl transition-colors"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveOrder}
                                                    disabled={saving || !orderInput.trim()}
                                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-md"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    {saving ? '저장 중...' : '오더 저장'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white border-l-4 border-purple-500 rounded-r-xl p-6 shadow-sm bg-purple-50/30">
                                            <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4" /> 처방 및 오더 (Orders)
                                                </span>
                                                <button
                                                    onClick={() => { setIsEditingOrder(true); setOrderInput(selectedVisit.treatmentNote || ''); }}
                                                    className="text-xs px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors font-medium"
                                                >
                                                    수정
                                                </button>
                                            </h3>
                                            <div className="prose prose-slate max-w-none text-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                {selectedVisit.treatmentNote}
                                            </div>
                                        </div>

                                        {/* Treatment Execution Timer (2.1) */}
                                        {treatmentExecs.length > 0 && (
                                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" /> 치료 실행 추적
                                                </h3>
                                                <TreatmentTimer
                                                    executions={treatmentExecs}
                                                    treatmentStartedAt={treatmentStartedAt}
                                                    onStartModality={handleStartModality}
                                                    onCompleteModality={handleCompleteModality}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 하단 액션바 */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
                            <button
                                onClick={() => handleSendBackToConsulting(selectedVisit)}
                                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center gap-2 transition-colors border border-blue-200 text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                진료실로 돌려보내기
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setSelectedVisit(null); stopListening(); }}
                                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-200 font-bold rounded-xl transition-colors text-sm"
                                >
                                    닫기
                                </button>
                                <button
                                    onClick={() => handleComplete(selectedVisit)}
                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 flex items-center gap-2 transition-all transform hover:scale-105 text-sm"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    치료 완료 (수납으로)
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <ClipboardList className="w-20 h-20 mb-6 opacity-20" />
                        <p className="text-lg font-medium">대기 목록에서 환자를 선택해주세요.</p>
                        <p className="text-sm opacity-60 mt-2">환자의 처방 내역을 확인하고 처리할 수 있습니다.</p>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toastMsg && (
                <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{toastMsg}</span>
                </div>
            )}

            {/* 완료 확인 모달 */}
            {confirmModal.isOpen && confirmModal.visit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 border border-slate-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">치료 완료 확인</h3>
                                <p className="text-slate-500 mt-2">
                                    <span className="font-bold text-purple-700">{confirmModal.visit.patientName}</span>님의 치료를 완료하고<br />
                                    수납 대기 목록으로 이동하시겠습니까?
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setConfirmModal({ isOpen: false, visit: null })}
                                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={processComplete}
                                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-colors"
                                >
                                    확인 (완료)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
