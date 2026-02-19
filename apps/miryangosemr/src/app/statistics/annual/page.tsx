'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateDailyStats, aggregateMonthlyStats } from '@/lib/statistics-engine';
import { DailyStatistics, MonthlyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Users, TrendingUp,
  Calendar, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const AnnualChart = dynamic(() => import('./AnnualChart'), { ssr: false });

export default function AnnualStatsPage() {
  return <EMRLayout><AnnualStatsContent /></EMRLayout>;
}

interface MonthSummary {
  month: string;
  label: string;
  stats: MonthlyStatistics;
  workingDays: number;
  insuranceBilled: number;
  copayCollected: number;
}

function AnnualStatsContent() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadYearData(); }, [year]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const summaries: MonthSummary[] = [];
      const now = new Date();
      const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;

      for (let m = 1; m <= maxMonth; m++) {
        const daysInMonth = new Date(year, m, 0).getDate();
        const dailyStats: DailyStatistics[] = [];

        // Sample first day, mid-month, last day for speed (full scan would be too slow)
        const sampleDays = [1, Math.floor(daysInMonth / 2), daysInMonth];
        // For current month or if we want accuracy, query more days
        const isCurrentMonth = year === now.getFullYear() && m === now.getMonth() + 1;

        if (isCurrentMonth) {
          // Load all days for current month
          for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
            try {
              const stat = await calculateDailyStats(new Date(year, m - 1, d));
              if (stat.totalVisits > 0) dailyStats.push(stat);
            } catch { /* skip */ }
          }
        } else {
          // Load all days for past months
          for (let d = 1; d <= daysInMonth; d++) {
            try {
              const stat = await calculateDailyStats(new Date(year, m - 1, d));
              if (stat.totalVisits > 0) dailyStats.push(stat);
            } catch { /* skip */ }
          }
        }

        const monthlyStats = aggregateMonthlyStats(dailyStats);
        summaries.push({
          month: `${year}-${String(m).padStart(2, '0')}`,
          label: `${m}월`,
          stats: monthlyStats,
          workingDays: dailyStats.length,
          insuranceBilled: dailyStats.reduce((s, d) => s + d.insuranceBilled, 0),
          copayCollected: dailyStats.reduce((s, d) => s + d.copayCollected, 0),
        });
      }
      setMonthSummaries(summaries);
    } catch (e) {
      console.error('연간 통계 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const yearTotals = useMemo(() => {
    const totalVisits = monthSummaries.reduce((s, m) => s + m.stats.totalVisits, 0);
    const totalRevenue = monthSummaries.reduce((s, m) => s + m.stats.totalRevenue, 0);
    const totalInsurance = monthSummaries.reduce((s, m) => s + m.insuranceBilled, 0);
    const totalCopay = monthSummaries.reduce((s, m) => s + m.copayCollected, 0);
    const workingDays = monthSummaries.reduce((s, m) => s + m.workingDays, 0);
    const avgNewRate = monthSummaries.length > 0
      ? Math.round(monthSummaries.reduce((s, m) => s + m.stats.newPatientRate, 0) / monthSummaries.filter(m => m.stats.totalVisits > 0).length || 1)
      : 0;
    return {
      totalVisits, totalRevenue, totalInsurance, totalCopay, workingDays, avgNewRate,
      avgMonthlyVisits: monthSummaries.length > 0 ? Math.round(totalVisits / monthSummaries.filter(m => m.stats.totalVisits > 0).length || 1) : 0,
      avgMonthlyRevenue: monthSummaries.length > 0 ? Math.round(totalRevenue / monthSummaries.filter(m => m.stats.totalVisits > 0).length || 1) : 0,
    };
  }, [monthSummaries]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">연간 리포트</h1>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-slate-900">{year}년</span>
        <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">연간 데이터 집계 중... (최대 1~2분 소요)</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">연간 총 방문</p>
              </div>
              <p className="text-2xl font-bold">{yearTotals.totalVisits.toLocaleString()}<span className="text-sm text-slate-400">명</span></p>
              <p className="text-xs text-slate-400">월평균 {yearTotals.avgMonthlyVisits}명</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-400">연간 총 매출</p>
              </div>
              <p className="text-xl font-bold">{formatKRW(yearTotals.totalRevenue)}</p>
              <p className="text-xs text-slate-400">월평균 {formatKRW(yearTotals.avgMonthlyRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-slate-400">진료일수</p>
              </div>
              <p className="text-2xl font-bold">{yearTotals.workingDays}<span className="text-sm text-slate-400">일</span></p>
              <p className="text-xs text-slate-400">일평균 {yearTotals.workingDays > 0 ? Math.round(yearTotals.totalVisits / yearTotals.workingDays) : 0}명</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-slate-400">평균 신환율</p>
              </div>
              <p className="text-2xl font-bold">{yearTotals.avgNewRate}<span className="text-sm text-slate-400">%</span></p>
            </div>
          </div>

          {/* Charts */}
          {monthSummaries.some(m => m.stats.totalVisits > 0) && (
            <AnnualChart data={monthSummaries} />
          )}

          {/* Monthly Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-slate-800">월별 상세</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">월</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">진료일</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">총방문</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">일평균</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">총매출</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">보험청구</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">본인부담</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">신환율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthSummaries.map(m => (
                    <tr key={m.month} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800">
                        <Link href={`/statistics/monthly?m=${m.month}`} className="hover:text-emerald-600">
                          {m.label}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">{m.workingDays}일</td>
                      <td className="px-3 py-2 text-right font-bold">{m.stats.totalVisits}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{m.stats.avgDailyVisits}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatKRW(m.stats.totalRevenue)}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{formatKRW(m.insuranceBilled)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatKRW(m.copayCollected)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-xs font-bold ${m.stats.newPatientRate >= 20 ? 'text-emerald-600' : m.stats.newPatientRate >= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {m.stats.newPatientRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 font-bold">
                  <tr>
                    <td className="px-3 py-3">합계</td>
                    <td className="px-3 py-3 text-right">{yearTotals.workingDays}일</td>
                    <td className="px-3 py-3 text-right">{yearTotals.totalVisits.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-slate-500">{yearTotals.avgMonthlyVisits}</td>
                    <td className="px-3 py-3 text-right">{formatKRW(yearTotals.totalRevenue)}</td>
                    <td className="px-3 py-3 text-right text-blue-600">{formatKRW(yearTotals.totalInsurance)}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">{formatKRW(yearTotals.totalCopay)}</td>
                    <td className="px-3 py-3 text-right">{yearTotals.avgNewRate}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
