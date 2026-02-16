'use client';

import React, { useState, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BillingRecord } from '@/types/billing';
import { formatKRW } from '@/lib/fee-calculator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ShieldAlert, Search, Download, Info,
} from 'lucide-react';
import Link from 'next/link';

export default function NonCoveredPage() {
  return <EMRLayout><NonCoveredContent /></EMRLayout>;
}

interface NonCoveredItem {
  code: string;
  name: string;
  unitPrice: number;
  totalQuantity: number;
  totalAmount: number;
  patientCount: number;
  patients: Set<string>;
}

function NonCoveredContent() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billings, setBillings] = useState<BillingRecord[]>([]);
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
        collection(db, 'billing'),
        where('billedAt', '>=', Timestamp.fromDate(start)),
        where('billedAt', '<=', Timestamp.fromDate(end)),
        orderBy('billedAt', 'asc')
      ));
      setBillings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord));
      setSearched(true);
    } catch (e) {
      console.error('비급여 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // Extract non-covered items from billing records
  const nonCoveredItems = useMemo(() => {
    const map = new Map<string, NonCoveredItem>();

    billings.forEach(b => {
      if (!b.items) return;
      b.items.forEach(item => {
        // Non-covered items: insuranceCovered === false
        if (!item.insuranceCovered) {
          const key = item.feeCode || item.feeName;
          const existing = map.get(key);
          if (existing) {
            existing.totalQuantity += item.quantity || 1;
            existing.totalAmount += item.totalPrice || 0;
            existing.patients.add(b.patientId);
          } else {
            const patients = new Set<string>();
            patients.add(b.patientId);
            map.set(key, {
              code: item.feeCode || '-',
              name: item.feeName || '(미분류)',
              unitPrice: item.unitPrice || 0,
              totalQuantity: item.quantity || 1,
              totalAmount: item.totalPrice || 0,
              patientCount: 0,
              patients,
            });
          }
        }
      });
    });

    const results: NonCoveredItem[] = [];
    map.forEach(item => {
      item.patientCount = item.patients.size;
      results.push(item);
    });

    return results.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [billings]);

  const totals = useMemo(() => ({
    itemTypes: nonCoveredItems.length,
    totalAmount: nonCoveredItems.reduce((s, i) => s + i.totalAmount, 0),
    totalQuantity: nonCoveredItems.reduce((s, i) => s + i.totalQuantity, 0),
    totalPatients: new Set(nonCoveredItems.flatMap(i => Array.from(i.patients))).size,
  }), [nonCoveredItems]);

  // Non-covered ratio
  const totalBillingAmount = billings.reduce((s, b) => s + b.totalAmount, 0);
  const nonCoveredRatio = totalBillingAmount > 0
    ? Math.round((totals.totalAmount / totalBillingAmount) * 100) : 0;

  const handleExportCSV = () => {
    if (!nonCoveredItems.length) return;
    const headers = ['코드', '항목명', '단가', '수량', '총금액', '환자수'];
    const rows = nonCoveredItems.map(i => [
      i.code, i.name, i.unitPrice, i.totalQuantity, i.totalAmount, i.patientCount,
    ]);
    rows.push(['합계', '', '', totals.totalQuantity, totals.totalAmount, totals.totalPatients]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `비급여현황_${startDate}_${endDate}.csv`;
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
            <ShieldAlert className="w-6 h-6 text-orange-600" /> 비급여 현황 보고
          </h1>
          <p className="text-sm text-slate-500">비급여 진료비용 공개 및 건강보험심사평가원 보고용</p>
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
            className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            조회
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : searched && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">비급여 항목수</p>
              <p className="text-2xl font-bold">{totals.itemTypes}<span className="text-sm text-slate-400">종</span></p>
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
              <p className="text-xs text-orange-600 font-bold mb-1">비급여 총액</p>
              <p className="text-xl font-bold text-orange-700">{formatKRW(totals.totalAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">이용 환자수</p>
              <p className="text-2xl font-bold">{totals.totalPatients}<span className="text-sm text-slate-400">명</span></p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">비급여 비율</p>
              <p className="text-2xl font-bold">{nonCoveredRatio}<span className="text-sm text-slate-400">%</span></p>
              <p className="text-xs text-slate-400">총진료비 대비</p>
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              비급여 진료비용 공개 의무에 따라, 항목별 단가와 이용현황을 건강보험심사평가원에 제출합니다.
            </p>
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button onClick={handleExportCSV}
              className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV 내보내기
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-slate-800">비급여 항목별 현황</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-12">#</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">코드</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">항목명</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">단가</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">수량</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">총금액</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">환자수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nonCoveredItems.map((item, i) => (
                    <tr key={item.code + item.name} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center text-xs text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Badge variant="warning" className="text-[10px] font-mono">{item.code}</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 text-right">{formatKRW(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{item.totalQuantity}</td>
                      <td className="px-3 py-2 text-right font-bold text-orange-600">{formatKRW(item.totalAmount)}</td>
                      <td className="px-3 py-2 text-right">{item.patientCount}</td>
                    </tr>
                  ))}
                </tbody>
                {nonCoveredItems.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 font-bold">
                    <tr>
                      <td className="px-3 py-3" colSpan={4}>합계 ({totals.itemTypes}종)</td>
                      <td className="px-3 py-3 text-right">{totals.totalQuantity}</td>
                      <td className="px-3 py-3 text-right text-orange-600">{formatKRW(totals.totalAmount)}</td>
                      <td className="px-3 py-3 text-right">{totals.totalPatients}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {nonCoveredItems.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              해당 기간에 비급여 항목이 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
