'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Visit } from '@/types/clinical';
import { FlaskConical, CheckCircle2, Search, TestTube2, ArrowRight, FileText, X } from 'lucide-react';

export default function LaboratoryPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [resultText, setResultText] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'visits'),
            where('status', 'in', ['consulting', 'testing', 'treatment']),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            // Filter for patients with test orders
            const patientsWithTests = data.filter(v => v.testOrder && v.testOrder.trim().length > 0);

            setVisits(patientsWithTests);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const openResultModal = (visit: Visit) => {
        setSelectedVisit(visit);
        setResultText(visit.testResult || '');
    };

    const handleSaveResult = async (complete: boolean) => {
        if (!selectedVisit) return;

        try {
            const updates: any = {
                testResult: resultText,
                testStatus: complete ? 'completed' : 'processing',
                updatedAt: serverTimestamp()
            };

            // If completing, maybe nudge status? For now keep workflow simple.
            // If status was 'consulting', changing to 'testing' might be good if not already?
            // User requested: "Complete" -> Notify doctor (which is usually just data update + status change)

            await updateDoc(doc(db, 'visits', selectedVisit.id), updates);

            if (complete) {
                alert('검사 결과가 저장되었습니다.');
                setSelectedVisit(null);
            } else {
                // Just save draft
            }
        } catch (e) {
            console.error(e);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading laboratory dashboard...</div>;

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <FlaskConical className="w-8 h-8 text-indigo-600" />
                    검사실 (Laboratory)
                </h1>
                <p className="text-slate-500 mt-2">검사 대기 및 진행 중인 환자 목록입니다.</p>
            </div>

            {visits.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm p-12">
                    <TestTube2 className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">대기 중인 검사 환자가 없습니다.</p>
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
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">검사완료</span>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">검사대기</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 접수
                                    </p>
                                </div>
                                <button
                                    onClick={() => openResultModal(visit)}
                                    className={`p-2 rounded-full transition-colors ${visit.testStatus === 'completed'
                                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                        }`}
                                    title="결과 입력"
                                >
                                    {visit.testStatus === 'completed' ? <FileText className="w-6 h-6" /> : <div className="flex items-center gap-1 px-2 font-bold"><TestTube2 className="w-4 h-4" /> 결과입력</div>}
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                    <ClipboardListIcon className="w-3 h-3" />
                                    Test Orders
                                </h4>
                                <p className="text-slate-700 whitespace-pre-wrap font-medium">
                                    {visit.testOrder}
                                </p>
                            </div>

                            {visit.testResult && (
                                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                                    <h4 className="text-xs font-bold text-green-700 uppercase mb-1">Result</h4>
                                    <p className="text-sm text-green-800 line-clamp-2">{visit.testResult}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Result Entry Modal */}
            {selectedVisit && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVisit(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TestTube2 className="w-5 h-5 text-indigo-600" />
                                검사 결과 입력 ({selectedVisit.patientName})
                            </h3>
                            <button onClick={() => setSelectedVisit(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 block mb-1">ORDER</label>
                                <p className="text-slate-800 font-medium">{selectedVisit.testOrder}</p>
                            </div>

                            <label className="text-sm font-bold text-slate-700 block mb-2">검사 결과 / 판독 소견</label>
                            <textarea
                                value={resultText}
                                onChange={(e) => setResultText(e.target.value)}
                                className="w-full h-48 p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-lg"
                                placeholder="결과 값을 입력하세요..."
                                autoFocus
                            />
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => handleSaveResult(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                            >
                                임시 저장
                            </button>
                            <button
                                onClick={() => handleSaveResult(true)}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> 결과 완료
                            </button>
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
