'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Clock, Calendar, Activity, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { startOfDay, subDays } from 'date-fns';
import { Visit } from '@shared/types/clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <EMRLayout>
      <DashboardContent />
    </EMRLayout>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState({ total: 0, waiting: 0, completed: 0, consulting: 0 });
  const [waitingList, setWaitingList] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = subDays(startOfDay(new Date()), 7);
    const q = query(
      collection(db, 'visits'),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Visit[];
      setWaitingList(visits);
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

  const formatTime = (timestamp: { toDate?: () => Date; seconds?: number }) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date((timestamp.seconds || 0) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">진료 대시보드</h1>
          <p className="text-slate-500 text-sm">오늘의 병원 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString('ko-KR')}</div>
          <div className="text-xs text-slate-500">실시간 데이터</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="금일 접수" value={stats.total} icon={<Calendar className="w-5 h-5" />} color="blue" />
        <StatCard title="대기 환자" value={stats.waiting} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard title="진료 중" value={stats.consulting} icon={<Stethoscope className="w-5 h-5" />} color="purple" />
        <StatCard title="진료 완료" value={stats.completed} icon={<Users className="w-5 h-5" />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">실시간 대기 현황</h3>
              {stats.waiting > 0 && (
                <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                  {stats.waiting}명 대기중
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-500">순번</th>
                    <th className="px-4 py-3 font-medium text-slate-500">이름</th>
                    <th className="px-4 py-3 font-medium text-slate-500">상태</th>
                    <th className="px-4 py-3 font-medium text-slate-500">접수시간</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-right">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">데이터를 불러오는 중...</td></tr>
                  ) : waitingList.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">오늘 접수된 환자가 없습니다.</td></tr>
                  ) : (
                    waitingList.map((visit, index) => (
                      <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 text-slate-700 font-bold">{visit.patientName}</td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            visit.status === 'reception' ? 'warning' :
                            visit.status === 'consulting' ? 'info' :
                            visit.status === 'treatment' ? 'purple' :
                            visit.status === 'testing' ? 'warning' :
                            'success'
                          }>
                            {visit.status === 'reception' ? '대기중' :
                              visit.status === 'consulting' ? '진료중' :
                              visit.status === 'treatment' ? '치료중' :
                              visit.status === 'testing' ? '검사중' : '완료'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatTime(visit.date)}</td>
                        <td className="px-4 py-3 text-right">
                          {visit.status === 'reception' ? (
                            <Link href={`/consulting/${visit.id}`} className="text-xs font-medium text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-md">
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
            </div>
            <div className="p-3 text-center border-t border-slate-100">
              <Link href="/reception" className="text-sm text-emerald-600 font-medium hover:underline flex items-center justify-center gap-1">
                <Activity className="w-4 h-4" /> 전체 대기열 관리
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">빠른 실행</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/patients/new" className="flex flex-col items-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">신환 등록</span>
              </Link>
              <Link href="/reception" className="flex flex-col items-center p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                <Activity className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">접수/수납</span>
              </Link>
              <Link href="/chart" className="flex flex-col items-center p-3 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                <Stethoscope className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">통합 차트</span>
              </Link>
              <Link href="/billing" className="flex flex-col items-center p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
                <Calendar className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">수납/청구</span>
              </Link>
            </div>
          </div>

          <div className="bg-emerald-600 rounded-xl shadow-lg p-5 text-white relative overflow-hidden">
            <Activity className="absolute right-[-16px] bottom-[-16px] w-24 h-24 text-emerald-500/40" />
            <h3 className="font-bold mb-2 relative z-10">오늘의 진료 목표</h3>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-3xl font-bold">{stats.completed}</span>
              <span className="text-emerald-200 mb-0.5">/ 50명</span>
            </div>
            <div className="w-full bg-emerald-800/50 h-2 mt-3 rounded-full overflow-hidden relative z-10">
              <div className="bg-white h-full transition-all duration-1000" style={{ width: `${Math.min((stats.completed / 50) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-lg ${colors[color] || colors.blue}`}>{icon}</div>
    </div>
  );
}
