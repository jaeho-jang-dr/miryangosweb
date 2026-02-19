'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateDailyStats } from '@/lib/statistics-engine';
import { DailyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Users, TrendingUp,
  CreditCard, AlertTriangle, Percent, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MonthlyChart = dynamic(() => import('./MonthlyChart'), { ssr: false });

export default function MonthlyStatsPage() {
  return <EMRLayout><MonthlyStatsContent /></EMRLayout>;
}

function MonthlyStatsContent() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailyData, setDailyData] = useState<DailyStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMonthData(); }, [month]);

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = `${y}년 ${m}월`;

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const results: DailyStatistics[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(y, m - 1, day);
        if (date > new Date()) break;
        try {
          const stat = await calculateDailyStats(date);
          if (stat.totalVisits > 0) results.push(stat);
        } catch { /* skip days with no data */ }
      }
      setDailyData(results);
    } catch (e) {
      console.error('월별 통계 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalVisits = dailyData.reduce((s, d) => s + d.totalVisits, 0);
    const newPatients = dailyData.reduce((s, d) => s + d.newPatients, 0);
    const returnPatients = dailyData.reduce((s, d) => s + d.returnPatients, 0);
    const totalRevenue = dailyData.reduce((s, d) => s + d.totalRevenue, 0);
    const insuranceBilled = dailyData.reduce((s, d) => s + d.insuranceBilled, 0);
    const copayCollected = dailyData.reduce((s, d) => s + d.copayCollected, 0);
    const workingDays = dailyData.length;
    return {
      totalVisits, newPatients, returnPatients,
      totalRevenue, insuranceBilled, copayCollected,
      workingDays,
      avgDailyVisits: workingDays > 0 ? Math.round(totalVisits / workingDays) : 0,
      avgDailyRevenue: workingDays > 0 ? Math.round(totalRevenue / workingDays) : 0,
      newPatientRate: totalVisits > 0 ? Math.round((newPatients / totalVisits) * 100) : 0,
    };
  }, [dailyData]);

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">월별 리포트</h1>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-slate-900">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">총 방문</p>
              </div>
              <p className="text-2xl font-bold">{totals.totalVisits}<span className="text-sm text-slate-400 ml-1">명</span></p>
              <p className="text-xs text-slate-400">일평균 {totals.avgDailyVisits}명 ({totals.workingDays}일)</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-400">총 매출</p>
              </div>
              <p className="text-xl font-bold">{formatKRW(totals.totalRevenue)}</p>
              <p className="text-xs text-slate-400">일평균 {formatKRW(totals.avgDailyRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">보험청구</p>
              </div>
              <p className="text-xl font-bold text-blue-600">{formatKRW(totals.insuranceBilled)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-slate-400">본인부담 수납</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatKRW(totals.copayCollected)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-slate-400">신환 비율</p>
              </div>
              <p className="text-2xl font-bold">{totals.newPatientRate}<span className="text-sm text-slate-400">%</span></p>
              <p className="text-xs text-slate-400">신환 {totals.newPatients} / 재진 {totals.returnPatients}</p>
            </div>
          </div>

          {/* Charts */}
          {dailyData.length > 0 && <MonthlyChart data={dailyData} />}

          {/* Daily Breakdown Table */}
          {dailyData.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-bold text-slate-800">일별 상세</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">날짜</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">요일</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">방문</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">신환</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">재진</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">총매출</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">보험청구</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">본인부담</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.map(d => {
                      const date = new Date(d.date);
                      const dayLabel = dayLabels[date.getDay()];
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <tr key={d.date} className={`hover:bg-slate-50 ${isWeekend ? (date.getDay() === 0 ? 'bg-red-50/30' : 'bg-blue-50/30') : ''}`}>
                          <td className="px-3 py-2 font-mono text-xs">{d.date.slice(5)}</td>
                          <td className={`px-3 py-2 text-xs ${date.getDay() === 0 ? 'text-red-500 font-bold' : date.getDay() === 6 ? 'text-blue-500' : ''}`}>{dayLabel}</td>
                          <td className="px-3 py-2 text-right font-bold">{d.totalVisits}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{d.newPatients}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{d.returnPatients}</td>
                          <td className="px-3 py-2 text-right font-bold">{formatKRW(d.totalRevenue)}</td>
                          <td className="px-3 py-2 text-right text-blue-600">{formatKRW(d.insuranceBilled)}</td>
                          <td className="px-3 py-2 text-right text-amber-600">{formatKRW(d.copayCollected)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 font-bold">
                    <tr>
                      <td className="px-3 py-3" colSpan={2}>합계 ({totals.workingDays}일)</td>
                      <td className="px-3 py-3 text-right">{totals.totalVisits}</td>
                      <td className="px-3 py-3 text-right text-emerald-600">{totals.newPatients}</td>
                      <td className="px-3 py-3 text-right text-slate-500">{totals.returnPatients}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.totalRevenue)}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{formatKRW(totals.insuranceBilled)}</td>
                      <td className="px-3 py-3 text-right text-amber-600">{formatKRW(totals.copayCollected)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              {monthLabel}에 진료 데이터가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
