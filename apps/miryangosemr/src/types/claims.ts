import { Timestamp } from 'firebase/firestore';
import { BillingItem } from './billing';

/** HIRA 청구 상태 */
export type ClaimStatus =
  | 'draft'        // 작성 중
  | 'validated'    // 검증 완료
  | 'submitted'    // 제출됨
  | 'accepted'     // 접수 완료
  | 'reviewing'    // 심사 중
  | 'approved'     // 승인
  | 'rejected'     // 반려
  | 'adjusted'     // 조정
  | 'paid';        // 지급 완료

/** HIRA 청구 */
export interface HIRAClaim {
  id: string;
  claimNumber?: string;     // HIRA 접수번호
  visitId: string;
  patientId: string;
  patientName: string;
  patientRrn?: string;      // 주민등록번호 (masked)

  // 진료 정보
  visitDate: string;         // YYYY-MM-DD
  diagnosisCodes: string[];  // KCD 코드
  diagnosisNames: string[];  // 진단명
  doctorName: string;
  doctorLicenseNo?: string;

  // 청구 항목
  items: HIRAClaimItem[];

  // 금액
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;

  // 상태
  status: ClaimStatus;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  adjustmentNote?: string;

  // DUR 결과
  durChecked: boolean;
  durWarnings?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** HIRA 청구 항목 */
export interface HIRAClaimItem {
  id: string;
  feeCode: string;          // EDI 코드
  feeName: string;
  quantity: number;
  days: number;              // 투약일수/시술일수
  unitPrice: number;
  totalPrice: number;
  category: string;          // 행위, 약제, 치료재료 등
}

/** 청구 월별 요약 */
export interface ClaimMonthlySummary {
  month: string;            // YYYY-MM
  totalClaims: number;
  submittedAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  adjustedAmount: number;
  pendingCount: number;
}
