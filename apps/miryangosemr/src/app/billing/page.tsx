'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { getDailyBillings } from '@/lib/billing-engine';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord } from '@/types/billing';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calculator, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function BillingOverviewPage() {
  return <EMRLayout><BillingOverviewContent /></EMRLayout>;
}

function BillingOverviewContent() {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBillings();
  }, []);

  const loadBillings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyBillings(new Date());
      setBillings(data);
    } catch (e) {
      console.error('수납 로드 실패:', e);
      setError('수납 데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = billings.reduce((s, b) => s + b.totalAmount, 0);
  const totalCopay = billings.reduce((s, b) => s + b.copayAmount, 0);
  const totalPaid = billings.reduce((s, b) => s + b.paidAmount, 0);
  const totalUnpaid = billings.reduce((s, b) => s + b.unpaidAmount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수납/청구</h1>
          <p className="text-sm text-slate-500">오늘의 수납 현황을 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/billing/fee-calc" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Calculator className="w-4 h-4" /> 수가 계산기
          </Link>
          <Link href="/billing/daily" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Calendar className="w-4 h-4" /> 일일 현황
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="총 진료비" value={formatKRW(totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <SummaryCard label="본인부담금" value={formatKRW(totalCopay)} icon={<CreditCard className="w-5 h-5" />} color="emerald" />
        <SummaryCard label="수납 완료" value={formatKRW(totalPaid)} icon={<CreditCard className="w-5 h-5" />} color="purple" />
        <SummaryCard label="미수금" value={formatKRW(totalUnpaid)} icon={<CreditCard className="w-5 h-5" />} color="red" />
      </div>

      {/* Billing List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">오늘 수납 내역 ({billings.length}건)</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">보험</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">총액</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">본인부담</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">납부</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">로딩 중...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-8 text-red-500">{error}</td></tr>
            ) : billings.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">오늘 수납 내역이 없습니다.</td></tr>
            ) : (
              billings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{b.patientName}</td>
                  <td className="px-4 py-3"><Badge variant={b.insuranceType === 'nhis' ? 'info' : b.insuranceType === 'auto' ? 'warning' : 'default'}>{b.insuranceType === 'nhis' ? '건보' : b.insuranceType === 'auto' ? '자보' : '일반'}</Badge></td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatKRW(b.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatKRW(b.copayAmount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatKRW(b.paidAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={b.paymentStatus === 'paid' ? 'success' : b.paymentStatus === 'partial' ? 'warning' : 'danger'}>
                      {b.paymentStatus === 'paid' ? '완료' : b.paymentStatus === 'partial' ? '부분납' : '미수납'}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600', red: 'bg-red-50 text-red-600' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
      <div><p className="text-xs font-medium text-slate-500 mb-1">{label}</p><p className="text-lg font-bold text-slate-900">{value}</p></div>
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
    </div>
  );
}
