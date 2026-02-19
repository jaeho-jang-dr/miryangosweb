'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import { BillingRecord, BillingItem, InsuranceType } from '@/types/billing';
import { generateReceiptData, generateReceiptNumber } from '@/lib/receipt-generator';
import {
  ArrowLeft, FileText, Printer, Download, Receipt,
} from 'lucide-react';
import Link from 'next/link';

/** Ichart 진료비 항목 카테고리 */
const FEE_CATEGORIES = [
  { key: 'consultation', label: '진찰료', codes: ['AA', 'AB'] },
  { key: 'medication', label: '투약료', codes: ['05', '06'] },
  { key: 'injection', label: '주사료', codes: ['08', '09', '10'] },
  { key: 'anesthesia', label: '마취료', codes: ['14'] },
  { key: 'procedure', label: '처치·수술료', codes: ['17', '18'] },
  { key: 'test', label: '검사료', codes: ['21', '22'] },
  { key: 'radiology', label: '영상진단료', codes: ['23', '24'] },
  { key: 'pt', label: '이학요법료', codes: ['11'] },
  { key: 'material', label: '치료재료', codes: ['20', '19'] },
  { key: 'other', label: '기타', codes: [] },
];

function categorizeFeeCode(code: string): string {
  for (const cat of FEE_CATEGORIES) {
    if (cat.codes.some(prefix => code.startsWith(prefix))) return cat.key;
  }
  return 'other';
}

export default function BillingCalculatorPage() {
  return (
    <EMRLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <BillingCalculatorContent />
      </Suspense>
    </EMRLayout>
  );
}

