import { BillingRecord } from '@/types/billing';
import { formatKRW } from './fee-calculator';

/**
 * 영수증 생성기
 *
 * 의료법 시행규칙 제11조에 따른 진료비 세부내역서 생성
 */

export interface ReceiptData {
  receiptNumber: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicLicenseNo: string;
  patientName: string;
  visitDate: string;
  insuranceType: string;
  items: {
    category: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    copay: string;
  }[];
  totalAmount: string;
  insuranceAmount: string;
  copayAmount: string;
  paidAmount: string;
  paymentMethod: string;
  issuedAt: string;
}

const INSURANCE_LABELS: Record<string, string> = {
  nhis: '건강보험',
  auto: '자동차보험',
  industrial: '산재보험',
  none: '비급여/일반',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: '현금',
  card: '카드',
  transfer: '계좌이체',
  mixed: '혼합',
};

/** 영수증 번호 생성 */
export function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${dateStr}-${random}`;
}

// 의료법 시행규칙 제11조: 진료비 영수증 필수 기재 항목
const CLINIC_INFO = {
  name: process.env.NEXT_PUBLIC_CLINIC_NAME || '밀양 정형외과',
  address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || '경남 밀양시',
  phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || '055-000-0000',
  licenseNo: process.env.NEXT_PUBLIC_CLINIC_LICENSE_NO || '',
};

/** BillingRecord → 출력용 ReceiptData 변환 */
export function generateReceiptData(record: BillingRecord): ReceiptData {
  return {
    receiptNumber: record.receiptNumber || generateReceiptNumber(),
    clinicName: CLINIC_INFO.name,
    clinicAddress: CLINIC_INFO.address,
    clinicPhone: CLINIC_INFO.phone,
    clinicLicenseNo: CLINIC_INFO.licenseNo,
    patientName: record.patientName,
    visitDate: record.billedAt?.toDate ? record.billedAt.toDate().toLocaleDateString('ko-KR') : '-',
    insuranceType: INSURANCE_LABELS[record.insuranceType] || '일반',
    items: record.items.map(item => ({
      category: item.insuranceCovered ? '급여' : '비급여',
      name: item.feeName,
      quantity: item.quantity,
      unitPrice: formatKRW(item.unitPrice),
      totalPrice: formatKRW(item.totalPrice),
      copay: formatKRW(item.copayAmount),
    })),
    totalAmount: formatKRW(record.totalAmount),
    insuranceAmount: formatKRW(record.insuranceAmount),
    copayAmount: formatKRW(record.copayAmount),
    paidAmount: formatKRW(record.paidAmount),
    paymentMethod: PAYMENT_LABELS[record.paymentMethod || 'cash'] || '현금',
    issuedAt: new Date().toLocaleString('ko-KR'),
  };
}
