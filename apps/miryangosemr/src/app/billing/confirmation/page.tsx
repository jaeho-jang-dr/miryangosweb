'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord } from '@/types/billing';
import {
  ArrowLeft, FileText, Printer, Search, Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function PaymentConfirmationPage() {
  return <EMRLayout><PaymentConfirmationContent /></EMRLayout>;
}

function PaymentConfirmationContent() {
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear(), 0, 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const searchAndLoad = async () => {
    if (!patientQuery || patientQuery.length < 2) return;
    setLoading(true);
    try {
      // Find patient by name
      const pSnap = await getDocs(query(collection(db, 'patients'), orderBy('name')));
      const matched = pSnap.docs.find(d => d.data().name?.includes(patientQuery));
      if (!matched) { setLoading(false); return; }
      setSelectedPatient({ id: matched.id, name: matched.data().name });

      // Load billings for this patient
      const bSnap = await getDocs(
        query(collection(db, 'billing'), where('patientId', '==', matched.id), orderBy('billedAt', 'desc'))
      );
      const records = bSnap.docs.map(d => ({ id: d.id, ...d.data() }) as BillingRecord);

      // Filter by date range
      const filtered = records.filter(b => {
        const dateStr = b.billedAt?.toDate?.()?.toISOString().slice(0, 10);
        if (!dateStr) return false;
        return dateStr >= startDate && dateStr <= endDate;
      });
      setBillings(filtered);
    } catch (e) {
      console.error('조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = billings.reduce((s, b) => s + b.totalAmount, 0);
  const totalCopay = billings.reduce((s, b) => s + b.copayAmount, 0);
  const totalPaid = billings.reduce((s, b) => s + b.paidAmount, 0);
  const totalInsurance = billings.reduce((s, b) => s + b.insuranceAmount, 0);
  // 소득공제 대상액: 본인부담금 중 실제 납부한 금액 (비급여 포함)
  const taxDeductible = totalPaid;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> 진료비 납입확인서
          </h1>
          <p className="text-sm text-slate-500">기간별 진료비 납입 내역 및 소득공제 확인서를 발급합니다.</p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">환자명</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={patientQuery}
                onChange={e => setPatientQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchAndLoad()}
                placeholder="환자명 입력 후 Enter"
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">종료일</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={searchAndLoad} disabled={loading}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {loading ? '조회 중...' : '조회'}
          </button>
          {billings.length > 0 && (
            <button onClick={() => setShowPrint(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" /> 확인서 인쇄
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {selectedPatient && billings.length > 0 && !showPrint && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-slate-400">진료 횟수</p>
              <p className="text-2xl font-bold">{billings.length}회</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-slate-400">총진료비</p>
              <p className="text-xl font-bold">{formatKRW(totalAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-slate-400">보험부담</p>
              <p className="text-xl font-bold text-blue-600">{formatKRW(totalInsurance)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-slate-400">본인부담</p>
              <p className="text-xl font-bold text-emerald-600">{formatKRW(totalCopay)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center border-amber-200 bg-amber-50">
              <p className="text-xs text-amber-600 font-bold">소득공제 대상</p>
              <p className="text-xl font-bold text-amber-700">{formatKRW(taxDeductible)}</p>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-bold text-slate-800">납입 내역</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">진료일</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">보험유형</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">총진료비</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">보험부담</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">본인부담</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">납부액</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-500">결제</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {b.billedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="info" className="text-[10px]">
                        {b.insuranceType === 'nhis' ? '건보' : b.insuranceType === 'auto' ? '자보' : b.insuranceType === 'industrial' ? '산재' : '일반'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">{formatKRW(b.totalAmount)}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatKRW(b.insuranceAmount)}</td>
                    <td className="px-4 py-2 text-right">{formatKRW(b.copayAmount)}</td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatKRW(b.paidAmount)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-500">
                      {b.paymentMethod === 'cash' ? '현금' : b.paymentMethod === 'card' ? '카드' : b.paymentMethod === 'transfer' ? '이체' : b.paymentMethod || '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant={b.paymentStatus === 'paid' ? 'success' : 'warning'} className="text-[10px]">
                        {b.paymentStatus === 'paid' ? '완납' : '미완'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>합 계</td>
                  <td className="px-4 py-3 text-right">{formatKRW(totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatKRW(totalInsurance)}</td>
                  <td className="px-4 py-3 text-right">{formatKRW(totalCopay)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatKRW(totalPaid)}</td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {selectedPatient && billings.length === 0 && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
          해당 기간 납입 내역이 없습니다.
        </div>
      )}

      {/* Print View */}
      {showPrint && selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 print:shadow-none print:border-2">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">진료비 납입 확인서</h2>
            <p className="text-xs text-slate-400 mt-1">의료법 시행규칙에 의한 진료비 납입확인서</p>
          </div>

          <div className="border-y py-3 mb-4 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-400">의료기관명:</span> <span className="font-bold">밀양정형외과의원</span></div>
            <div><span className="text-slate-400">사업자등록번호:</span> XXX-XX-XXXXX</div>
            <div><span className="text-slate-400">환자성명:</span> <span className="font-bold">{selectedPatient.name}</span></div>
            <div><span className="text-slate-400">확인기간:</span> {startDate} ~ {endDate}</div>
          </div>

          <table className="w-full text-sm mb-6 border">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 border text-left">진료일자</th>
                <th className="px-3 py-2 border text-right">총진료비</th>
                <th className="px-3 py-2 border text-right">보험부담</th>
                <th className="px-3 py-2 border text-right">본인부담</th>
                <th className="px-3 py-2 border text-right">납부액</th>
              </tr>
            </thead>
            <tbody>
              {billings.map(b => (
                <tr key={b.id}>
                  <td className="px-3 py-1.5 border">{b.billedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}</td>
                  <td className="px-3 py-1.5 border text-right">{formatKRW(b.totalAmount)}</td>
                  <td className="px-3 py-1.5 border text-right">{formatKRW(b.insuranceAmount)}</td>
                  <td className="px-3 py-1.5 border text-right">{formatKRW(b.copayAmount)}</td>
                  <td className="px-3 py-1.5 border text-right font-bold">{formatKRW(b.paidAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold bg-slate-50">
              <tr>
                <td className="px-3 py-2 border">합 계</td>
                <td className="px-3 py-2 border text-right">{formatKRW(totalAmount)}</td>
                <td className="px-3 py-2 border text-right">{formatKRW(totalInsurance)}</td>
                <td className="px-3 py-2 border text-right">{formatKRW(totalCopay)}</td>
                <td className="px-3 py-2 border text-right">{formatKRW(totalPaid)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm">
            <p className="font-bold text-amber-800 mb-1">소득공제 대상 의료비</p>
            <p className="text-amber-700">
              위 기간 중 소득공제 대상 의료비 납부액은 <span className="font-bold text-lg">{formatKRW(taxDeductible)}</span> 입니다.
            </p>
          </div>

          <div className="text-center mb-8">
            <p className="text-sm">위와 같이 진료비 납입 내역을 확인합니다.</p>
            <p className="text-lg font-bold mt-4">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="text-right mt-6">
            <p className="text-base font-bold">밀양정형외과의원</p>
            <p className="text-sm text-slate-500">원장 장재호 (인)</p>
          </div>

          <div className="flex justify-center gap-3 mt-6 print:hidden">
            <button onClick={() => setShowPrint(false)} className="px-4 py-2 text-sm text-slate-600 border rounded-lg hover:bg-slate-50">닫기</button>
            <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" /> 인쇄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
