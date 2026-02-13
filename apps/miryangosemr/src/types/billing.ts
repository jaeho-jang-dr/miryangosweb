import { Timestamp } from 'firebase/firestore';

/** 보험 유형 */
export type InsuranceType = 'nhis' | 'auto' | 'industrial' | 'none';

/** 본인부담 비율 */
export const COPAY_RATES: Record<InsuranceType, number> = {
  nhis: 0.3,        // 건강보험 30%
  auto: 0,           // 자동차보험 0% (보험사 전액)
  industrial: 0,     // 산재보험 0%
  none: 1.0,         // 비급여/미보험 100%
};

/** 수가 항목 (fee schedule item) */
export interface FeeScheduleItem {
  id: string;
  code: string;           // 수가 코드 (예: AA157)
  name: string;           // 수가명 (예: 초진진찰료)
  category: 'consultation' | 'test' | 'procedure' | 'injection' | 'material' | 'medication' | 'physical_therapy' | 'other';
  insuranceCovered: boolean; // 급여 여부
  basePrice: number;       // 기본 수가 (원)
  unit: string;            // 단위 (회, 개, ml 등)
  description?: string;
  updatedAt?: Timestamp;
}

/** 청구 항목 (개별 line item) */
export interface BillingItem {
  id: string;
  feeCode: string;         // 수가 코드
  feeName: string;         // 수가명
  quantity: number;         // 수량
  unitPrice: number;        // 단가
  totalPrice: number;       // 소계 (quantity * unitPrice)
  insuranceCovered: boolean; // 급여 여부
  copayAmount: number;      // 본인부담금
  insuranceAmount: number;  // 보험부담금
}

/** 수납 기록 */
export interface BillingRecord {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  insuranceType: InsuranceType;
  items: BillingItem[];

  // Totals
  totalAmount: number;      // 총 진료비
  insuranceAmount: number;  // 보험 부담금
  copayAmount: number;      // 본인부담금
  paidAmount: number;       // 실제 납부금
  unpaidAmount: number;     // 미수금

  // Payment
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'mixed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  receiptNumber?: string;

  billedAt: Timestamp;
  paidAt?: Timestamp;
  createdBy: string;       // Staff who processed
}

/** 일일 수납 요약 */
export interface DailySummary {
  date: string;            // YYYY-MM-DD
  totalPatients: number;
  totalRevenue: number;
  insuranceBilled: number;
  copayCollected: number;
  cashPayments: number;
  cardPayments: number;
  unpaidAmount: number;
}
