import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HIRAClaim, HIRAClaimItem, ClaimStatus } from '@/types/claims';
import { BillingRecord } from '@/types/billing';

/**
 * HIRA 청구 엔진 — 건강보험심사평가원 청구 데이터 빌더
 */

/** BillingRecord → HIRAClaim 변환 */
export function buildClaimFromBilling(
  billing: BillingRecord,
  diagnosisCodes: string[],
  diagnosisNames: string[],
  doctorName: string,
  doctorLicenseNo?: string
): Omit<HIRAClaim, 'id' | 'createdAt' | 'updatedAt'> {
  const claimItems: HIRAClaimItem[] = billing.items
    .filter(item => item.insuranceCovered)
    .map(item => ({
      id: crypto.randomUUID(),
      feeCode: item.feeCode,
      feeName: item.feeName,
      quantity: item.quantity,
      days: 1,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: '행위',
    }));

  return {
    visitId: billing.visitId,
    patientId: billing.patientId,
    patientName: billing.patientName,
    visitDate: billing.billedAt?.toDate?.()?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
    diagnosisCodes,
    diagnosisNames,
    doctorName,
    doctorLicenseNo,
    items: claimItems,
    totalAmount: billing.totalAmount,
    insuranceAmount: billing.insuranceAmount,
    copayAmount: billing.copayAmount,
    status: 'draft',
    durChecked: false,
  };
}

/** 청구 저장 (draft) */
export async function saveClaim(claim: Omit<HIRAClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'claims'), {
    ...claim,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** 청구 상태 업데이트 */
export async function updateClaimStatus(claimId: string, status: ClaimStatus, note?: string): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'submitted') updates.submittedAt = serverTimestamp();
  if (status === 'approved' || status === 'rejected') updates.reviewedAt = serverTimestamp();
  if (note && status === 'rejected') updates.rejectionReason = note;
  if (note && status === 'adjusted') updates.adjustmentNote = note;

  await updateDoc(doc(db, 'claims', claimId), updates);
}

/** 청구 목록 조회 */
export async function getClaims(filters?: { status?: ClaimStatus; month?: string }): Promise<HIRAClaim[]> {
  let q = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));

  if (filters?.status) {
    q = query(collection(db, 'claims'), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as HIRAClaim[];
}

/** DUR 검증 (simplified — 실 구현은 HIRA API 연동 필요) */
export function validateClaimForDUR(claim: Omit<HIRAClaim, 'id' | 'createdAt' | 'updatedAt'>): {
  passed: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (claim.diagnosisCodes.length === 0) {
    warnings.push('진단 코드가 입력되지 않았습니다.');
  }

  if (claim.items.length === 0) {
    warnings.push('청구 항목이 없습니다.');
  }

  if (claim.totalAmount <= 0) {
    warnings.push('청구 금액이 0원 이하입니다.');
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
