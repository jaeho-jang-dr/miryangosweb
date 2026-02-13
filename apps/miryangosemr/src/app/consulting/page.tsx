'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@shared/lib/firebase-clinical';
import { Visit } from '@shared/types/clinical';
import { useRouter } from 'next/navigation';
import { Clock, User, ChevronRight, Activity, Calendar, Mic } from 'lucide-react';
import PatientStatusBadges from '@/components/clinical/PatientStatusBadges';
import EMRLayout from '@/components/layout/EMRLayout';

export default function ConsultingPage() {
    return (
        <EMRLayout>
            <ConsultingPageContent />
        </EMRLayout>
    );
}

function ConsultingPageContent() {
    const router = useRouter();
    const [waitingList, setWaitingList] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Server-side filter: only fetch reception/consulting visits (3.6 optimization)
        const q = query(
            collection(db, 'visits'),
            where('status', 'in', ['reception', 'consulting']),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeVisits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            setWaitingList(activeVisits);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSelectPatient = (visitId: string) => {
        router.push(`/consulting/${visitId}`);
    };

    const inRoom = waitingList.filter(v => v.status === 'consulting');
    const waiting = waitingList.filter(v => v.status === 'reception');

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-8 h-8 text-emerald-600" />
                    외래 진료 대기실
                </h1>
                <p className="text-slate-500 mt-1">
                    현재 진료 중인 환자와 대기 환자 목록입니다.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section 1: In Room (Priority) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                            진료 중 (In Room)
                        </h2>
                        <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {inRoom.length}명
                        </span>
                    </div>

                    <div className="space-y-4">
                        {inRoom.length > 0 ? inRoom.map(visit => (
                            <div
                                key={visit.id}
                                onClick={() => handleSelectPatient(visit.id)}
                                className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity className="w-24 h-24 text-blue-600" />
                                </div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{visit.patientName}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                                            <Clock className="w-3 h-3" />
                                            접수: {visit.date ? new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </p>
                                        <PatientStatusBadges visit={visit} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/voice-chart?visitId=${visit.id}&patientName=${encodeURIComponent(visit.patientName)}`);
                                            }}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                                        >
                                            <Mic className="w-4 h-4" /> 음성진료
                                        </button>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-md group-hover:bg-blue-700 transition-colors flex items-center gap-2">
                                            차트 열기 <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
                                <p>현재 진료 중인 환자가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Section 2: Waiting Queue */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            진료 대기 (Waiting)
                        </h2>
                        <span className="text-sm font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {waiting.length}명
                        </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : waiting.length > 0 ? waiting.map((visit, index) => (
                            <div
                                key={visit.id}
                                onClick={() => handleSelectPatient(visit.id)}
                                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{visit.patientName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                            <span>
                                                {visit.date ? new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                            {visit.type === 'new' && <span className="text-emerald-600 font-medium">신규</span>}
                                        </div>
                                        <PatientStatusBadges visit={visit} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/voice-chart?visitId=${visit.id}&patientName=${encodeURIComponent(visit.patientName)}`);
                                        }}
                                        className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors opacity-0 group-hover:opacity-100"
                                        title="음성 진료"
                                    >
                                        <Mic className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-slate-400">
                                <p>대기 중인 환자가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
