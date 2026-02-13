'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateDailyStats } from '@/lib/statistics-engine';
import { DailyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';
import { BarChart3, Users, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StatisticsPage() {
  return <EMRLayout><StatisticsContent /></EMRLayout>;
}

function StatisticsContent() {
  const [todayStats, setTodayStats] = useState<DailyStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await calculateDailyStats(new Date());
      setTodayStats(stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">통계/리포트</h1>
        <p className="text-sm text-slate-500">병원 운영 통계를 확인합니다.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/statistics/daily" className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div><p className="text-xs text-slate-400">일별</p><p className="font-bold text-slate-900">일별 리포트</p></div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </Link>
        <Link href="/statistics/monthly" className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div><p className="text-xs text-slate-400">월별</p><p className="font-bold text-slate-900">월별 리포트</p></div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </Link>
        <Link href="/statistics/annual" className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div><p className="text-xs text-slate-400">연간</p><p className="font-bold text-slate-900">연간 리포트</p></div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </Link>
        <Link href="/statistics/custom" className="bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div><p className="text-xs text-slate-400">사용자 정의</p><p className="font-bold text-slate-900">기간별 조회</p></div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </Link>
      </div>

      {/* Today's Stats */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">통계 로딩 중...</div>
      ) : todayStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="오늘 방문" value={todayStats.totalVisits.toString()} icon={<Users className="w-5 h-5" />} color="blue" />
            <StatCard label="신환" value={todayStats.newPatients.toString()} icon={<Users className="w-5 h-5" />} color="emerald" />
            <StatCard label="재진" value={todayStats.returnPatients.toString()} icon={<Users className="w-5 h-5" />} color="purple" />
            <StatCard label="매출" value={formatKRW(todayStats.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3">진료 유형별</h3>
              <div className="space-y-2">
                <BarRow label="진료" value={todayStats.visitsByType.consultation} max={todayStats.totalVisits} color="bg-blue-500" />
                <BarRow label="검사" value={todayStats.visitsByType.test} max={todayStats.totalVisits} color="bg-orange-500" />
                <BarRow label="치료" value={todayStats.visitsByType.treatment} max={todayStats.totalVisits} color="bg-purple-500" />
                <BarRow label="물리치료" value={todayStats.visitsByType.physicalTherapy} max={todayStats.totalVisits} color="bg-emerald-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3">보험 유형별</h3>
              <div className="space-y-2">
                <BarRow label="건강보험" value={todayStats.visitsByInsurance.nhis} max={todayStats.totalVisits} color="bg-blue-500" />
                <BarRow label="자동차보험" value={todayStats.visitsByInsurance.auto} max={todayStats.totalVisits} color="bg-orange-500" />
                <BarRow label="산재보험" value={todayStats.visitsByInsurance.industrial} max={todayStats.totalVisits} color="bg-red-500" />
                <BarRow label="일반/비급여" value={todayStats.visitsByInsurance.none} max={todayStats.totalVisits} color="bg-slate-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
      <div><p className="text-xs font-medium text-slate-500 mb-1">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div>
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}</span>
    </div>
  );
}
