'use client';

import React, { useState, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit } from '@shared/types/clinical';
import { formatKRW } from '@/lib/fee-calculator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ClipboardList, Search, Download, Users,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';

export default function PatientSurveyPage() {
  return <EMRLayout><PatientSurveyContent /></EMRLayout>;
}

function PatientSurveyContent() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const snap = await getDocs(query(
        collection(db, 'visits'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'asc')
      ));
      setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit));
      setSearched(true);
    } catch (e) {
      console.error('환자조사표 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate statistics
  const stats = useMemo(() => {
    const uniquePatients = new Set(visits.map(v => v.patientId));
    const newPatients = visits.filter(v => v.type === 'new');
    const returnPatients = visits.filter(v => v.type === 'return');

    // By insurance type
    const byInsurance = {
      nhis: visits.filter(v => v.insuranceType === 'nhis'),
      auto: visits.filter(v => v.insuranceType === 'auto'),
      industrial: [] as Visit[],
      none: visits.filter(v => v.insuranceType === 'none' || !v.insuranceType),
    };

    // By day of week
    const byDayOfWeek = Array.from({ length: 7 }, (_, i) => ({
      day: ['일', '월', '화', '수', '목', '금', '토'][i],
      count: visits.filter(v => {
        const d = v.date && typeof v.date === 'object' && 'toDate' in v.date
          ? (v.date as { toDate: () => Date }).toDate() : null;
        return d && d.getDay() === i;
      }).length,
    }));

    // By month
    const byMonth = new Map<string, number>();
    visits.forEach(v => {
      const d = v.date && typeof v.date === 'object' && 'toDate' in v.date
        ? (v.date as { toDate: () => Date }).toDate() : null;
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      }
    });

    // Visit types breakdown
    const byVisitType = {
      consultation: visits.filter(v => ['consulting', 'completed', 'paid'].includes(v.status)).length,
      test: visits.filter(v => v.testOrder).length,
      treatment: visits.filter(v => v.treatmentNote).length,
      physicalTherapy: visits.filter(v => v.physicalTherapy).length,
    };

    const workingDays = new Set(visits.map(v => {
      const d = v.date && typeof v.date === 'object' && 'toDate' in v.date
        ? (v.date as { toDate: () => Date }).toDate() : null;
      return d ? d.toISOString().slice(0, 10) : '';
    }).filter(Boolean)).size;

    return {
      totalVisits: visits.length,
      uniquePatients: uniquePatients.size,
      newPatients: newPatients.length,
      returnPatients: returnPatients.length,
      byInsurance,
      byDayOfWeek,
      byMonth: Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)),
      byVisitType,
      workingDays,
      avgDaily: workingDays > 0 ? Math.round(visits.length / workingDays) : 0,
    };
  }, [visits]);

  const handleExportCSV = () => {
    const headers = ['구분', '항목', '수치'];
    const rows = [
      ['총괄', '총 내원건수', stats.totalVisits],
      ['총괄', '실인원(환자수)', stats.uniquePatients],
      ['총괄', '초진', stats.newPatients],
      ['총괄', '재진', stats.returnPatients],
      ['총괄', '진료일수', stats.workingDays],
      ['총괄', '일평균 내원', stats.avgDaily],
      ['보험유형', '건강보험', stats.byInsurance.nhis.length],
      ['보험유형', '자동차보험', stats.byInsurance.auto.length],
      ['보험유형', '산재보험', stats.byInsurance.industrial.length],
      ['보험유형', '일반/비급여', stats.byInsurance.none.length],
      ['진료유형', '진료', stats.byVisitType.consultation],
      ['진료유형', '검사', stats.byVisitType.test],
      ['진료유형', '치료', stats.byVisitType.treatment],
      ['진료유형', '물리치료', stats.byVisitType.physicalTherapy],
      ...stats.byDayOfWeek.map(d => ['요일별', d.day + '요일', d.count]),
      ...stats.byMonth.map(([m, c]) => ['월별', m, c]),
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `환자조사표_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-600" /> 환자조사표
          </h1>
          <p className="text-sm text-slate-500">외래 환자 현황 통계 보고서</p>
        </div>
      </div>

      {/* Search */}
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
          <button onClick={handleSearch} disabled={loading}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            조회
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : searched && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">실인원(환자수)</p>
              </div>
              <p className="text-2xl font-bold">{stats.uniquePatients}<span className="text-sm text-slate-400">명</span></p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-400">총 내원건수</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalVisits}<span className="text-sm text-slate-400">건</span></p>
              <p className="text-xs text-slate-400">일평균 {stats.avgDaily}건</p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-600 font-bold mb-1">초진</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.newPatients}<span className="text-sm">명</span></p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 font-bold mb-1">재진</p>
              <p className="text-2xl font-bold text-blue-700">{stats.returnPatients}<span className="text-sm">명</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insurance Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4">보험유형별 현황</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium text-slate-500">보험구분</th>
                    <th className="py-2 text-right font-medium text-slate-500">내원건수</th>
                    <th className="py-2 text-right font-medium text-slate-500">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { label: '건강보험', data: stats.byInsurance.nhis, variant: 'info' as const },
                    { label: '자동차보험', data: stats.byInsurance.auto, variant: 'warning' as const },
                    { label: '산재보험', data: stats.byInsurance.industrial, variant: 'danger' as const },
                    { label: '일반/비급여', data: stats.byInsurance.none, variant: 'default' as const },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="py-2">
                        <Badge variant={row.variant} className="text-[10px]">{row.label}</Badge>
                      </td>
                      <td className="py-2 text-right font-bold">{row.data.length}건</td>
                      <td className="py-2 text-right text-slate-500">
                        {stats.totalVisits > 0 ? Math.round((row.data.length / stats.totalVisits) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 font-bold">
                  <tr>
                    <td className="py-2">합계</td>
                    <td className="py-2 text-right">{stats.totalVisits}건</td>
                    <td className="py-2 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visit Type Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4">진료유형별 현황</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium text-slate-500">유형</th>
                    <th className="py-2 text-right font-medium text-slate-500">건수</th>
                    <th className="py-2 text-right font-medium text-slate-500">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { label: '진료(진찰)', value: stats.byVisitType.consultation },
                    { label: '검사', value: stats.byVisitType.test },
                    { label: '치료/처치', value: stats.byVisitType.treatment },
                    { label: '물리치료', value: stats.byVisitType.physicalTherapy },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="py-2 text-slate-700">{row.label}</td>
                      <td className="py-2 text-right font-bold">{row.value}건</td>
                      <td className="py-2 text-right text-slate-500">
                        {stats.totalVisits > 0 ? Math.round((row.value / stats.totalVisits) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Day of Week */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4">요일별 분포</h3>
              <div className="space-y-2">
                {stats.byDayOfWeek.map(d => {
                  const maxCount = Math.max(...stats.byDayOfWeek.map(dd => dd.count));
                  const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className={`text-xs w-8 font-bold ${d.day === '일' ? 'text-red-500' : d.day === '토' ? 'text-blue-500' : 'text-slate-500'}`}>{d.day}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-10 text-right">{d.count}건</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Breakdown */}
            {stats.byMonth.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4">월별 추이</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium text-slate-500">월</th>
                      <th className="py-2 text-right font-medium text-slate-500">내원건수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.byMonth.map(([m, count]) => (
                      <tr key={m}>
                        <td className="py-2 text-slate-700">{m}</td>
                        <td className="py-2 text-right font-bold">{count}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button onClick={handleExportCSV}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV 내보내기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
