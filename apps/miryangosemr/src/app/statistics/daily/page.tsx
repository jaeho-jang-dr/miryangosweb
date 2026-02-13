'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateDailyStats } from '@/lib/statistics-engine';
import { DailyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DailyChart = dynamic(() => import('./DailyChart'), { ssr: false });

export default function DailyStatsPage() {
  return <EMRLayout><DailyStatsContent /></EMRLayout>;
}

function DailyStatsContent() {
  const [weekData, setWeekData] = useState<DailyStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseDate, setBaseDate] = useState(new Date());

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const d = new Date(baseDate);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [baseDate]);

  useEffect(() => {
    loadWeekStats();
  }, [weekDates]);

  const loadWeekStats = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        weekDates.map(date => calculateDailyStats(date).catch(() => ({
          date: date.toISOString().slice(0, 10),
          totalVisits: 0, newPatients: 0, returnPatients: 0,
          totalRevenue: 0, insuranceBilled: 0, copayCollected: 0,
          visitsByType: { consultation: 0, test: 0, treatment: 0, physicalTherapy: 0 },
          visitsByInsurance: { nhis: 0, auto: 0, industrial: 0, none: 0 },
        } as DailyStatistics)))
      );
      setWeekData(results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  };
  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  };

  const weekTotal = useMemo(() => ({
    visits: weekData.reduce((s, d) => s + d.totalVisits, 0),
    revenue: weekData.reduce((s, d) => s + d.totalRevenue, 0),
    newPatients: weekData.reduce((s, d) => s + d.newPatients, 0),
  }), [weekData]);

  const weekLabel = weekDates.length === 7
    ? `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()} ~ ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`
    : '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">일별 리포트</h1>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3">
        <button onClick={prevWeek} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
        <span className="font-bold text-slate-800">{weekLabel}</span>
        <button onClick={nextWeek} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
          <p className="text-xs text-slate-400 mb-1">주간 총 방문</p>
          <p className="text-2xl font-bold text-slate-900">{weekTotal.visits}명</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
          <p className="text-xs text-slate-400 mb-1">주간 총 매출</p>
          <p className="text-2xl font-bold text-slate-900">{formatKRW(weekTotal.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
          <p className="text-xs text-slate-400 mb-1">주간 신환</p>
          <p className="text-2xl font-bold text-slate-900">{weekTotal.newPatients}명</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">주간 통계 로딩 중...</div>
      ) : (
        <DailyChart data={weekData} />
      )}

      {/* Daily Detail Table */}
      {!loading && weekData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-4 py-3 text-left font-medium">날짜</th>
                <th className="px-4 py-3 text-right font-medium">방문</th>
                <th className="px-4 py-3 text-right font-medium">신환</th>
                <th className="px-4 py-3 text-right font-medium">재진</th>
                <th className="px-4 py-3 text-right font-medium">매출</th>
                <th className="px-4 py-3 text-right font-medium">보험청구</th>
                <th className="px-4 py-3 text-right font-medium">본인부담</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((d, i) => {
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                const date = new Date(d.date);
                const dayName = dayNames[date.getDay()];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <tr key={i} className={`border-t border-slate-100 ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.date} ({dayName})
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{d.totalVisits}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{d.newPatients}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.returnPatients}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatKRW(d.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatKRW(d.insuranceBilled)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatKRW(d.copayCollected)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
