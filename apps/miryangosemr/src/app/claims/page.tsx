'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getClaims } from '@/lib/claims-engine';
import { HIRAClaim, ClaimStatus } from '@/types/claims';
import { BillingRecord } from '@/types/billing';
import { formatKRW } from '@/lib/fee-calculator';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, ChevronLeft, ChevronRight, FileText, CheckCircle, AlertTriangle, BarChart3, Eye } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: '작성 중', validated: '검증완료', submitted: '제출됨', accepted: '접수완료',
  reviewing: '심사 중', approved: '승인', rejected: '반려', adjusted: '조정', paid: '지급완료',
};

const STATUS_VARIANTS: Record<ClaimStatus, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  draft: 'default', validated: 'info', submitted: 'info', accepted: 'purple',
  reviewing: 'warning', approved: 'success', rejected: 'danger', adjusted: 'warning', paid: 'success',
};

interface DailyBreakdown {
  date: string;
  patientCount: number;
  totalAmount: number;
  copayAmount: number;
  insuranceAmount: number;
}

export default function ClaimsDashboardPage() {
  return <EMRLayout><ClaimsDashboardContent /></EMRLayout>;
}

function ClaimsDashboardContent() {
  const [claims, setClaims] = useState<HIRAClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClaimStatus | ''>('');
  const [claimMonth, setClaimMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => { loadClaims(); }, [filter, claimMonth]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await getClaims(filter ? { status: filter as ClaimStatus } : undefined);
      // Filter by month client-side
      const filtered = data.filter(c => c.visitDate?.startsWith(claimMonth));
      setClaims(filtered);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const changeMonth = (delta: number) => {
    const [y, m] = claimMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setClaimMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = claimMonth.split('-');
    return `${y}년 ${m}월`;
  }, [claimMonth]);

  // Summary stats
  const stats = useMemo(() => {
    const totalClaims = claims.length;
    const totalAmount = claims.reduce((s, c) => s + c.insuranceAmount, 0);
    const approvedCount = claims.filter(c => c.status === 'approved' || c.status === 'paid').length;
    const approvalRate = totalClaims > 0 ? Math.round((approvedCount / totalClaims) * 100) : 0;
    const draftCount = claims.filter(c => c.status === 'draft').length;
    return { totalClaims, totalAmount, approvalRate, draftCount };
  }, [claims]);

  // Daily breakdown
  const dailyBreakdown = useMemo(() => {
    const byDate: Record<string, DailyBreakdown> = {};
    claims.forEach(c => {
      const date = c.visitDate;
      if (!byDate[date]) {
        byDate[date] = { date, patientCount: 0, totalAmount: 0, copayAmount: 0, insuranceAmount: 0 };
      }
      byDate[date].patientCount++;
      byDate[date].totalAmount += c.totalAmount;
      byDate[date].copayAmount += c.copayAmount;
      byDate[date].insuranceAmount += c.insuranceAmount;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [claims]);

  // PT stats
  const ptStats = useMemo(() => {
    const workingDays = dailyBreakdown.length || 1;
    return {
      totalPatients: stats.totalClaims,
      avgDaily: Math.round(stats.totalClaims / workingDays * 10) / 10,
    };
  }, [dailyBreakdown, stats]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> HIRA 청구
          </h1>
          <p className="text-sm text-slate-500">건강보험심사평가원 진료비 청구 현황</p>
        </div>
        <div className="flex gap-2">
          <Link href="/claims/review" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Eye className="w-4 h-4" /> 화면심사
          </Link>
          <Link href="/claims/new" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> 신규 청구
          </Link>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
        <span className="text-lg font-bold text-slate-700 min-w-[120px] text-center">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-400 mb-1">총 청구 건수</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalClaims}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-400 mb-1">총 청구액</p>
          <p className="text-2xl font-bold text-blue-600">{formatKRW(stats.totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-400 mb-1">승인율</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.approvalRate}<span className="text-sm font-normal text-slate-400 ml-0.5">%</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-400 mb-1">미청구 건수</p>
          <p className="text-2xl font-bold text-amber-600">{stats.draftCount}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
        </div>
      </div>

      {/* Daily Breakdown + PT Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm">일별 청구 현황</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500 text-xs">날짜</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 text-xs">환자수</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 text-xs">총진료비</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 text-xs">본인부담</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500 text-xs">청구액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dailyBreakdown.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">해당 월 데이터 없음</td></tr>
              ) : (
                dailyBreakdown.map(d => (
                  <tr key={d.date} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-2 font-medium text-slate-700">{d.date}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{d.patientCount}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatKRW(d.totalAmount)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatKRW(d.copayAmount)}</td>
                    <td className="px-4 py-2 text-right font-medium text-blue-600">{formatKRW(d.insuranceAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {dailyBreakdown.length > 0 && (
              <tfoot className="bg-slate-50 border-t">
                <tr className="font-bold text-sm">
                  <td className="px-4 py-2 text-slate-700">합계</td>
                  <td className="px-4 py-2 text-right text-slate-700">{stats.totalClaims}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatKRW(dailyBreakdown.reduce((s, d) => s + d.totalAmount, 0))}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatKRW(dailyBreakdown.reduce((s, d) => s + d.copayAmount, 0))}</td>
                  <td className="px-4 py-2 text-right text-blue-700">{formatKRW(dailyBreakdown.reduce((s, d) => s + d.insuranceAmount, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PT Stats Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">환자 통계</h3>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-400">총 환자수</p>
              <p className="text-xl font-bold text-slate-900">{ptStats.totalPatients}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-blue-400">일평균</p>
              <p className="text-xl font-bold text-blue-700">{ptStats.avgDaily}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-emerald-400">진료일수</p>
              <p className="text-xl font-bold text-emerald-700">{dailyBreakdown.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${!filter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>전체</button>
        {(['draft', 'validated', 'submitted', 'reviewing', 'approved', 'rejected', 'paid'] as ClaimStatus[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${filter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{STATUS_LABELS[s]}</button>
        ))}
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">진단</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">진료일</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">총진료비</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">청구액</th>
            <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
            <th className="px-4 py-3 text-center font-medium text-slate-500">액션</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">로딩 중...</td></tr> :
            claims.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">청구 내역이 없습니다.</td></tr> :
            claims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{c.patientName}</td>
                <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{c.diagnosisNames?.[0] || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{c.visitDate}</td>
                <td className="px-4 py-3 text-right">{formatKRW(c.totalAmount)}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">{formatKRW(c.insuranceAmount)}</td>
                <td className="px-4 py-3 text-center"><Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/claims/review`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">심사</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
