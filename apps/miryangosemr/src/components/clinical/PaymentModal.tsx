'use client';

import React, { useState } from 'react';
import { formatKRW } from '@/lib/fee-calculator';
import { processBillingPayment } from '@/lib/billing-engine';
import { BillingRecord } from '@/types/billing';
import { Badge } from '@/components/ui/badge';
import {
  X, CreditCard, Banknote, Building2, Receipt,
  CheckCircle2, Percent,
} from 'lucide-react';

interface PaymentModalProps {
  billing: BillingRecord;
  onClose: () => void;
  onPaymentComplete: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';

/**
 * 수납 모달 — 결제 수단 선택, 할인, 현금영수증, 부분 수납 지원
 */
export default function PaymentModal({ billing, onClose, onPaymentComplete }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [cashReceiptRequested, setCashReceiptRequested] = useState(false);
  const [cashReceiptId, setCashReceiptId] = useState('');
  const [partialPayment, setPartialPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(billing.copayAmount - billing.paidAmount);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const remaining = billing.copayAmount - billing.paidAmount;
  const effectiveAmount = Math.max(0, (partialPayment ? payAmount : remaining) - discountAmount);

  const insuranceLabel = billing.insuranceType === 'nhis' ? '건강보험' : billing.insuranceType === 'auto' ? '자동차보험' : billing.insuranceType === 'industrial' ? '산재보험' : '일반';

  const handlePayment = async () => {
    if (effectiveAmount <= 0 && !partialPayment) return;
    setProcessing(true);
    try {
      await processBillingPayment(billing.id, effectiveAmount, method);
      setCompleted(true);
      setTimeout(() => {
        onPaymentComplete();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('수납 처리 실패:', e);
      alert('수납 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">수납 완료</h2>
          <p className="text-sm text-slate-500">{formatKRW(effectiveAmount)} {method === 'cash' ? '현금' : method === 'card' ? '카드' : method === 'transfer' ? '계좌이체' : '혼합'} 결제</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" /> 수납 처리
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Patient & Billing Info */}
        <div className="px-5 py-3 bg-slate-50 border-b text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{billing.patientName}</span>
            <Badge variant="info" className="text-[10px]">{insuranceLabel}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
            <div><span className="text-slate-400">총진료비</span><p className="font-bold">{formatKRW(billing.totalAmount)}</p></div>
            <div><span className="text-slate-400">보험부담</span><p className="font-bold text-blue-600">{formatKRW(billing.insuranceAmount)}</p></div>
            <div><span className="text-slate-400">본인부담</span><p className="font-bold text-emerald-600">{formatKRW(billing.copayAmount)}</p></div>
          </div>
          {billing.paidAmount > 0 && (
            <p className="text-xs text-slate-400 mt-1">기납부: {formatKRW(billing.paidAmount)} | 잔액: {formatKRW(remaining)}</p>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">결제 수단</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'card' as const, label: '카드', icon: CreditCard },
                { key: 'cash' as const, label: '현금', icon: Banknote },
                { key: 'transfer' as const, label: '이체', icon: Building2 },
                { key: 'mixed' as const, label: '혼합', icon: Receipt },
              ]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-sm transition-colors ${
                    method === m.key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <m.icon className="w-5 h-5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={partialPayment} onChange={e => setPartialPayment(e.target.checked)} className="rounded" />
            부분 수납
          </label>
          {partialPayment && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">납부 금액</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                max={remaining}
              />
            </div>
          )}

          {/* Discount */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
              <Percent className="w-3.5 h-3.5" /> 할인/감면
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={discountAmount || ''}
                onChange={e => setDiscountAmount(parseInt(e.target.value) || 0)}
                placeholder="할인 금액"
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              <input
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                placeholder="할인 사유"
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Cash Receipt */}
          {(method === 'cash' || method === 'mixed') && (
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cashReceiptRequested} onChange={e => setCashReceiptRequested(e.target.checked)} className="rounded" />
                현금영수증 발급
              </label>
              {cashReceiptRequested && (
                <input
                  value={cashReceiptId}
                  onChange={e => setCashReceiptId(e.target.value)}
                  placeholder="휴대폰번호 또는 사업자번호"
                  className="w-full mt-2 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              )}
            </div>
          )}

          {/* Amount Summary */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">결제 금액</span>
              <span className="text-2xl font-bold text-emerald-700">{formatKRW(effectiveAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-slate-400 text-right mt-1">할인 -{formatKRW(discountAmount)} 적용</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border rounded-lg hover:bg-slate-50">취소</button>
          <button
            onClick={handlePayment}
            disabled={processing || effectiveAmount <= 0}
            className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold flex items-center gap-2"
          >
            {processing ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {processing ? '처리 중...' : '결제 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
