'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HIRAClaim, HIRAClaimItem, ClaimStatus } from '@/types/claims';
import { BillingRecord } from '@/types/billing';
import { FEE_CATEGORY_NAMES, FeeCategory } from '@/types/fee-schedule';
import { formatKRW } from '@/lib/fee-calculator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, FileText, Search, Printer } from 'lucide-react';
import Link from 'next/link';

interface ClaimWithBilling extends HIRAClaim {
  billing?: BillingRecord;
}

export default function ClaimsReviewPage() {
  return <EMRLayout><ClaimsReviewContent /></EMRLayout>;
}

function ClaimsReviewContent() {
  const [claims, setClaims] = useState<ClaimWithBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [claimMonth, setClaimMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterStatus, setFilterStatus] = useState<ClaimStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClaims();
  }, [claimMonth, filterStatus]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      let q;
      if (filterStatus) {
        q = query(collection(db, 'claims'), where('status', '==', filterStatus), orderBy('createdAt', 'desc'));
      } else {
        q = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
      }

      const snap = await getDocs(q);
      const allClaims = snap.docs.map(d => ({ id: d.id, ...d.data() }) as HIRAClaim);

      // Filter by month client-side
      const filtered = allClaims.filter(c => c.visitDate?.startsWith(claimMonth));
      setClaims(filtered);

      if (filtered.length > 0 && !selectedClaimId) {
        setSelectedClaimId(filtered[0].id);
      }
    } catch (e) {
      console.error('Claims load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const [y, m] = claimMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setClaimMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedClaimId(null);
  };

  const selectedClaim = useMemo(() =>
    claims.find(c => c.id === selectedClaimId) || null,
  [claims, selectedClaimId]);

  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return claims;
    const q = searchQuery.toLowerCase();
    return claims.filter(c =>
      c.patientName.toLowerCase().includes(q) ||
      c.diagnosisNames?.some(d => d.toLowerCase().includes(q))
    );
  }, [claims, searchQuery]);

  // Group items by category for the fee matrix
  const groupedItems = useMemo(() => {
    if (!selectedClaim) return { actions: [], materials: [] };
    const actions = selectedClaim.items.filter(i => i.category !== '재료');
    const materials = selectedClaim.items.filter(i => i.category === '재료');
    return { actions, materials };
  }, [selectedClaim]);

  // Day grid — figure out which days of the month had visits
  const visitDays = useMemo(() => {
    if (!selectedClaim) return new Set<number>();
    // For single claim, just the visit date
    const day = parseInt(selectedClaim.visitDate?.split('-')[2] || '0');
    return new Set(day ? [day] : []);
  }, [selectedClaim]);

  const daysInMonth = useMemo(() => {
    const [y, m] = claimMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [claimMonth]);

  const monthLabel = useMemo(() => {
    const [y, m] = claimMonth.split('-');
    return `${y}년 ${m}월`;
  }, [claimMonth]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <h1 className="text-lg font-bold text-slate-900">화면심사</h1>
          <div className="flex items-center gap-1 ml-4">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>기관: 밀양정형외과의원</span>
          <span>|</span>
          <span>요양기관번호: 00000000</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Patient Claims List */}
        <div className="w-72 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="환자명/진단 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md"
              />
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {(['', 'draft', 'validated', 'submitted', 'approved', 'rejected'] as (ClaimStatus | '')[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                    filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s === '' ? '전체' : s === 'draft' ? '작성중' : s === 'validated' ? '검증' : s === 'submitted' ? '제출' : s === 'approved' ? '승인' : '반려'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">로딩 중...</div>
            ) : filteredClaims.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">청구 내역 없음</div>
            ) : (
              filteredClaims.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClaimId(c.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-50 transition-colors ${
                    selectedClaimId === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{c.patientName}</span>
                    <span className="text-[10px] text-slate-400">{c.visitDate}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{c.diagnosisNames?.[0] || '-'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium text-emerald-600">{formatKRW(c.insuranceAmount)}</span>
                    <Badge
                      variant={c.status === 'approved' ? 'success' : c.status === 'rejected' ? 'danger' : c.status === 'submitted' ? 'info' : 'default'}
                      className="text-[9px]"
                    >
                      {c.status === 'draft' ? '작성중' : c.status === 'validated' ? '검증' : c.status === 'submitted' ? '제출' : c.status === 'approved' ? '승인' : c.status === 'rejected' ? '반려' : c.status}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
            총 {filteredClaims.length}건
          </div>
        </div>

        {/* Center: Fee Detail Matrix */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {!selectedClaim ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>좌측에서 청구 건을 선택하세요</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Claim Header */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedClaim.patientName}</h2>
                    <p className="text-xs text-slate-500">진료일: {selectedClaim.visitDate} | 의사: {selectedClaim.doctorName || '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 검증
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1">
                      <Printer className="w-3 h-3" /> 인쇄
                    </button>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedClaim.diagnosisNames?.map((d, idx) => (
                    <span key={idx} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                      {idx === 0 && <span className="font-bold mr-1">[주]</span>}
                      {d}
                      {selectedClaim.diagnosisCodes?.[idx] && (
                        <span className="font-mono text-purple-500 ml-1">({selectedClaim.diagnosisCodes[idx]})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Day Grid */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-600 mb-2">내원일 ({visitDays.size}일)</h3>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <div
                      key={day}
                      className={`w-7 h-7 flex items-center justify-center text-[10px] rounded ${
                        visitDays.has(day) ? 'bg-blue-500 text-white font-bold' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee Items Table — 진료행위(II) */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700">진료행위 (II) — {groupedItems.actions.length}항목</h3>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500 w-20">코드</th>
                      <th className="px-3 py-2 text-left text-slate-500">항목명</th>
                      <th className="px-3 py-2 text-right text-slate-500 w-20">단가</th>
                      <th className="px-3 py-2 text-right text-slate-500 w-12">횟수</th>
                      <th className="px-3 py-2 text-right text-slate-500 w-12">일수</th>
                      <th className="px-3 py-2 text-right text-slate-500 w-24">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedItems.actions.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-blue-600">{item.feeCode}</td>
                        <td className="px-3 py-1.5 text-slate-800">{item.feeName}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{formatKRW(item.unitPrice)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-1.5 text-right text-slate-600">{item.days}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-800">{formatKRW(item.totalPrice)}</td>
                      </tr>
                    ))}
                    {groupedItems.actions.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-4 text-slate-400">항목 없음</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right font-bold text-slate-600">소계</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">
                        {formatKRW(groupedItems.actions.reduce((s, i) => s + i.totalPrice, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Materials Table — 재료(I) */}
              {groupedItems.materials.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-700">특정재료 (I) — {groupedItems.materials.length}항목</h3>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-500 w-20">코드</th>
                        <th className="px-3 py-2 text-left text-slate-500">항목명</th>
                        <th className="px-3 py-2 text-right text-slate-500 w-20">단가</th>
                        <th className="px-3 py-2 text-right text-slate-500 w-12">수량</th>
                        <th className="px-3 py-2 text-right text-slate-500 w-24">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {groupedItems.materials.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-blue-600">{item.feeCode}</td>
                          <td className="px-3 py-1.5 text-slate-800">{item.feeName}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{formatKRW(item.unitPrice)}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-800">{formatKRW(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right font-bold text-slate-600">소계</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">
                          {formatKRW(groupedItems.materials.reduce((s, i) => s + i.totalPrice, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* DUR Warnings */}
              {selectedClaim.durWarnings && selectedClaim.durWarnings.length > 0 && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> DUR 경고
                  </h3>
                  <ul className="space-y-1">
                    {selectedClaim.durWarnings.map((w, idx) => (
                      <li key={idx} className="text-xs text-amber-800 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Claim Summary */}
        <div className="w-64 border-l border-slate-200 bg-white flex flex-col">
          {selectedClaim ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">청구 요약</h3>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400">총 진료비</p>
                    <p className="text-lg font-bold text-slate-900">{formatKRW(selectedClaim.totalAmount)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-blue-400">보험 부담</p>
                      <p className="text-sm font-bold text-blue-700">{formatKRW(selectedClaim.insuranceAmount)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-emerald-400">본인 부담</p>
                      <p className="text-sm font-bold text-emerald-700">{formatKRW(selectedClaim.copayAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase mb-2">청구 상태</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">DUR 검증</span>
                    {selectedClaim.durChecked ? (
                      <Badge variant="success" className="text-[10px]">완료</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">미검증</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">제출 상태</span>
                    <Badge
                      variant={selectedClaim.status === 'approved' ? 'success' : selectedClaim.status === 'rejected' ? 'danger' : 'default'}
                      className="text-[10px]"
                    >
                      {selectedClaim.status === 'draft' ? '미제출' : selectedClaim.status === 'submitted' ? '제출됨' : selectedClaim.status === 'approved' ? '승인' : selectedClaim.status === 'rejected' ? '반려' : selectedClaim.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">항목 수</span>
                    <span className="font-medium text-slate-700">{selectedClaim.items.length}</span>
                  </div>
                </div>
              </div>

              {selectedClaim.rejectionReason && (
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-red-600 mb-1">반려 사유</h3>
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded">{selectedClaim.rejectionReason}</p>
                </div>
              )}

              <div className="mt-auto p-4 space-y-2">
                <button className="w-full py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">
                  청구 제출
                </button>
                <button className="w-full py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600">
                  XML 미리보기
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              청구 건을 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
