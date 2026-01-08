'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { startOfDay, subDays } from 'date-fns';
import { Visit } from '@/types/clinical';
import { ClipboardList, User, CheckCircle, Clock, Stethoscope, ChevronRight } from 'lucide-react';

export default function TreatmentPage() {
    const [waitingList, setWaitingList] = useState<Visit[]>([]);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, visit: Visit | null }>({ isOpen: false, visit: null });

    useEffect(() => {
        const today = subDays(startOfDay(new Date()), 7);

        // Subscribe to visits with status 'treatment'
        const q = query(
            collection(db, 'visits'),
            where('date', '>=', today),
            where('status', '==', 'treatment'),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            setWaitingList(visits);
            setLoading(false);

            // Update selected visit if it changes
            if (selectedVisit) {
                const updated = visits.find(v => v.id === selectedVisit.id);
                if (updated) setSelectedVisit(updated);
                else setSelectedVisit(null);
            }
        });

        return () => unsubscribe();
    }, [selectedVisit?.id]);

    const handleComplete = (visit: Visit) => {
        setConfirmModal({ isOpen: true, visit });
    };

    const processComplete = async () => {
        const visit = confirmModal.visit;
        if (!visit) return;

        try {
            await updateDoc(doc(db, 'visits', visit.id), {
                status: 'completed', // Ready for Payment
                treatmentCompletedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setConfirmModal({ isOpen: false, visit: null });
            setSelectedVisit(null);
        } catch (error) {
            console.error("Error updating visit:", error);
            alert("처리 중 오류가 발생했습니다: " + (error as Error).message);
            setConfirmModal({ isOpen: false, visit: null });
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6 p-4 max-w-7xl mx-auto">
            {/* Left Panel: Treatment Waiting List */}
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
                                onClick={() => setSelectedVisit(visit)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedVisit?.id === visit.id
                                    ? 'bg-purple-50 border-purple-500 shadow-md ring-1 ring-purple-500'
                                    : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{visit.patientName}</h3>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                        치료대기
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {visit.date ? new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                    {visit.diagnosis && (
                                        <span className="truncate max-w-[120px] text-slate-600">
                                            {visit.diagnosis}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: Detail & Action */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                {selectedVisit ? (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedVisit.patientName}</h2>
                                    <p className="text-slate-500 text-sm">
                                        치료실 입실 확인됨
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="space-y-8">
                                {/* Diagnosis Section */}
                                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4" /> 진단명 (Diagnosis)
                                    </h3>
                                    <p className="text-lg text-slate-800 font-medium leading-relaxed">
                                        {selectedVisit.diagnosis || <span className="text-slate-400 italic">입력된 진단명 없음</span>}
                                    </p>
                                </div>

                                {/* Orders Section */}
                                <div className="bg-white border-l-4 border-purple-500 rounded-r-xl p-6 shadow-sm bg-purple-50/30">
                                    <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4" /> 처방 및 오더 (Orders)
                                    </h3>
                                    <div className="prose prose-slate max-w-none text-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                                        {selectedVisit.treatmentNote || <span className="text-slate-400 italic">등록된 처방 메모가 없습니다.</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-4">
                            <button
                                onClick={() => setSelectedVisit(null)}
                                className="px-6 py-3 text-slate-500 hover:bg-slate-200 font-bold rounded-xl transition-colors"
                            >
                                닫기
                            </button>
                            <button
                                onClick={() => handleComplete(selectedVisit)}
                                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 flex items-center gap-2 transition-all transform hover:scale-105"
                            >
                                <CheckCircle className="w-5 h-5" />
                                치료 완료 (수납으로 이동)
                            </button>
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
            {/* Confirmation Modal */}
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
