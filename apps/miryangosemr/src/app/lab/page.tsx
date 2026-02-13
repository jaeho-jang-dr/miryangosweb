'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit } from '@shared/types/clinical';
import { FlaskConical, CheckCircle2, TestTube2, FileText, X, Mic, Square, ArrowRight, CheckCircle } from 'lucide-react';
import { useVoiceDictation } from '@shared/hooks/useVoiceDictation';
import { changeVisitStatus } from '@shared/lib/workflow-engine';
import { logAudit } from '@shared/lib/audit-client';
import PatientStatusBadges from '@/components/clinical/PatientStatusBadges';
import LabResultPanel from '@/components/clinical/LabResultPanel';
import EMRLayout from '@/components/layout/EMRLayout';
import { detectPanels, LabPanel } from '@/lib/lab-panels';

export default function LaboratoryPage() {
    return (
        <EMRLayout>
            <LaboratoryPageContent />
        </EMRLayout>
    );
}

function LaboratoryPageContent() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [resultText, setResultText] = useState('');
    const [detectedPanels, setDetectedPanels] = useState<LabPanel[]>([]);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    const onVoiceResult = useCallback((text: string) => {
        setResultText(prev => (prev ? prev + ' ' : '') + text);
    }, []);
    const { isListening, interimTranscript, toggle: toggleVoice, isSupported: voiceSupported } = useVoiceDictation({
        onFinalResult: onVoiceResult,
    });

    useEffect(() => {
        const q = query(
            collection(db, 'visits'),
            where('status', 'in', ['consulting', 'testing', 'treatment'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            data = data.filter(v => v.testOrder && v.testOrder.trim().length > 0);

            data.sort((a, b) => {
                const dateA = a.createdAt?.seconds || a.date?.seconds || 0;
                const dateB = b.createdAt?.seconds || b.date?.seconds || 0;
                return dateB - dateA;
            });

            setVisits(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const openResultModal = (visit: Visit) => {
        setSelectedVisit(visit);
        setResultText(visit.testResult || '');
        setDetectedPanels(detectPanels(visit.testOrder || ''));
    };

    const handleSaveResult = async (complete: boolean) => {
        if (!selectedVisit) return;

        try {
            const updates: Record<string, unknown> = {
                testResult: resultText,
                testStatus: complete ? 'completed' : 'processing',
                updatedAt: serverTimestamp()
            };

            if (complete) {
                updates.status = 'consulting';
                updates.statusChangedAt = serverTimestamp();
            }

            await updateDoc(doc(db, 'visits', selectedVisit.id), updates);

            if (complete) {
                logAudit({
                    action: 'status_change',
                    collection: 'visits',
                    documentId: selectedVisit.id,
                    after: { testResult: resultText, testStatus: 'completed', status: 'consulting' },
                    description: `검사결과 입력 완료 - 진료실 복귀 (${selectedVisit.patientName})`,
                });
                showToast(`검사 결과 저장 완료 → ${selectedVisit.patientName}님이 진료실로 이동합니다.`);
                setSelectedVisit(null);
            }
        } catch (e) {
            console.error(e);
            showToast('저장 중 오류가 발생했습니다.');
        }
    };

    const handleForceToConsulting = async (visit: Visit) => {
        if (!confirm(`${visit.patientName}\uB2D8\uC744 \uACB0\uACFC \uC785\uB825 \uC5C6\uC774 \uC9C4\uB8CC\uC2E4\uB85C \uC774\uB3D9\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n(\uB098\uC911\uC5D0 \uACB0\uACFC\uB97C \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4)`)) return;
        try {
            await changeVisitStatus(visit.id, 'consulting');
        } catch (e) {
            console.error(e);
            alert('\uC774\uB3D9 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading laboratory dashboard...</div>;

    const toastElement = toastMsg ? (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMsg}</span>
        </div>
    ) : null;

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <FlaskConical className="w-8 h-8 text-indigo-600" />
                    \uAC80\uC0AC\uC2E4 (Laboratory)
                </h1>
                <p className="text-slate-500 mt-2">\uAC80\uC0AC \uB300\uAE30 \uBC0F \uC9C4\uD589 \uC911\uC778 \uD658\uC790 \uBAA9\uB85D\uC785\uB2C8\uB2E4.</p>
            </div>

            {visits.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm p-12">
                    <TestTube2 className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">\uB300\uAE30 \uC911\uC778 \uAC80\uC0AC \uD658\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
                    {visits.map(visit => (
                        <div key={visit.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-800">{visit.patientName}</h3>
                                        {visit.testStatus === 'completed' ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">\uAC80\uC0AC\uC644\uB8CC</span>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">\uAC80\uC0AC\uB300\uAE30</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} \uC811\uC218
                                    </p>
                                </div>
                                <button onClick={() => openResultModal(visit)} className={`p-2 rounded-full transition-colors ${visit.testStatus === 'completed' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`} title="\uACB0\uACFC \uC785\uB825">
                                    {visit.testStatus === 'completed' ? <FileText className="w-6 h-6" /> : <div className="flex items-center gap-1 px-2 font-bold"><TestTube2 className="w-4 h-4" /> \uACB0\uACFC\uC785\uB825</div>}
                                </button>
                            </div>
                            <div className="mb-3"><PatientStatusBadges visit={visit} currentPage="testing" /></div>
                            <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><ClipboardListIcon className="w-3 h-3" />Test Orders</h4>
                                <p className="text-slate-700 whitespace-pre-wrap font-medium">{visit.testOrder}</p>
                            </div>
                            {visit.testResult && (
                                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                                    <h4 className="text-xs font-bold text-green-700 uppercase mb-1">Result</h4>
                                    <p className="text-sm text-green-800 line-clamp-2">{visit.testResult}</p>
                                </div>
                            )}
                            {visit.status === 'testing' && visit.testStatus !== 'completed' && (
                                <button onClick={() => handleForceToConsulting(visit)} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors">
                                    <ArrowRight className="w-4 h-4" /> \uC9C4\uB8CC\uC2E4\uB85C \uAC15\uC81C\uC774\uB3D9
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {toastElement}

            {selectedVisit && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVisit(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><TestTube2 className="w-5 h-5 text-indigo-600" />\uAC80\uC0AC \uACB0\uACFC \uC785\uB825 ({selectedVisit.patientName})</h3>
                            <button onClick={() => setSelectedVisit(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 block mb-1">ORDER</label>
                                <p className="text-slate-800 font-medium">{selectedVisit.testOrder}</p>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-slate-700">\uAC80\uC0AC \uACB0\uACFC / \uD310\uB3C5 \uC18C\uACAC</label>
                                {voiceSupported && (
                                    <button onClick={() => toggleVoice()} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}>
                                        {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                                        {isListening ? '\uC74C\uC131 \uC911\uC9C0' : '\uC74C\uC131 \uC785\uB825'}
                                    </button>
                                )}
                            </div>
                            {isListening && interimTranscript && (
                                <div className="mb-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm animate-pulse">{interimTranscript}</div>
                            )}
                            {/* Structured Lab Result Panel (2.3) */}
                            {detectedPanels.length > 0 && (
                                <div className="mb-4">
                                    <label className="text-sm font-bold text-indigo-700 mb-2 block">구조화 결과 입력</label>
                                    <LabResultPanel
                                        panels={detectedPanels}
                                        onResultsComplete={(formatted) => {
                                            setResultText(prev => prev ? prev + '\n' + formatted : formatted);
                                        }}
                                    />
                                    <div className="my-3 flex items-center gap-2">
                                        <div className="flex-1 border-t border-slate-200" />
                                        <span className="text-xs text-slate-400">또는 직접 입력</span>
                                        <div className="flex-1 border-t border-slate-200" />
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <textarea value={resultText} onChange={(e) => setResultText(e.target.value)} className={`w-full h-48 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 text-lg transition-colors ${isListening ? 'border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/30' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'}`} placeholder={isListening ? '음성으로 말씀하세요...' : '결과 값을 입력하세요...'} autoFocus />
                                {isListening && (
                                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-xs text-red-500 font-bold">REC</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button onClick={() => handleSaveResult(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">\uC784\uC2DC \uC800\uC7A5</button>
                            <button onClick={() => handleSaveResult(true)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> \uACB0\uACFC \uC644\uB8CC</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
        </svg>
    );
}
