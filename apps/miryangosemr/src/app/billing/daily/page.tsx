'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { getDailyBillings } from '@/lib/billing-engine';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord } from '@/types/billing';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DailyBillingPage() {
  return <EMRLayout><DailyBillingContent /></EMRLayout>;
}

function DailyBillingContent() {
  const [date, setDate] = useState(new Date());
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try { setBillings(await getDailyBillings(date)); }
    catch (e) {
      console.error(e);
      setError('수납 데이터를 불러오는데 실패했습니다.');
    }
    finally { setLoading(false); }
  };

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };

  const total = billings.reduce((s, b) => s + b.totalAmount, 0);
  const paid = billings.reduce((s, b) => s + b.paidAmount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">일일 수납 현황</h1>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={prevDay} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-lg font-bold text-slate-900">{date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
        <button onClick={nextDay} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-xs text-slate-400">수납건수</p><p className="text-2xl font-bold">{billings.length}</p></div>
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-xs text-slate-400">총 진료비</p><p className="text-2xl font-bold">{formatKRW(total)}</p></div>
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-xs text-slate-400">수납액</p><p className="text-2xl font-bold text-emerald-600">{formatKRW(paid)}</p></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">총액</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">본인부담</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">납부</th>
            <th className="px-4 py-3 text-center font-medium text-slate-500">결제</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">로딩 중...</td></tr> :
            error ? <tr><td colSpan={5} className="text-center py-8 text-red-500">{error}</td></tr> :
            billings.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">수납 내역이 없습니다.</td></tr> :
            billings.map(b => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{b.patientName}</td>
                <td className="px-4 py-3 text-right">{formatKRW(b.totalAmount)}</td>
                <td className="px-4 py-3 text-right">{formatKRW(b.copayAmount)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatKRW(b.paidAmount)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">{b.paymentMethod || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
