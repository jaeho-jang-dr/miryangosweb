'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord } from '@/types/billing';
import {
  ArrowLeft, ChevronLeft, ChevronRight, TrendingUp,
  CreditCard, Users, AlertTriangle, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface DayRow {
  date: string;
  dayLabel: string;
  patients: number;
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  unpaidAmount: number;
}

export default function MonthlyBillingPage() {
  return <EMRLayout><MonthlyBillingContent /></EMRLayout>;
}

function MonthlyBillingContent() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMonthData(); }, [month]);

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const [y, m] = month.split('-').map(Number);
      const startOfMonth = new Date(y, m - 1, 1);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59);

      const snap = await getDocs(
        query(
          collection(db, 'billing'),
          where('billedAt', '>=', Timestamp.fromDate(startOfMonth)),
          where('billedAt', '<=', Timestamp.fromDate(endOfMonth)),
          orderBy('billedAt', 'asc')
        )
      );
      setBillings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord));
    } catch (e) {
      console.error('월간 데이터 로드 실패:', e);
      setBillings([]);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate by day
  const dayMap = new Map<string, BillingRecord[]>();
  billings.forEach(b => {
    const dateStr = b.billedAt?.toDate?.()?.toISOString().slice(0, 10) || '';
    if (!dateStr) return;
    if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
    dayMap.get(dateStr)!.push(b);
  });

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const dayRows: DayRow[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, records]) => {
      const dayOfWeek = new Date(date).getDay();
      return {
        date,
        dayLabel: dayLabels[dayOfWeek],
        patients: new Set(records.map(r => r.patientId)).size,
        totalAmount: records.reduce((s, r) => s + r.totalAmount, 0),
        insuranceAmount: records.reduce((s, r) => s + r.insuranceAmount, 0),
        copayAmount: records.reduce((s, r) => s + r.copayAmount, 0),
        paidAmount: records.reduce((s, r) => s + r.paidAmount, 0),
        cashAmount: records.filter(r => r.paymentMethod === 'cash').reduce((s, r) => s + r.paidAmount, 0),
        cardAmount: records.filter(r => r.paymentMethod === 'card').reduce((s, r) => s + r.paidAmount, 0),
        unpaidAmount: records.reduce((s, r) => s + r.unpaidAmount, 0),
      };
    });

  // Totals
  const totals = {
    patients: new Set(billings.map(b => b.patientId)).size,
    visits: billings.length,
    totalAmount: billings.reduce((s, b) => s + b.totalAmount, 0),
    insuranceAmount: billings.reduce((s, b) => s + b.insuranceAmount, 0),
    copayAmount: billings.reduce((s, b) => s + b.copayAmount, 0),
    paidAmount: billings.reduce((s, b) => s + b.paidAmount, 0),
    cashAmount: billings.filter(b => b.paymentMethod === 'cash').reduce((s, b) => s + b.paidAmount, 0),
    cardAmount: billings.filter(b => b.paymentMethod === 'card').reduce((s, b) => s + b.paidAmount, 0),
    unpaidAmount: billings.reduce((s, b) => s + b.unpaidAmount, 0),
    workingDays: dayRows.length,
  };
  const avgPatientsPerDay = totals.workingDays > 0 ? Math.round(totals.visits / totals.workingDays) : 0;
  const collectionRate = totals.copayAmount > 0 ? Math.round((totals.paidAmount / totals.copayAmount) * 100) : 0;

  const [y, m] = month.split('-').map(Number);
  const monthLabel = `${y}년 ${m}월`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" /> 월간 수납 보고
          </h1>
          <p className="text-sm text-slate-500">진료 연(월)보 — 월별 수납 현황 및 추이</p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-lg font-bold text-slate-900">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-400">환자수 / 내원건</p>
              </div>
              <p className="text-2xl font-bold">{totals.patients}<span className="text-sm text-slate-400 ml-1">명</span></p>
              <p className="text-xs text-slate-400">{totals.visits}건 (일평균 {avgPatientsPerDay}건)</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-400">총진료비</p>
              </div>
              <p className="text-xl font-bold">{formatKRW(totals.totalAmount)}</p>
              <p className="text-xs text-slate-400">보험 {formatKRW(totals.insuranceAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-slate-400">수납액</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatKRW(totals.paidAmount)}</p>
              <p className="text-xs text-slate-400">현금 {formatKRW(totals.cashAmount)} / 카드 {formatKRW(totals.cardAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-slate-400">미수금 / 수납률</p>
              </div>
              <p className="text-xl font-bold text-red-600">{formatKRW(totals.unpaidAmount)}</p>
              <p className="text-xs">
                수납률 <Badge variant={collectionRate >= 95 ? 'success' : collectionRate >= 80 ? 'warning' : 'danger'} className="text-[10px]">{collectionRate}%</Badge>
              </p>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          {dayRows.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b"><h3 className="font-bold text-slate-800">일별 수납 현황</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">날짜</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">요일</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">환자수</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">총진료비</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">보험부담</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">본인부담</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">수납액</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">현금</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">카드</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">미수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayRows.map(row => (
                      <tr key={row.date} className={`hover:bg-slate-50 ${row.dayLabel === '토' ? 'bg-blue-50/30' : row.dayLabel === '일' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-3 py-2 font-mono text-xs">{row.date.slice(5)}</td>
                        <td className={`px-3 py-2 text-xs ${row.dayLabel === '일' ? 'text-red-500 font-bold' : row.dayLabel === '토' ? 'text-blue-500' : ''}`}>{row.dayLabel}</td>
                        <td className="px-3 py-2 text-right">{row.patients}</td>
                        <td className="px-3 py-2 text-right">{formatKRW(row.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-blue-600">{formatKRW(row.insuranceAmount)}</td>
                        <td className="px-3 py-2 text-right">{formatKRW(row.copayAmount)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatKRW(row.paidAmount)}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{row.cashAmount > 0 ? formatKRW(row.cashAmount) : '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{row.cardAmount > 0 ? formatKRW(row.cardAmount) : '-'}</td>
                        <td className="px-3 py-2 text-right text-red-500">{row.unpaidAmount > 0 ? formatKRW(row.unpaidAmount) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 font-bold">
                    <tr>
                      <td className="px-3 py-3" colSpan={2}>합계 ({totals.workingDays}일)</td>
                      <td className="px-3 py-3 text-right">{totals.patients}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.totalAmount)}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{formatKRW(totals.insuranceAmount)}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.copayAmount)}</td>
                      <td className="px-3 py-3 text-right text-emerald-600">{formatKRW(totals.paidAmount)}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.cashAmount)}</td>
                      <td className="px-3 py-3 text-right">{formatKRW(totals.cardAmount)}</td>
                      <td className="px-3 py-3 text-right text-red-600">{formatKRW(totals.unpaidAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
              {monthLabel}에 수납 내역이 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
