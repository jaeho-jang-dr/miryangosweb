import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FeeScheduleItemFull, BundlePrescription, BundlePrescriptionItem, FEE_CATEGORY_NAMES, FeeCategory } from '@/types/fee-schedule';
import { BillingItem, InsuranceType, COPAY_RATES } from '@/types/billing';
import { roundTo10 } from '@/lib/fee-calculator';

/**
 * Fee Engine Bridge — FeeScheduleItemFull (38-col) ↔ BillingItem 변환
 * Connects the Ichart fee_schedule_items Firestore collection with billing-engine.ts
 */

/** 수가 항목 검색 (Firestore fee_schedule_items) */
export async function searchFeeItems(
  searchQuery: string,
  category?: FeeCategory
): Promise<FeeScheduleItemFull[]> {
  const q = searchQuery.trim().toUpperCase();
  if (!q) return [];

  const constraints = [];
  if (category) {
    constraints.push(where('categoryCode', '==', category));
  }
  constraints.push(where('isDiscontinued', '!=', true));
  constraints.push(orderBy('name'));
  constraints.push(limit(50));

  const snap = await getDocs(query(collection(db, 'fee_schedule_items'), ...constraints));
  const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as FeeScheduleItemFull);

  // Client-side search filtering (Firestore doesn't support substring search)
  return items.filter(item =>
    item.name.includes(searchQuery) ||
    item.prescriptionCode.toUpperCase().includes(q) ||
    item.hiraCode.toUpperCase().includes(q) ||
    (item.searchIndex && item.searchIndex.includes(searchQuery))
  ).slice(0, 20);
}

/** 묶음처방 검색 (Firestore bundle_prescriptions) */
export async function searchBundles(searchQuery: string): Promise<BundlePrescription[]> {
  if (!searchQuery.trim()) return [];

  const snap = await getDocs(
    query(collection(db, 'bundle_prescriptions'), orderBy('name'), limit(50))
  );
  const bundles = snap.docs.map(d => ({ ...d.data(), id: d.id }) as BundlePrescription);

  const q = searchQuery.trim();
  return bundles.filter(b =>
    b.name.includes(q) ||
    b.bundleCode.toUpperCase().includes(q.toUpperCase()) ||
    (b.searchIndex && b.searchIndex.includes(q))
  ).slice(0, 20);
}

/**
 * 3-Tier 가격 결정 (상한가 > 단가 > 진료가)
 * Ichart convention: ceilingPrice (drugs) → unitPrice (general) → clinicalFee (procedures/points)
 */
export function resolve3TierPrice(item: FeeScheduleItemFull, _insuranceType?: InsuranceType): number {
  if (item.ceilingPrice && item.ceilingPrice > 0) return item.ceilingPrice;
  if (item.unitPrice && item.unitPrice > 0) return item.unitPrice;
  if (item.clinicalFee && item.clinicalFee > 0) return item.clinicalFee;
  return 0;
}

/** FeeScheduleItemFull → BillingItem 변환 */
export function feeItemToBillingItem(
  item: FeeScheduleItemFull,
  quantity: number,
  insuranceType: InsuranceType
): BillingItem {
  const unitPrice = resolve3TierPrice(item, insuranceType);
  const totalPrice = unitPrice * quantity;

  // Insurance coverage: cFlag 1=standard covered, 7=special, 8=material (usually not covered)
  const insuranceCovered = item.cFlag === 1 || item.cFlag === 7;
  const copayRate = insuranceCovered ? (item.copayRatio ?? COPAY_RATES[insuranceType]) : 1.0;
  const copayAmount = roundTo10(totalPrice * copayRate);
  const insuranceAmount = totalPrice - copayAmount;

  return {
    id: crypto.randomUUID(),
    feeCode: item.prescriptionCode,
    feeName: item.name,
    quantity,
    unitPrice,
    totalPrice,
    insuranceCovered,
    copayAmount,
    insuranceAmount,
  };
}

/** 묶음처방 → BillingItem[] 일괄 변환 */
export async function resolveBundleToBillingItems(
  bundle: BundlePrescription,
  insuranceType: InsuranceType
): Promise<BillingItem[]> {
  const billingItems: BillingItem[] = [];

  for (const bundleItem of bundle.items) {
    // Look up the full fee item by prescriptionCode
    const snap = await getDocs(
      query(
        collection(db, 'fee_schedule_items'),
        where('prescriptionCode', '==', bundleItem.prescriptionCode),
        limit(1)
      )
    );

    if (!snap.empty) {
      const feeItem = { ...snap.docs[0].data(), id: snap.docs[0].id } as FeeScheduleItemFull;
      billingItems.push(feeItemToBillingItem(feeItem, bundleItem.quantity, insuranceType));
    } else {
      // Fallback: create billing item from bundle item data
      billingItems.push({
        id: crypto.randomUUID(),
        feeCode: bundleItem.prescriptionCode,
        feeName: bundleItem.name,
        quantity: bundleItem.quantity,
        unitPrice: 0,
        totalPrice: 0,
        insuranceCovered: true,
        copayAmount: 0,
        insuranceAmount: 0,
      });
    }
  }

  return billingItems;
}

/** 특수 가산 적용 (야간/주말/소아/위탁) */
export function applySpecialRules(
  price: number,
  context: {
    night?: boolean;
    weekend?: boolean;
    age?: number;
    consignment?: boolean;
  }
): number {
  let adjusted = price;

  // 야간 가산 30% (22:00 ~ 06:00)
  if (context.night) adjusted = roundTo10(adjusted * 1.3);
  // 주말/공휴일 가산 30%
  if (context.weekend) adjusted = roundTo10(adjusted * 1.3);
  // 소아 가산 30% (6세 미만)
  if (context.age !== undefined && context.age < 6) adjusted = roundTo10(adjusted * 1.3);
  // 위탁 검사 — 마진 없이 실비
  if (context.consignment) return price;

  return adjusted;
}

/** 수가 카테고리 한글 이름 조회 */
export function getCategoryName(code: FeeCategory): string {
  return FEE_CATEGORY_NAMES[code] || '기타';
}
