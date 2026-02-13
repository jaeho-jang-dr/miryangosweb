import { InsuranceType, COPAY_RATES, FeeScheduleItem, BillingItem } from '@/types/billing';

/**
 * 본인부담금 산정기 — 한국 건강보험 수가 체계
 *
 * 건강보험: 본인부담 30% (의원급)
 * 자동차보험: 본인부담 0% (보험사 청구)
 * 산재보험: 본인부담 0%
 * 비급여: 본인부담 100%
 */

/** 단일 항목 본인부담금 계산 */
export function calculateCopay(
  basePrice: number,
  quantity: number,
  insuranceType: InsuranceType,
  isInsuranceCovered: boolean
): { total: number; copay: number; insurance: number } {
  const total = basePrice * quantity;

  if (!isInsuranceCovered) {
    return { total, copay: total, insurance: 0 };
  }

  const copayRate = COPAY_RATES[insuranceType];
  const copay = Math.round(total * copayRate);
  const insurance = total - copay;

  return { total, copay, insurance };
}

/** 진료비 총액 계산 */
export function calculateTotalFees(
  items: { fee: FeeScheduleItem; quantity: number }[],
  insuranceType: InsuranceType
): {
  items: BillingItem[];
  totalAmount: number;
  copayAmount: number;
  insuranceAmount: number;
} {
  const billingItems: BillingItem[] = items.map(({ fee, quantity }) => {
    const { total, copay, insurance } = calculateCopay(
      fee.basePrice,
      quantity,
      insuranceType,
      fee.insuranceCovered
    );

    return {
      id: crypto.randomUUID(),
      feeCode: fee.code,
      feeName: fee.name,
      quantity,
      unitPrice: fee.basePrice,
      totalPrice: total,
      insuranceCovered: fee.insuranceCovered,
      copayAmount: copay,
      insuranceAmount: insurance,
    };
  });

  const totalAmount = billingItems.reduce((s, i) => s + i.totalPrice, 0);
  const copayAmount = billingItems.reduce((s, i) => s + i.copayAmount, 0);
  const insuranceAmount = billingItems.reduce((s, i) => s + i.insuranceAmount, 0);

  return { items: billingItems, totalAmount, copayAmount, insuranceAmount };
}

/** 원 단위 포맷 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

/** 10원 단위 반올림 (의료비 계산 관행) */
export function roundTo10(amount: number): number {
  return Math.round(amount / 10) * 10;
}
