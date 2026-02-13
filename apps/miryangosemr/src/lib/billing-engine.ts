import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@shared/lib/firebase-clinical';
import { BillingRecord, BillingItem, InsuranceType, COPAY_RATES, FeeScheduleItem } from '@/types/billing';

/**
 * 수납 엔진 — 한국 의료 수가 기반 자동 계산
 */

/** 수가 항목으로부터 청구 항목 생성 */
export function createBillingItem(
  fee: FeeScheduleItem,
  quantity: number,
  insuranceType: InsuranceType
): BillingItem {
  const totalPrice = fee.basePrice * quantity;
  const copayRate = fee.insuranceCovered ? COPAY_RATES[insuranceType] : 1.0;
  const copayAmount = Math.round(totalPrice * copayRate);
  const insuranceAmount = totalPrice - copayAmount;

  return {
    id: crypto.randomUUID(),
    feeCode: fee.code,
    feeName: fee.name,
    quantity,
    unitPrice: fee.basePrice,
    totalPrice,
    insuranceCovered: fee.insuranceCovered,
    copayAmount,
    insuranceAmount,
  };
}

/** 청구 항목 목록에서 합계 계산 */
export function calculateTotals(items: BillingItem[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const insuranceAmount = items.reduce((sum, item) => sum + item.insuranceAmount, 0);
  const copayAmount = items.reduce((sum, item) => sum + item.copayAmount, 0);

  return { totalAmount, insuranceAmount, copayAmount };
}

/** 수납 기록 생성 */
export async function createBillingRecord(
  visitId: string,
  patientId: string,
  patientName: string,
  insuranceType: InsuranceType,
  items: BillingItem[],
  createdBy: string
): Promise<string> {
  const totals = calculateTotals(items);

  const record: Omit<BillingRecord, 'id'> = {
    visitId,
    patientId,
    patientName,
    insuranceType,
    items,
    ...totals,
    paidAmount: 0,
    unpaidAmount: totals.copayAmount,
    paymentStatus: 'pending',
    billedAt: Timestamp.now(),
    createdBy,
  };

  const docRef = await addDoc(collection(db, 'billing'), {
    ...record,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** 수납 처리 (결제) */
export async function processBillingPayment(
  billingId: string,
  paidAmount: number,
  paymentMethod: BillingRecord['paymentMethod']
): Promise<void> {
  await updateDoc(doc(db, 'billing', billingId), {
    paidAmount,
    paymentMethod,
    paymentStatus: 'paid',
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 일일 수납 조회 */
export async function getDailyBillings(date: Date): Promise<BillingRecord[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'billing'),
    where('billedAt', '>=', Timestamp.fromDate(startOfDay)),
    where('billedAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('billedAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as BillingRecord[];
}
