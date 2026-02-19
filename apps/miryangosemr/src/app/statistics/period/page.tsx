'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit } from '@shared/types/clinical';
import { BillingRecord } from '@/types/billing';
import { formatKRW } from '@/lib/fee-calculator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Search, Users, UserPlus, UserCheck,
  Stethoscope, Download, Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function PeriodPatientStatsPage() {
  return <EMRLayout><PeriodPatientContent /></EMRLayout>;
}

interface PatientVisitSummary {
  patientId: string;
  patientName: string;
  chartNo: string;
  insuranceType: string;
  visitType: 'new' | 'return';
  visitCount: number;
  firstVisit: string;
  lastVisit: string;
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  prescriptionType: 'internal' | 'external' | 'both' | 'none';
}

function PeriodPatientContent() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [billings, setBillings] = useState<BillingRecord[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const [visitsSnap, billingsSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'visits'),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end)),
          orderBy('date', 'asc')
        )),
        getDocs(query(
          collection(db, 'billing'),
          where('billedAt', '>=', Timestamp.fromDate(start)),
          where('billedAt', '<=', Timestamp.fromDate(end))
        )),
      ]);

      setVisits(visitsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit));
      setBillings(billingsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord));
    } catch (e) {
      console.error('기간별 환자현황 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleSearch(); }, []);

  // Aggregate by patient
  const patientSummaries = useMemo(() => {
    const map = new Map<string, PatientVisitSummary>();
    visits.forEach(v => {
      const existing = map.get(v.patientId);
      const visitDate = v.date && typeof v.date === 'object' && 'toDate' in v.date
        ? (v.date as { toDate: () => Date }).toDate().toISOString().slice(0, 10) : '';

      if (existing) {
        existing.visitCount += 1;
        if (visitDate && visitDate < existing.firstVisit) existing.firstVisit = visitDate;
        if (visitDate && visitDate > existing.lastVisit) existing.lastVisit = visitDate;
      } else {
        map.set(v.patientId, {
          patientId: v.patientId,
          patientName: v.patientName || '(이름없음)',
          chartNo: '',
          insuranceType: v.insuranceType || 'nhis',
          visitType: v.type === 'new' ? 'new' : 'return',
          visitCount: 1,
          firstVisit: visitDate,
          lastVisit: visitDate,
          totalAmount: 0,
          insuranceAmount: 0,
          copayAmount: 0,
          prescriptionType: 'none',
        });
      }
    });

    // Merge billing data
    billings.forEach(b => {
      const p = map.get(b.patientId);
      if (p) {
        p.totalAmount += b.totalAmount;
        p.insuranceAmount += b.insuranceAmount;
        p.copayAmount += b.copayAmount;
      }
    });

    return Array.from(map.values());
  }, [visits, billings]);

  // Apply filters
  const filtered = useMemo(() => {
    return patientSummaries.filter(p => {
      if (insuranceFilter !== 'all' && p.insuranceType !== insuranceFilter) return false;
      if (typeFilter === 'new' && p.visitType !== 'new') return false;
      if (typeFilter === 'return' && p.visitType !== 'return') return false;
      return true;
    });
  }, [patientSummaries, insuranceFilter, typeFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const totalPatients = filtered.length;
    const newPatients = filtered.filter(p => p.visitType === 'new').length;
    const returnPatients = filtered.filter(p => p.visitType === 'return').length;
    const totalVisits = filtered.reduce((s, p) => s + p.visitCount, 0);
    const totalRevenue = filtered.reduce((s, p) => s + p.totalAmount, 0);
    const insuranceBreakdown = {
      nhis: filtered.filter(p => p.insuranceType === 'nhis').length,
      auto: filtered.filter(p => p.insuranceType === 'auto').length,
      industrial: filtered.filter(p => p.insuranceType === 'industrial').length,
      none: filtered.filter(p => p.insuranceType === 'none' || !p.insuranceType).length,
    };
    return { totalPatients, newPatients, returnPatients, totalVisits, totalRevenue, insuranceBreakdown };
  }, [filtered]);

  const insuranceLabel = (type: string) => {
    const labels: Record<string, string> = { nhis: '건강보험', auto: '자동차', industrial: '산재', none: '일반' };
    return labels[type] || type;
  };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['차트번호', '환자명', '보험구분', '초재진', '내원횟수', '첫내원', '최종내원', '총진료비', '보험부담', '본인부담'];
    const rows = filtered.map(p => [
      p.chartNo, p.patientName, insuranceLabel(p.insuranceType),
      p.visitType === 'new' ? '초진' : '재진', p.visitCount,
      p.firstVisit, p.lastVisit, p.totalAmount, p.insuranceAmount, p.copayAmount,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `기간별환자현황_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> 기간별 환자현황
          </h1>
          <p className="text-sm text-slate-500">외래 환자 신규/초진/재진 현황</p>
        </div>
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
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">보험구분</label>
            <select value={insuranceFilter} onChange={e => setInsuranceFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg bg-white">
              <option value="all">전체</option>
              <option value="nhis">건강보험</option>
              <option value="auto">자동차보험</option>
              <option value="industrial">산재보험</option>
              <option value="none">일반/비급여</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">초재진</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg bg-white">
              <option value="all">전체</option>
              <option value="new">초진</option>
              <option value="return">재진</option>
            </select>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            조회
          </button>
        </div>
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
                <p className="text-xs text-slate-400">총 환자수</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalPatients}<span className="text-sm text-slate-400">명</span></p>
              <p className="text-xs text-slate-400">{stats.totalVisits}건 내원</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-400">초진(신환)</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.newPatients}<span className="text-sm text-slate-400">명</span></p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">재진</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.returnPatients}<span className="text-sm text-slate-400">명</span></p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-emerald-600">총 진료비</p>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatKRW(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-2">보험유형별</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>건강보험</span><span className="font-bold">{stats.insuranceBreakdown.nhis}명</span></div>
                <div className="flex justify-between"><span>자동차</span><span className="font-bold">{stats.insuranceBreakdown.auto}명</span></div>
                <div className="flex justify-between"><span>산재</span><span className="font-bold">{stats.insuranceBreakdown.industrial}명</span></div>
                <div className="flex justify-between"><span>일반</span><span className="font-bold">{stats.insuranceBreakdown.none}명</span></div>
              </div>
            </div>
          </div>

          {/* Patient Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">환자 목록 ({filtered.length}명)</h3>
              <button onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">차트번호</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">환자명</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">보험</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">초재진</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">내원횟수</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">첫내원</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">최종내원</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">총진료비</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">보험부담</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">본인부담</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(p => (
                    <tr key={p.patientId} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.chartNo || '-'}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">
                        <Link href={`/chart/${p.patientId}`} className="hover:text-emerald-600">{p.patientName}</Link>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={p.insuranceType === 'nhis' ? 'info' : p.insuranceType === 'auto' ? 'warning' : 'default'} className="text-[10px]">
                          {insuranceLabel(p.insuranceType)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={p.visitType === 'new' ? 'success' : 'default'} className="text-[10px]">
                          {p.visitType === 'new' ? '초진' : '재진'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{p.visitCount}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{p.firstVisit || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{p.lastVisit || '-'}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatKRW(p.totalAmount)}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{formatKRW(p.insuranceAmount)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatKRW(p.copayAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 font-bold sticky bottom-0">
                    <tr>
                      <td className="px-3 py-3" colSpan={4}>합계</td>
                      <td className="px-3 py-3 text-right">{stats.totalVisits}건</td>
                      <td className="px-3 py-3" colSpan={2}></td>
                      <td className="px-3 py-3 text-right">{formatKRW(stats.totalRevenue)}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{formatKRW(filtered.reduce((s, p) => s + p.insuranceAmount, 0))}</td>
                      <td className="px-3 py-3 text-right text-emerald-600">{formatKRW(filtered.reduce((s, p) => s + p.copayAmount, 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              해당 기간에 환자 데이터가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
