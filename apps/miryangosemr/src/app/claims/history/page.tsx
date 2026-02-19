'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { FileText, CheckCircle, Clock, XCircle, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ClaimStatus = 'submitted' | 'approved' | 'rejected' | 'pending';

interface ClaimRecord {
  id: string;
  patientName: string;
  claimMonth: string;
  submittedAt: string;
  totalAmount: number;
  status: ClaimStatus;
}

const STATUS_CONFIG: Record<ClaimStatus, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  submitted: { label: '제출됨', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  approved: { label: '승인', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  rejected: { label: '반려', icon: XCircle, color: 'text-red-600 bg-red-50' },
  pending: { label: '대기중', icon: Clock, color: 'text-amber-600 bg-amber-50' },
};

// 샘플 데이터 (실제로는 Firestore에서 로드)
const SAMPLE_CLAIMS: ClaimRecord[] = [
  { id: 'CLM-001', patientName: '홍길동', claimMonth: '2026-01', submittedAt: '2026-02-01', totalAmount: 15000, status: 'approved' },
  { id: 'CLM-002', patientName: '김영희', claimMonth: '2026-01', submittedAt: '2026-02-01', totalAmount: 28500, status: 'submitted' },
  { id: 'CLM-003', patientName: '이철수', claimMonth: '2026-01', submittedAt: '2026-02-01', totalAmount: 9200, status: 'pending' },
];

export default function ClaimsHistoryPage() {
  return <EMRLayout><ClaimsHistoryContent /></EMRLayout>;
}

function ClaimsHistoryContent() {
  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus | 'all'>('all');

  const filtered = SAMPLE_CLAIMS.filter(c => {
    if (selectedMonth && c.claimMonth !== selectedMonth) return false;
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, c) => sum + c.totalAmount, 0);
  const approvedCount = filtered.filter(c => c.status === 'approved').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">청구 이력</h1>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{filtered.length}</div>
          <div className="text-sm text-slate-500">총 청구 건수</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
          <div className="text-sm text-slate-500">승인 건수</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString()}원</div>
          <div className="text-sm text-slate-500">총 청구 금액</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as ClaimStatus | 'all')}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="pending">대기중</option>
          <option value="submitted">제출됨</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">청구번호</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">환자명</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">진료년월</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">제출일</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">청구금액</th>
              <th className="text-center px-4 py-3 text-slate-600 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  청구 이력이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map(claim => {
                const cfg = STATUS_CONFIG[claim.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{claim.id}</td>
                    <td className="px-4 py-3 text-slate-900">{claim.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">{claim.claimMonth}</td>
                    <td className="px-4 py-3 text-slate-600">{claim.submittedAt}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{claim.totalAmount.toLocaleString()}원</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
