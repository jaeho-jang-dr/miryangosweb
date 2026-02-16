'use client';

import React, { useState, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { getStatisticsRange, aggregateMonthlyStats } from '@/lib/statistics-engine';
import { DailyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';
import {
  ArrowLeft, Search, Users, TrendingUp, Calendar,
  CreditCard, Download,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DailyChart = dynamic(() => import('../daily/DailyChart'), { ssr: false });

export default function CustomStatsPage() {
  return <EMRLayout><CustomStatsContent /></EMRLayout>;
}

function CustomStatsContent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<DailyStatistics[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');

  const handleSearch = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const results = await getStatisticsRange(new Date(startDate), new Date(endDate));
      setData(results);
    } catch (e) {
      console.error('기간별 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(d => d.totalVisits > 0);
  }, [data, insuranceFilter]);

  const summary = useMemo(() => {
    if (filteredData.length === 0) return null;
    return aggregateMonthlyStats(filteredData);
  }, [filteredData]);

  const totals = useMemo(() => {
    if (filteredData.length === 0) return null;
    return {
      totalVisits: filteredData.reduce((s, d) => s + d.totalVisits, 0),
      newPatients: filteredData.reduce((s, d) => s + d.newPatients, 0),
      returnPatients: filteredData.reduce((s, d) => s + d.returnPatients, 0),
      totalRevenue: filteredData.reduce((s, d) => s + d.totalRevenue, 0),
      insuranceBilled: filteredData.reduce((s, d) => s + d.insuranceBilled, 0),
      copayCollected: filteredData.reduce((s, d) => s + d.copayCollected, 0),
      workingDays: filteredData.length,
    };
  }, [filteredData]);

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const headers = ['날짜', '방문', '신환', '재진', '매출', '보험청구', '본인부담'];
    const rows = filteredData.map(d => [
      d.date, d.totalVisits, d.newPatients, d.returnPatients,
      d.totalRevenue, d.insuranceBilled, d.copayCollected,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `통계_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">기간별 조회</h1>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">종료일</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            {/* Quick period buttons */}
            {[
              { label: '이번달', fn: () => { const d = new Date(); setStartDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`); setEndDate(d.toISOString().slice(0,10)); }},
              { label: '지난달', fn: () => { const d = new Date(); d.setMonth(d.getMonth()-1); const y = d.getFullYear(); const m = d.getMonth()+1; setStartDate(`${y}-${String(m).padStart(2,'0')}-01`); setEndDate(`${y}-${String(m).padStart(2,'0')}-${new Date(y,m,0).getDate()}`); }},
              { label: '최근3개월', fn: () => { const e = new Date(); const s = new Date(); s.setMonth(s.getMonth()-3); setStartDate(s.toISOString().slice(0,10)); setEndDate(e.toISOString().slice(0,10)); }},
            ].map(q => (
              <button key={q.label} onClick={q.fn}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                {q.label}
              </button>
            ))}
          </div>
          <button onClick={handleSearch} disabled={!startDate || !endDate || loading}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            조회
          </button>
        </div>
      </div>

      {/* Results */}
      {data !== null && !loading && (
        <>
          {totals && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <p className="text-xs text-slate-400">조회기간</p>
                  </div>
                  <p className="text-lg font-bold">{startDate} ~ {endDate}</p>
                  <p className="text-xs text-slate-400">{totals.workingDays}일 진료</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-slate-400">총 방문</p>
                  </div>
                  <p className="text-2xl font-bold">{totals.totalVisits}<span className="text-sm text-slate-400">명</span></p>
                  <p className="text-xs text-slate-400">신환 {totals.newPatients} / 재진 {totals.returnPatients}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs text-slate-400">총 매출</p>
                  </div>
                  <p className="text-xl font-bold">{formatKRW(totals.totalRevenue)}</p>
                  <p className="text-xs text-slate-400">일평균 {formatKRW(Math.round(totals.totalRevenue / totals.workingDays))}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-slate-400">보험/본인부담</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">{formatKRW(totals.insuranceBilled)}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatKRW(totals.copayCollected)}</p>
                </div>
              </div>

              {/* Charts */}
              <DailyChart data={filteredData} />

              {/* Export Button */}
              <div className="flex justify-end">
                <button onClick={handleExportCSV}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                  <Download className="w-4 h-4" /> CSV 내보내기
                </button>
              </div>

              {/* Detail Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-slate-800">일별 상세 ({filteredData.length}일)</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">날짜</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">요일</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">방문</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">신환</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">재진</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">매출</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">보험</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">본인부담</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map(d => {
                        const date = new Date(d.date);
                        const dayLabel = dayLabels[date.getDay()];
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <tr key={d.date} className={`hover:bg-slate-50 ${isWeekend ? (date.getDay() === 0 ? 'bg-red-50/30' : 'bg-blue-50/30') : ''}`}>
                            <td className="px-3 py-2 font-mono text-xs">{d.date}</td>
                            <td className={`px-3 py-2 text-xs ${date.getDay() === 0 ? 'text-red-500 font-bold' : date.getDay() === 6 ? 'text-blue-500' : ''}`}>{dayLabel}</td>
                            <td className="px-3 py-2 text-right font-bold">{d.totalVisits}</td>
                            <td className="px-3 py-2 text-right text-emerald-600">{d.newPatients}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{d.returnPatients}</td>
                            <td className="px-3 py-2 text-right font-bold">{formatKRW(d.totalRevenue)}</td>
                            <td className="px-3 py-2 text-right text-blue-600">{formatKRW(d.insuranceBilled)}</td>
                            <td className="px-3 py-2 text-right text-emerald-600">{formatKRW(d.copayCollected)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredData.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 font-bold sticky bottom-0">
                        <tr>
                          <td className="px-3 py-3" colSpan={2}>합계</td>
                          <td className="px-3 py-3 text-right">{totals.totalVisits}</td>
                          <td className="px-3 py-3 text-right text-emerald-600">{totals.newPatients}</td>
                          <td className="px-3 py-3 text-right text-slate-500">{totals.returnPatients}</td>
                          <td className="px-3 py-3 text-right">{formatKRW(totals.totalRevenue)}</td>
                          <td className="px-3 py-3 text-right text-blue-600">{formatKRW(totals.insuranceBilled)}</td>
                          <td className="px-3 py-3 text-right text-emerald-600">{formatKRW(totals.copayCollected)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}

          {filteredData.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              해당 기간에 진료 데이터가 없습니다.
            </div>
          )}
        </>
      )}

      {data === null && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
          기간을 선택하고 조회 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}
