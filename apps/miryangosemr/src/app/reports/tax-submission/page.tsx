'use client';

import React, { useState, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BillingRecord } from '@/types/billing';
import { formatKRW } from '@/lib/fee-calculator';
import {
  ArrowLeft, Building2, Search, Download, CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function TaxSubmissionPage() {
  return <EMRLayout><TaxSubmissionContent /></EMRLayout>;
}

function TaxSubmissionContent() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);

      const snap = await getDocs(query(
        collection(db, 'billing'),
        where('billedAt', '>=', Timestamp.fromDate(start)),
        where('billedAt', '<=', Timestamp.fromDate(end)),
        orderBy('billedAt', 'asc')
      ));
      setBillings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord));
      setSearched(true);
    } catch (e) {
      console.error('국세청 자료 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate by patient for tax submission
  const patientData = useMemo(() => {
    const map = new Map<string, {
      patientId: string;
      patientName: string;
      totalPaid: number;
      cashPaid: number;
      cardPaid: number;
      deductibleAmount: number;
      visitCount: number;
    }>();

    billings.forEach(b => {
      const existing = map.get(b.patientId);
      // Tax deductible = copay amount paid (excluding cosmetic/non-deductible items)
      const deductible = b.paidAmount;

      if (existing) {
        existing.totalPaid += b.paidAmount;
        existing.cashPaid += b.paymentMethod === 'cash' ? b.paidAmount : 0;
        existing.cardPaid += b.paymentMethod === 'card' ? b.paidAmount : 0;
        existing.deductibleAmount += deductible;
        existing.visitCount += 1;
      } else {
        map.set(b.patientId, {
          patientId: b.patientId,
          patientName: b.patientName,
          totalPaid: b.paidAmount,
          cashPaid: b.paymentMethod === 'cash' ? b.paidAmount : 0,
          cardPaid: b.paymentMethod === 'card' ? b.paidAmount : 0,
          deductibleAmount: deductible,
          visitCount: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [billings]);

  const totals = useMemo(() => ({
    patients: patientData.length,
    totalPaid: patientData.reduce((s, p) => s + p.totalPaid, 0),
    cashPaid: patientData.reduce((s, p) => s + p.cashPaid, 0),
    cardPaid: patientData.reduce((s, p) => s + p.cardPaid, 0),
    deductible: patientData.reduce((s, p) => s + p.deductibleAmount, 0),
    visits: patientData.reduce((s, p) => s + p.visitCount, 0),
  }), [patientData]);

  const handleExportCSV = () => {
    if (!patientData.length) return;
    const headers = ['환자명', '진료횟수', '총납부액', '현금납부', '카드납부', '소득공제대상액'];
    const rows = patientData.map(p => [
      p.patientName, p.visitCount, p.totalPaid, p.cashPaid, p.cardPaid, p.deductibleAmount,
    ]);
    // Add totals row
    rows.push(['합계', totals.visits, totals.totalPaid, totals.cashPaid, totals.cardPaid, totals.deductible]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `국세청_의료비_${year}.csv`;
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
            <Building2 className="w-6 h-6 text-blue-600" /> 국세청 의료비 제출
          </h1>
          <p className="text-sm text-slate-500">연말정산 의료비 소득공제 자료 생성</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">귀속연도</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="px-3 py-2 text-sm border rounded-lg bg-white">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            조회
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : searched && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">대상 환자수</p>
              <p className="text-2xl font-bold">{totals.patients}<span className="text-sm text-slate-400">명</span></p>
              <p className="text-xs text-slate-400">{totals.visits}건 진료</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">총 납부액</p>
              <p className="text-xl font-bold">{formatKRW(totals.totalPaid)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-400 mb-1">현금 / 카드</p>
              <p className="text-sm font-bold text-emerald-600">{formatKRW(totals.cashPaid)}</p>
              <p className="text-sm font-bold text-blue-600">{formatKRW(totals.cardPaid)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 font-bold mb-1">소득공제 대상액</p>
              <p className="text-xl font-bold text-blue-700">{formatKRW(totals.deductible)}</p>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-bold mb-1">국세청 제출 안내</p>
              <p>아래 자료를 CSV로 내보내기 하여 국세청 홈택스에 업로드하세요. 미용/성형 등 소득공제 비대상 항목은 별도 확인이 필요합니다.</p>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button onClick={handleExportCSV}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV 내보내기
            </button>
          </div>

          {/* Patient Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-slate-800">환자별 의료비 납부 내역</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium text-slate-500 w-12">#</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">환자명</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">진료횟수</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">총납부액</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">현금</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">카드</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">소득공제대상</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientData.map((p, i) => (
                    <tr key={p.patientId} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center text-xs text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{p.patientName}</td>
                      <td className="px-3 py-2 text-right">{p.visitCount}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatKRW(p.totalPaid)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{p.cashPaid > 0 ? formatKRW(p.cashPaid) : '-'}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{p.cardPaid > 0 ? formatKRW(p.cardPaid) : '-'}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">{formatKRW(p.deductibleAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {patientData.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 font-bold sticky bottom-0">
                    <tr>
                      <td className="px-3 py-3" colSpan={2}>합계 ({totals.patients}명)</td>
                      <td className="px-3 py-3 text-right">{totals.visits}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.totalPaid)}</td>
                      <td className="px-3 py-3 text-right text-emerald-600">{formatKRW(totals.cashPaid)}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{formatKRW(totals.cardPaid)}</td>
                      <td className="px-3 py-3 text-right text-blue-700">{formatKRW(totals.deductible)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {patientData.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              {year}년 납부 내역이 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
