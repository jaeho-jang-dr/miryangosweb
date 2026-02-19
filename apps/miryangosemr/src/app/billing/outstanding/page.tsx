'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord } from '@/types/billing';
import {
  ArrowLeft, AlertTriangle, Search, CreditCard,
  Phone, Calendar, TrendingDown,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PaymentModal = dynamic(() => import('@/components/clinical/PaymentModal'), { ssr: false });

export default function OutstandingPage() {
  return <EMRLayout><OutstandingContent /></EMRLayout>;
}

function OutstandingContent() {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [paymentTarget, setPaymentTarget] = useState<BillingRecord | null>(null);

  useEffect(() => { loadOutstanding(); }, []);

  const loadOutstanding = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'billing'),
          where('paymentStatus', 'in', ['pending', 'partial']),
          orderBy('billedAt', 'desc')
        )
      );
      setBillings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord));
    } catch (e) {
      console.error('미수금 로드 실패:', e);
      // Fallback: load all and filter client-side
      try {
        const snap = await getDocs(query(collection(db, 'billing'), orderBy('billedAt', 'desc')));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord);
        setBillings(all.filter(b => b.paymentStatus === 'pending' || b.paymentStatus === 'partial'));
      } catch (e2) {
        console.error('대체 쿼리 실패:', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = billings.filter(b => {
    if (!searchQuery) return true;
    return b.patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'amount': return b.unpaidAmount - a.unpaidAmount;
      case 'name': return a.patientName.localeCompare(b.patientName);
      default: return 0; // already sorted by date
    }
  });

  // Group by patient for summary
  const patientMap = new Map<string, { name: string; totalUnpaid: number; count: number }>();
  billings.forEach(b => {
    const existing = patientMap.get(b.patientId);
    if (existing) {
      existing.totalUnpaid += b.unpaidAmount;
      existing.count += 1;
    } else {
      patientMap.set(b.patientId, { name: b.patientName, totalUnpaid: b.unpaidAmount, count: 1 });
    }
  });
  const topDebtors = Array.from(patientMap.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid).slice(0, 5);

  const totalOutstanding = billings.reduce((s, b) => s + b.unpaidAmount, 0);
  const totalCount = billings.length;
  const uniquePatients = patientMap.size;

  const getDaysOverdue = (b: BillingRecord): number => {
    const billedDate = b.billedAt?.toDate?.();
    if (!billedDate) return 0;
    return Math.floor((Date.now() - billedDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" /> 미수금 관리
          </h1>
          <p className="text-sm text-slate-500">미납/부분납 수납 건을 관리합니다.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <p className="text-xs text-red-600 font-bold">총 미수금</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{formatKRW(totalOutstanding)}</p>
          <p className="text-xs text-red-500 mt-1">{totalCount}건 / {uniquePatients}명</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-slate-400 mb-2">미수 환자 TOP 5</p>
          <div className="space-y-1">
            {topDebtors.map((d, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-700">{d.name} ({d.count}건)</span>
                <span className="font-bold text-red-600">{formatKRW(d.totalUnpaid)}</span>
              </div>
            ))}
            {topDebtors.length === 0 && <p className="text-xs text-slate-400">미수 환자 없음</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-slate-400 mb-2">미수 기간 분포</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span>7일 이내</span><span className="font-bold">{billings.filter(b => getDaysOverdue(b) <= 7).length}건</span></div>
            <div className="flex justify-between"><span>8~30일</span><span className="font-bold">{billings.filter(b => getDaysOverdue(b) > 7 && getDaysOverdue(b) <= 30).length}건</span></div>
            <div className="flex justify-between"><span>31~90일</span><span className="font-bold text-orange-600">{billings.filter(b => getDaysOverdue(b) > 30 && getDaysOverdue(b) <= 90).length}건</span></div>
            <div className="flex justify-between"><span>90일 초과</span><span className="font-bold text-red-600">{billings.filter(b => getDaysOverdue(b) > 90).length}건</span></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="환자명 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="date">날짜순</option>
          <option value="amount">금액순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      {/* Outstanding List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>미수금 내역이 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">진료일</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">총진료비</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">본인부담</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">기납부</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">미수금</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">경과일</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(b => {
                const days = getDaysOverdue(b);
                const urgency = days > 90 ? 'danger' : days > 30 ? 'warning' : 'default';
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{b.patientName}</td>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {b.billedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">{formatKRW(b.totalAmount)}</td>
                    <td className="px-4 py-3 text-right">{formatKRW(b.copayAmount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatKRW(b.paidAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatKRW(b.unpaidAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={urgency as 'default' | 'warning' | 'danger'} className="text-[10px]">{days}일</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={b.paymentStatus === 'partial' ? 'warning' : 'danger'} className="text-[10px]">
                        {b.paymentStatus === 'partial' ? '부분납' : '미납'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPaymentTarget(b)}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1 ml-auto"
                      >
                        <CreditCard className="w-3 h-3" /> 수납
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {paymentTarget && (
        <PaymentModal
          billing={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onPaymentComplete={() => { setPaymentTarget(null); loadOutstanding(); }}
        />
      )}
    </div>
  );
}
