
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Users, Clock, AlertCircle, Calendar, FileText, Activity, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { startOfDay } from 'date-fns';
import { Visit } from '@/types/clinical';

export default function ClinicalDashboard() {
    const [stats, setStats] = useState({
        total: 0,
        waiting: 0,
        completed: 0,
        consulting: 0
    });
    const [waitingList, setWaitingList] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time subscription to today's visits
        const today = startOfDay(new Date());

        const q = query(
            collection(db, 'visits'),
            where('date', '>=', today),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            setWaitingList(visits);

            // Calculate stats
            setStats({
                total: visits.length,
                waiting: visits.filter(v => v.status === 'reception').length,
                consulting: visits.filter(v => v.status === 'consulting').length,
                completed: visits.filter(v => v.status === 'completed').length
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Helper for formatting time
    const formatTime = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">진료 대시보드</h1>
                    <p className="text-slate-500 text-sm">오늘의 병원 현황을 한눈에 확인하세요.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">실시간 데이터</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="금일 접수"
                    value={stats.total.toString()}
                    subtext="오늘 총 방문객"
                    icon={<Calendar className="w-6 h-6 text-blue-500" />}
                    color="blue"
                />
                <StatCard
                    title="대기 환자"
                    value={stats.waiting.toString()}
                    subtext="진료 대기 중"
                    icon={<Clock className="w-6 h-6 text-orange-500" />}
                    color="orange"
                />
                <StatCard
                    title="진료 중"
                    value={stats.consulting.toString()}
                    subtext="현재 진료실"
                    icon={<Stethoscope className="w-6 h-6 text-purple-500" />}
                    color="purple"
                />
                <StatCard
                    title="진료 완료"
                    value={stats.completed.toString()}
                    subtext="귀가 완료"
                    icon={<Users className="w-6 h-6 text-emerald-500" />}
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                            실시간 대기 현황
                            {stats.waiting > 0 && (
                                <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                                    {stats.waiting}명 대기중
                                </span>
                            )}
                        </h3>
                        <div className="overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-500">순번</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">이름</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">상태</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">접수시간</th>
                                        <th className="px-4 py-3 font-medium text-slate-500 text-right">진료실</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400">데이터를 불러오는 중...</td>
                                        </tr>
                                    ) : waitingList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400">오늘 접수된 환자가 없습니다.</td>
                                        </tr>
                                    ) : (
                                        waitingList.map((visit, index) => (
                                            <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-slate-900 font-medium">{index + 1}</td>
                                                <td className="px-4 py-3 text-slate-700 font-bold">{visit.patientName}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                        ${visit.status === 'reception' ? 'bg-yellow-100 text-yellow-800' :
                                                            visit.status === 'consulting' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-emerald-100 text-emerald-800'}`}>
                                                        {visit.status === 'reception' ? '대기중' :
                                                            visit.status === 'consulting' ? '진료중' : '완료'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{formatTime(visit.date)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {visit.status === 'reception' ? (
                                                        <Link href={`/clinical/consulting/${visit.id}`} className="text-xs font-medium text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                                                            호출
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <div className="mt-4 text-center border-t border-slate-100 pt-4">
                                <Link href="/clinical/reception" className="text-sm text-emerald-600 font-medium hover:underline flex items-center justify-center gap-1">
                                    <Activity className="w-4 h-4" /> 전체 대기열 관리 (원무과) 이동
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Recent */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">빠른 실행</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/clinical/patients/new" className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                                <Users className="w-6 h-6 mb-2" />
                                <span className="text-sm font-semibold">신환 등록</span>
                            </Link>
                            <Link href="/clinical/reception" className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors">
                                <FileText className="w-6 h-6 mb-2" />
                                <span className="text-sm font-semibold">접수/수납</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-900/20 p-6 text-white overflow-hidden relative">
                        <Activity className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-emerald-500/50" />
                        <h3 className="text-lg font-bold mb-2 relative z-10">오늘의 진료 목표</h3>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-bold">{stats.completed}</span>
                            <span className="text-emerald-200 mb-1">/ 50명</span>
                        </div>
                        <div className="w-full bg-emerald-800/50 h-2 mt-4 rounded-full overflow-hidden relative z-10">
                            <div className="bg-white h-full transition-all duration-1000" style={{ width: `${Math.min((stats.completed / 50) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtext, icon, color }: any) {
    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between relative overflow-hidden group hover:border-${color}-200 transition-all`}>
            <div className={`absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity bg-${color}-500/20 rounded-bl-3xl w-24 h-24 -mr-4 -mt-4 pointer-events-none`}></div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">{value}</h3>
                <p className={`text-xs font-medium text-${color}-600`}>{subtext}</p>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                {icon}
            </div>
        </div>
    )
}