function BillingCalculatorContent() {
  const searchParams = useSearchParams();
  const billingId = searchParams.get('billingId');
  const visitId = searchParams.get('visitId');

  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadBilling();
  }, [billingId, visitId]);

  const loadBilling = async () => {
    setLoading(true);
    try {
      if (billingId) {
        const snap = await getDoc(doc(db, 'billing', billingId));
        if (snap.exists()) setBilling({ id: snap.id, ...snap.data() } as BillingRecord);
      } else if (visitId) {
        const snap = await getDocs(
          query(collection(db, 'billing'), where('visitId', '==', visitId), limit(1))
        );
        if (!snap.empty) setBilling({ id: snap.docs[0].id, ...snap.docs[0].data() } as BillingRecord);
      }
    } catch (e) {
      console.error('청구 데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!billing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> 진료비 계산서
          </h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
          <p>청구 데이터를 불러올 수 없습니다.</p>
          <p className="text-sm mt-2">URL에 billingId 또는 visitId 파라미터가 필요합니다.</p>
          <Link href="/billing" className="mt-4 inline-block text-emerald-600 hover:underline text-sm">수납 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  // Group items by category
  const grouped = FEE_CATEGORIES.map(cat => {
    const items = billing.items.filter(i => categorizeFeeCode(i.feeCode) === cat.key);
    const coveredTotal = items.filter(i => i.insuranceCovered).reduce((s, i) => s + i.totalPrice, 0);
    const fullCopayTotal = 0; // 전액본인부담 (100/100 items) - future
    const nonCoveredTotal = items.filter(i => !i.insuranceCovered).reduce((s, i) => s + i.totalPrice, 0);
    return { ...cat, items, coveredTotal, fullCopayTotal, nonCoveredTotal, total: coveredTotal + fullCopayTotal + nonCoveredTotal };
  }).filter(g => g.items.length > 0);

  const totalCovered = grouped.reduce((s, g) => s + g.coveredTotal, 0);
  const totalNonCovered = grouped.reduce((s, g) => s + g.nonCoveredTotal, 0);
  const grandTotal = totalCovered + totalNonCovered;

  const insuranceLabel = billing.insuranceType === 'nhis' ? '건강보험' : billing.insuranceType === 'auto' ? '자동차보험' : billing.insuranceType === 'industrial' ? '산재보험' : '비급여/일반';
  const visitDate = billing.billedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> 진료비 계산서 · 세부내역서
            </h1>
            <p className="text-sm text-slate-500">{billing.patientName} | {visitDate} | {insuranceLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReceipt(!showReceipt)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5" /> {showReceipt ? '계산서' : '영수증'}
          </button>
          <button onClick={() => window.print()} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" /> 인쇄
          </button>
        </div>
      </div>

      {showReceipt ? (
        <ReceiptView billing={billing} />
      ) : (
        <>
          {/* Fee Breakdown Table — Ichart style */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-2">
            {/* Hospital Header */}
            <div className="p-4 border-b text-center print:py-6">
              <h2 className="text-lg font-bold text-slate-900">밀양정형외과의원</h2>
              <p className="text-xs text-slate-400">요양기관기호: 38315599 | TEL: 055-XXX-XXXX</p>
              <h3 className="text-base font-bold text-slate-800 mt-2">진료비 세부 산정내역</h3>
            </div>

            {/* Patient Info */}
            <div className="px-4 py-3 border-b bg-slate-50 grid grid-cols-4 gap-4 text-sm">
              <div><span className="text-slate-400">환자명:</span> <span className="font-bold">{billing.patientName}</span></div>
              <div><span className="text-slate-400">진료일:</span> <span className="font-medium">{visitDate}</span></div>
              <div><span className="text-slate-400">보험유형:</span> <Badge variant="info" className="text-[10px]">{insuranceLabel}</Badge></div>
              <div><span className="text-slate-400">영수증번호:</span> <span className="font-mono text-xs">{billing.receiptNumber || '-'}</span></div>
            </div>

            {/* Category Breakdown Table */}
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-slate-700" rowSpan={2}>항 목</th>
                  <th className="px-4 py-2 text-center font-bold text-slate-700 border-l" colSpan={2}>급여</th>
                  <th className="px-4 py-2 text-center font-bold text-slate-700 border-l">비급여</th>
                  <th className="px-4 py-2 text-right font-bold text-slate-700 border-l" rowSpan={2}>합계</th>
                </tr>
                <tr>
                  <th className="px-4 py-1 text-center text-xs text-slate-500 border-l">일부본인부담</th>
                  <th className="px-4 py-1 text-center text-xs text-slate-500">전액본인부담</th>
                  <th className="px-4 py-1 text-center text-xs text-slate-500 border-l">-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grouped.map(g => (
                  <tr key={g.key} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{g.label}</td>
                    <td className="px-4 py-2 text-right border-l">{g.coveredTotal > 0 ? formatKRW(g.coveredTotal) : '-'}</td>
                    <td className="px-4 py-2 text-right">{g.fullCopayTotal > 0 ? formatKRW(g.fullCopayTotal) : '-'}</td>
                    <td className="px-4 py-2 text-right border-l text-red-600">{g.nonCoveredTotal > 0 ? formatKRW(g.nonCoveredTotal) : '-'}</td>
                    <td className="px-4 py-2 text-right font-bold border-l">{formatKRW(g.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-slate-800">합 계</td>
                  <td className="px-4 py-3 text-right border-l">{formatKRW(totalCovered)}</td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-right border-l text-red-600">{formatKRW(totalNonCovered)}</td>
                  <td className="px-4 py-3 text-right border-l text-lg">{formatKRW(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment Summary */}
            <div className="p-4 border-t bg-emerald-50 grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400">총진료비</p>
                <p className="text-lg font-bold text-slate-900">{formatKRW(billing.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">보험 부담</p>
                <p className="text-lg font-bold text-blue-600">{formatKRW(billing.insuranceAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">본인부담금</p>
                <p className="text-lg font-bold text-emerald-600">{formatKRW(billing.copayAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">납부액</p>
                <p className="text-lg font-bold text-purple-600">{formatKRW(billing.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">미수금</p>
                <p className="text-lg font-bold text-red-600">{formatKRW(billing.unpaidAmount)}</p>
              </div>
            </div>
          </div>

          {/* Detailed Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-bold text-slate-800">세부 항목 내역</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">코드</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">항목</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">수량</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">단가</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">금액</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-500">급여</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">본인부담</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">보험부담</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billing.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{item.feeCode}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{item.feeName}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatKRW(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-right font-bold">{formatKRW(item.totalPrice)}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant={item.insuranceCovered ? 'success' : 'danger'} className="text-[10px]">
                        {item.insuranceCovered ? '급여' : '비급여'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600">{formatKRW(item.copayAmount)}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatKRW(item.insuranceAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** 영수증 뷰 */
function ReceiptView({ billing }: { billing: BillingRecord }) {
  const receipt = generateReceiptData(billing);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg mx-auto print:shadow-none print:border-2">
      <div className="text-center border-b pb-4 mb-4">
        <h2 className="text-lg font-bold">{receipt.clinicName}</h2>
        <p className="text-xs text-slate-400">{receipt.clinicAddress} | TEL: {receipt.clinicPhone}</p>
        <h3 className="text-base font-bold mt-2">진료비 영수증</h3>
        <p className="text-xs text-slate-400 mt-1">영수증번호: {receipt.receiptNumber}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><span className="text-slate-400">환자명:</span> <span className="font-bold">{receipt.patientName}</span></div>
        <div><span className="text-slate-400">진료일:</span> {receipt.visitDate}</div>
        <div><span className="text-slate-400">보험유형:</span> {receipt.insuranceType}</div>
        <div><span className="text-slate-400">결제수단:</span> {receipt.paymentMethod}</div>
      </div>

      <table className="w-full text-sm mb-4">
        <thead className="bg-slate-50 border-y">
          <tr>
            <th className="px-2 py-1 text-left text-xs">항목</th>
            <th className="px-2 py-1 text-right text-xs">수량</th>
            <th className="px-2 py-1 text-right text-xs">금액</th>
            <th className="px-2 py-1 text-right text-xs">본인부담</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {receipt.items.map((item, idx) => (
            <tr key={idx}>
              <td className="px-2 py-1">{item.name}</td>
              <td className="px-2 py-1 text-right">{item.quantity}</td>
              <td className="px-2 py-1 text-right">{item.totalPrice}</td>
              <td className="px-2 py-1 text-right font-bold">{item.copay}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">총진료비</span><span className="font-bold">{receipt.totalAmount}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">보험부담</span><span>{receipt.insuranceAmount}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">본인부담</span><span className="font-bold text-emerald-600">{receipt.copayAmount}</span></div>
        <div className="flex justify-between border-t pt-2 mt-2"><span className="text-slate-500">납부액</span><span className="text-lg font-bold">{receipt.paidAmount}</span></div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        <p>발행일시: {receipt.issuedAt}</p>
        <p className="mt-1">의료법 시행규칙 제11조에 의한 진료비 영수증</p>
      </div>
    </div>
  );
}
