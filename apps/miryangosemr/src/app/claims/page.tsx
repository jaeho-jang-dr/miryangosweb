'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { getClaims } from '@/lib/claims-engine';
import { HIRAClaim, ClaimStatus } from '@/types/claims';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: '작성 중', validated: '검증완료', submitted: '제출됨', accepted: '접수완료',
  reviewing: '심사 중', approved: '승인', rejected: '반려', adjusted: '조정', paid: '지급완료',
};

const STATUS_VARIANTS: Record<ClaimStatus, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  draft: 'default', validated: 'info', submitted: 'info', accepted: 'purple',
  reviewing: 'warning', approved: 'success', rejected: 'danger', adjusted: 'warning', paid: 'success',
};

export default function ClaimsDashboardPage() {
  return <EMRLayout><ClaimsDashboardContent /></EMRLayout>;
}

function ClaimsDashboardContent() {
  const [claims, setClaims] = useState<HIRAClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ClaimStatus | ''>('');

  useEffect(() => { loadClaims(); }, [filter]);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClaims(filter ? { status: filter as ClaimStatus } : undefined);
      setClaims(data);
    } catch (e) {
      console.error(e);
      setError('청구 데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HIRA 청구</h1>
          <p className="text-sm text-slate-500">건강보험심사평가원 청구 관리</p>
        </div>
        <div className="flex gap-2">
          <Link href="/claims/new" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> 신규 청구
          </Link>
          <Link href="/claims/history" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
            청구 이력
          </Link>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${!filter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>전체</button>
        {(['draft', 'submitted', 'reviewing', 'approved', 'rejected'] as ClaimStatus[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${filter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{STATUS_LABELS[s]}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">진단</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">진료일</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">청구액</th>
            <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">로딩 중...</td></tr> :
            error ? <tr><td colSpan={5} className="text-center py-8 text-red-500">{error}</td></tr> :
            claims.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">청구 내역이 없습니다.</td></tr> :
            claims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{c.patientName}</td>
                <td className="px-4 py-3 text-slate-600">{c.diagnosisNames?.[0] || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{c.visitDate}</td>
                <td className="px-4 py-3 text-right font-medium">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(c.insuranceAmount)}</td>
                <td className="px-4 py-3 text-center"><Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
