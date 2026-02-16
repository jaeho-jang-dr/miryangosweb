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
  ArrowLeft, Search, Activity, Download, ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';

export default function DiagnosisStatsPage() {
  return <EMRLayout><DiagnosisStatsContent /></EMRLayout>;
}

interface DiagnosisSummary {
  code: string;
  name: string;
  patientCount: number;
  visitDays: number;
  avgVisitDays: number;
  totalFee: number;
  avgFee: number;
  dailyFee: number;
  patients: Set<string>;
}

function DiagnosisStatsContent() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [sortBy, setSortBy] = useState<'patients' | 'visits' | 'fee'>('patients');
  const [sortDesc, setSortDesc] = useState(true);
  const [minCount, setMinCount] = useState(1);

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
      console.error('병명별 통계 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleSearch(); }, []);

  // Build billing map by visitId
  const billingByVisit = useMemo(() => {
    const map = new Map<string, BillingRecord>();
    billings.forEach(b => {
      if (b.visitId) map.set(b.visitId, b);
    });
    return map;
  }, [billings]);

  // Aggregate by diagnosis code
  const diagnosisSummaries = useMemo(() => {
    const map = new Map<string, DiagnosisSummary>();

    visits.forEach(v => {
      const diagnoses: Array<{ code: string; name: string }> = [];

      // Extract diagnoses from visit - diagnosis can be string or stringified object
      if (v.diagnosis) {
        if (typeof v.diagnosis === 'string') {
          // Try to parse as "code: name" format or just use as name
          const match = v.diagnosis.match(/^([A-Z]\d{2,}(?:\.\d+)?)\s*[:\-]\s*(.+)$/);
          if (match) {
            diagnoses.push({ code: match[1], name: match[2].trim() });
          } else {
            diagnoses.push({ code: v.diagnosis, name: v.diagnosis });
          }
        }
      }

      // Also check orders for potential diagnosis-related names
      if (v.orders) {
        v.orders.forEach((order) => {
          // Some orders may have diagnosis info embedded in name
          if (order.name && diagnoses.length === 0) {
            const match = order.name.match(/^([A-Z]\d{2,}(?:\.\d+)?)\s*[:\-]\s*(.+)$/);
            if (match && !diagnoses.find(dd => dd.code === match[1])) {
              diagnoses.push({ code: match[1], name: match[2].trim() });
            }
          }
        });
      }

      const billing = v.id ? billingByVisit.get(v.id) : undefined;
      const fee = billing?.totalAmount || 0;

      diagnoses.forEach(diag => {
        const existing = map.get(diag.code);
        if (existing) {
          existing.visitDays += 1;
          existing.totalFee += fee;
          existing.patients.add(v.patientId);
        } else {
          const patients = new Set<string>();
          patients.add(v.patientId);
          map.set(diag.code, {
            code: diag.code,
            name: diag.name,
            patientCount: 0,
            visitDays: 1,
            avgVisitDays: 0,
            totalFee: fee,
            avgFee: 0,
            dailyFee: 0,
            patients,
          });
        }
      });
    });

    // Calculate derived values
    const results: DiagnosisSummary[] = [];
    map.forEach(d => {
      d.patientCount = d.patients.size;
      d.avgVisitDays = d.patientCount > 0 ? Math.round((d.visitDays / d.patientCount) * 10) / 10 : 0;
      d.avgFee = d.patientCount > 0 ? Math.round(d.totalFee / d.patientCount) : 0;
      d.dailyFee = d.visitDays > 0 ? Math.round(d.totalFee / d.visitDays) : 0;
      results.push(d);
    });

    return results;
  }, [visits, billingByVisit]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = diagnosisSummaries.filter(d => d.patientCount >= minCount);

    result.sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'patients': diff = a.patientCount - b.patientCount; break;
        case 'visits': diff = a.visitDays - b.visitDays; break;
        case 'fee': diff = a.totalFee - b.totalFee; break;
      }
      return sortDesc ? -diff : diff;
    });

    return result;
  }, [diagnosisSummaries, sortBy, sortDesc, minCount]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDesc(!sortDesc);
    else { setSortBy(field); setSortDesc(true); }
  };

  const totalPatients = new Set(visits.map(v => v.patientId)).size;
  const totalVisits = visits.length;
  const totalFee = billings.reduce((s, b) => s + b.totalAmount, 0);

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['순위', '분류기호', '병명', '환자수', '내원일수', '평균내원일', '총진료비', '평균진료비', '일당진료비'];
    const rows = filtered.map((d, i) => [
      i + 1, d.code, d.name, d.patientCount, d.visitDays,
      d.avgVisitDays, d.totalFee, d.avgFee, d.dailyFee,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `병명별현황_${startDate}_${endDate}.csv`;
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
            <Activity className="w-6 h-6 text-purple-600" /> 병명별 다빈도 현황
          </h1>
          <p className="text-sm text-slate-500">KCD 분류기호별 환자수, 내원일수, 진료비 분석</p>
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
            <label className="block text-xs font-medium text-slate-500 mb-1">최소 환자수</label>
            <input type="number" value={minCount} onChange={e => setMinCount(parseInt(e.target.value) || 1)}
              min={1} className="px-3 py-2 text-sm border rounded-lg w-20" />
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
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">총 환자수</p>
              <p className="text-2xl font-bold">{totalPatients}<span className="text-sm text-slate-400">명</span></p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">총 내원건수</p>
              <p className="text-2xl font-bold">{totalVisits}<span className="text-sm text-slate-400">건</span></p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">총 진료비</p>
              <p className="text-xl font-bold">{formatKRW(totalFee)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">진단 종류수</p>
              <p className="text-2xl font-bold">{filtered.length}<span className="text-sm text-slate-400">종</span></p>
            </div>
          </div>

          {/* Diagnosis Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">병명별 현황 (상위 {filtered.length}종)</h3>
              <button onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-12">순위</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">분류기호</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">병명</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 cursor-pointer select-none" onClick={() => toggleSort('patients')}>
                      <span className="flex items-center justify-end gap-1">환자수 <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 cursor-pointer select-none" onClick={() => toggleSort('visits')}>
                      <span className="flex items-center justify-end gap-1">내원일수 <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">평균내원일</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 cursor-pointer select-none" onClick={() => toggleSort('fee')}>
                      <span className="flex items-center justify-end gap-1">총진료비 <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">평균진료비</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">일당진료비</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((d, i) => (
                    <tr key={d.code} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center text-xs text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Badge variant="info" className="text-[10px] font-mono">{d.code}</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{d.name}</td>
                      <td className="px-3 py-2 text-right font-bold">{d.patientCount}</td>
                      <td className="px-3 py-2 text-right">{d.visitDays}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{d.avgVisitDays}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatKRW(d.totalFee)}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{formatKRW(d.avgFee)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatKRW(d.dailyFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              해당 기간에 진단 데이터가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
