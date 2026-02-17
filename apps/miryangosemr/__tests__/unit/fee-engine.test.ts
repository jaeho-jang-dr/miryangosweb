import { describe, it, expect } from 'vitest';

// ---- Type definitions (mirrored from src/types/fee-schedule.ts & billing.ts) ----

type InsuranceType = 'nhis' | 'auto' | 'industrial' | 'none';

const COPAY_RATES: Record<InsuranceType, number> = {
  nhis: 0.3,
  auto: 0,
  industrial: 0,
  none: 1.0,
};

type FeeCategory =
  | '01' | '02' | '03' | '05' | '06' | '07' | '08' | '09'
  | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17'
  | '18' | '19' | '20' | '21' | '22' | '23' | '28' | '29'
  | '31' | '32' | '33' | '34' | '35' | '36';

const FEE_CATEGORY_NAMES: Record<FeeCategory, string> = {
  '01': '초진료',
  '02': '재진료',
  '03': '응급관리',
  '05': '내복약',
  '06': '외용약',
  '07': '처방전',
  '08': '근육주',
  '09': '정맥주',
  '10': '수액제',
  '11': '기타주',
  '12': 'IVSide',
  '13': '특정재료',
  '14': '마취료',
  '15': '이학요법',
  '16': '정신치료',
  '17': '처치료',
  '18': '수술료',
  '19': '수혈료',
  '20': '캐스트',
  '21': '기능검사',
  '22': '기타검사',
  '23': '방사선진단',
  '28': '기타입원',
  '29': '식대',
  '31': '보조기',
  '32': '확인수수',
  '33': '호송료',
  '34': '초음파',
  '35': '병실차액',
  '36': '기타',
};

interface FeeScheduleItemFull {
  id: string;
  prescriptionCode: string;
  hiraCode: string;
  name: string;
  ex?: number;
  categoryCode: FeeCategory;
  categoryName: string;
  effectiveDate: string;
  ceilingPrice?: number;
  unitPrice?: number;
  clinicalFee?: number;
  surcharge?: number;
  cFlag: number;
  w1Flag?: number;
  w2Flag?: number;
  hFlag?: boolean;
  pFlag?: boolean;
  mFlag?: boolean;
  iFlag?: number;
  isPsychotropic: boolean;
  isNarcotic: boolean;
  isRequired: boolean;
  isDementia?: boolean;
  isDialysis?: boolean;
  searchIndex?: string;
  prescriptionPurpose?: string;
  ingredientCode?: string;
  isDiscontinued?: boolean;
  dosageCode?: string;
  defaultQuantity?: number;
  defaultFrequency?: number;
  dosageText?: string;
  diagnosisCode?: string;
  billingMemo?: string;
  substituteCode?: string;
  copayRatio?: number;
  labManagement?: number;
  createdAt?: string;
  updatedAt?: string;
  codeClassifier?: string;
  consignmentMethod?: string;
  consignmentCategory?: string;
}

interface BillingItem {
  id: string;
  feeCode: string;
  feeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCovered: boolean;
  copayAmount: number;
  insuranceAmount: number;
}

// ---- Pure function copies from fee-engine.ts ----

/** 10원 단위 반올림 (from fee-calculator.ts) */
function roundTo10(amount: number): number {
  return Math.round(amount / 10) * 10;
}

/** 3-Tier 가격 결정 (상한가 > 단가 > 진료가) */
function resolve3TierPrice(item: FeeScheduleItemFull, _insuranceType?: InsuranceType): number {
  if (item.ceilingPrice && item.ceilingPrice > 0) return item.ceilingPrice;
  if (item.unitPrice && item.unitPrice > 0) return item.unitPrice;
  if (item.clinicalFee && item.clinicalFee > 0) return item.clinicalFee;
  return 0;
}

/** FeeScheduleItemFull → BillingItem 변환 */
function feeItemToBillingItem(
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

/** 특수 가산 적용 (야간/주말/소아/위탁) */
function applySpecialRules(
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
function getCategoryName(code: FeeCategory): string {
  return FEE_CATEGORY_NAMES[code] || '기타';
}

// ---- Helper factory functions ----

function makeFeeItemFull(overrides: Partial<FeeScheduleItemFull> = {}): FeeScheduleItemFull {
  return {
    id: 'item-001',
    prescriptionCode: 'AA157',
    hiraCode: 'A0001',
    name: '초진진찰료',
    categoryCode: '01',
    categoryName: '01초진료',
    effectiveDate: '2025.01.01',
    ceilingPrice: undefined,
    unitPrice: 16800,
    clinicalFee: undefined,
    cFlag: 1,
    isPsychotropic: false,
    isNarcotic: false,
    isRequired: false,
    ...overrides,
  };
}

// ====================================================================
// resolve3TierPrice tests
// ====================================================================
describe('resolve3TierPrice', () => {
  describe('tier priority (ceilingPrice > unitPrice > clinicalFee)', () => {
    it('should return ceilingPrice when all three tiers are present', () => {
      const item = makeFeeItemFull({
        ceilingPrice: 500,
        unitPrice: 300,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(500);
    });

    it('should return unitPrice when ceilingPrice is absent', () => {
      const item = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: 300,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(300);
    });

    it('should return clinicalFee when ceilingPrice and unitPrice are absent', () => {
      const item = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: undefined,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(200);
    });

    it('should return 0 when all price tiers are absent', () => {
      const item = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: undefined,
        clinicalFee: undefined,
      });
      expect(resolve3TierPrice(item)).toBe(0);
    });
  });

  describe('zero-price handling', () => {
    it('should skip ceilingPrice of 0 and use unitPrice', () => {
      const item = makeFeeItemFull({
        ceilingPrice: 0,
        unitPrice: 300,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(300);
    });

    it('should skip unitPrice of 0 and use clinicalFee', () => {
      const item = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: 0,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(200);
    });

    it('should return 0 when all tiers are zero', () => {
      const item = makeFeeItemFull({
        ceilingPrice: 0,
        unitPrice: 0,
        clinicalFee: 0,
      });
      expect(resolve3TierPrice(item)).toBe(0);
    });
  });

  describe('negative-price handling', () => {
    it('should skip negative ceilingPrice', () => {
      const item = makeFeeItemFull({
        ceilingPrice: -100,
        unitPrice: 300,
        clinicalFee: 200,
      });
      // -100 is falsy for `> 0` check, so falls through to unitPrice
      expect(resolve3TierPrice(item)).toBe(300);
    });

    it('should skip negative unitPrice', () => {
      const item = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: -50,
        clinicalFee: 200,
      });
      expect(resolve3TierPrice(item)).toBe(200);
    });
  });

  describe('drug-specific pricing (ceiling price common for drugs)', () => {
    it('should use ceilingPrice for a drug item', () => {
      const drug = makeFeeItemFull({
        prescriptionCode: 'D001',
        name: '아목시실린',
        categoryCode: '05',
        ceilingPrice: 1234,
        unitPrice: 0,
        clinicalFee: 0,
      });
      expect(resolve3TierPrice(drug)).toBe(1234);
    });
  });

  describe('procedure-specific pricing (clinicalFee/points common for procedures)', () => {
    it('should use clinicalFee for a procedure item when unitPrice is absent', () => {
      const procedure = makeFeeItemFull({
        prescriptionCode: 'N0871',
        name: '관혈적 정복술',
        categoryCode: '18',
        ceilingPrice: undefined,
        unitPrice: undefined,
        clinicalFee: 950000,
      });
      expect(resolve3TierPrice(procedure)).toBe(950000);
    });
  });

  describe('insuranceType parameter', () => {
    it('should return same price regardless of insurance type (unused parameter)', () => {
      const item = makeFeeItemFull({ unitPrice: 5000 });
      const types: InsuranceType[] = ['nhis', 'auto', 'industrial', 'none'];

      for (const t of types) {
        expect(resolve3TierPrice(item, t)).toBe(5000);
      }
    });
  });
});

// ====================================================================
// feeItemToBillingItem tests
// ====================================================================
describe('feeItemToBillingItem', () => {
  describe('basic conversion with NHIS', () => {
    it('should convert a standard covered item (cFlag=1) with NHIS', () => {
      const item = makeFeeItemFull({
        prescriptionCode: 'AA157',
        name: '초진진찰료',
        unitPrice: 16800,
        cFlag: 1,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      expect(billing.feeCode).toBe('AA157');
      expect(billing.feeName).toBe('초진진찰료');
      expect(billing.quantity).toBe(1);
      expect(billing.unitPrice).toBe(16800);
      expect(billing.totalPrice).toBe(16800);
      expect(billing.insuranceCovered).toBe(true);
      // copay = roundTo10(16800 * 0.3) = roundTo10(5040) = 5040
      expect(billing.copayAmount).toBe(5040);
      expect(billing.insuranceAmount).toBe(11760);
    });

    it('should generate unique id for each conversion', () => {
      const item = makeFeeItemFull();
      const b1 = feeItemToBillingItem(item, 1, 'nhis');
      const b2 = feeItemToBillingItem(item, 1, 'nhis');

      expect(b1.id).toBeTruthy();
      expect(b2.id).toBeTruthy();
      expect(b1.id).not.toBe(b2.id);
    });
  });

  describe('cFlag-based insurance coverage determination', () => {
    it('should mark cFlag=1 as insurance covered', () => {
      const item = makeFeeItemFull({ cFlag: 1 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.insuranceCovered).toBe(true);
    });

    it('should mark cFlag=7 (special) as insurance covered', () => {
      const item = makeFeeItemFull({ cFlag: 7 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.insuranceCovered).toBe(true);
    });

    it('should mark cFlag=8 (material) as NOT insurance covered', () => {
      const item = makeFeeItemFull({ cFlag: 8, unitPrice: 10000 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');

      expect(billing.insuranceCovered).toBe(false);
      // Non-covered items: copayRate = 1.0, patient pays 100%
      expect(billing.copayAmount).toBe(10000);
      expect(billing.insuranceAmount).toBe(0);
    });

    it('should mark cFlag=0 as NOT insurance covered', () => {
      const item = makeFeeItemFull({ cFlag: 0, unitPrice: 5000 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');

      expect(billing.insuranceCovered).toBe(false);
      expect(billing.copayAmount).toBe(5000);
    });

    it('should mark cFlag=2 as NOT insurance covered', () => {
      const item = makeFeeItemFull({ cFlag: 2, unitPrice: 5000 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.insuranceCovered).toBe(false);
    });
  });

  describe('copayRatio override', () => {
    it('should use item-specific copayRatio when provided (e.g., 50%)', () => {
      const item = makeFeeItemFull({
        unitPrice: 10000,
        cFlag: 1,
        copayRatio: 0.5,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      // copayRatio 0.5 overrides COPAY_RATES.nhis (0.3)
      // roundTo10(10000 * 0.5) = 5000
      expect(billing.copayAmount).toBe(5000);
      expect(billing.insuranceAmount).toBe(5000);
    });

    it('should use item-specific copayRatio of 80%', () => {
      const item = makeFeeItemFull({
        unitPrice: 10000,
        cFlag: 1,
        copayRatio: 0.8,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      // roundTo10(10000 * 0.8) = 8000
      expect(billing.copayAmount).toBe(8000);
      expect(billing.insuranceAmount).toBe(2000);
    });

    it('should use item-specific copayRatio of 90%', () => {
      const item = makeFeeItemFull({
        unitPrice: 10000,
        cFlag: 1,
        copayRatio: 0.9,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      // roundTo10(10000 * 0.9) = 9000
      expect(billing.copayAmount).toBe(9000);
      expect(billing.insuranceAmount).toBe(1000);
    });

    it('should fall back to COPAY_RATES when copayRatio is undefined', () => {
      const item = makeFeeItemFull({
        unitPrice: 10000,
        cFlag: 1,
        copayRatio: undefined,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      // Falls back to COPAY_RATES.nhis = 0.3
      // roundTo10(10000 * 0.3) = 3000
      expect(billing.copayAmount).toBe(3000);
    });

    it('should ignore copayRatio for non-covered items (cFlag=8)', () => {
      const item = makeFeeItemFull({
        unitPrice: 10000,
        cFlag: 8,
        copayRatio: 0.3,
      });

      const billing = feeItemToBillingItem(item, 1, 'nhis');

      // Non-covered: copayRate = 1.0 regardless of copayRatio
      expect(billing.copayAmount).toBe(10000);
      expect(billing.insuranceAmount).toBe(0);
    });
  });

  describe('auto insurance (0% copay)', () => {
    it('should have 0% copay for auto insurance on covered items', () => {
      const item = makeFeeItemFull({ unitPrice: 50000, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 1, 'auto');

      expect(billing.copayAmount).toBe(0);
      expect(billing.insuranceAmount).toBe(50000);
    });
  });

  describe('quantity multiplication', () => {
    it('should multiply unitPrice by quantity', () => {
      const item = makeFeeItemFull({ unitPrice: 5000, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 4, 'nhis');

      expect(billing.totalPrice).toBe(20000);
      // roundTo10(20000 * 0.3) = roundTo10(6000) = 6000
      expect(billing.copayAmount).toBe(6000);
      expect(billing.insuranceAmount).toBe(14000);
    });
  });

  describe('rounding (roundTo10)', () => {
    it('should round copay to nearest 10 won', () => {
      // 16800 * 0.3 = 5040 → roundTo10 = 5040 (already a multiple of 10)
      const item = makeFeeItemFull({ unitPrice: 16800, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.copayAmount).toBe(5040);
    });

    it('should round 5 up in copay', () => {
      // Need a price where copay ends in 5
      // 1050 * 0.3 = 315 → roundTo10 = 320
      const item = makeFeeItemFull({ unitPrice: 1050, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.copayAmount).toBe(320);
    });

    it('should round copay correctly for odd prices', () => {
      // 3333 * 0.3 = 999.9 → roundTo10 = 1000
      const item = makeFeeItemFull({ unitPrice: 3333, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.copayAmount).toBe(1000);
      expect(billing.insuranceAmount).toBe(2333);
    });
  });

  describe('3-tier price resolution in billing conversion', () => {
    it('should use ceilingPrice for drug items', () => {
      const drug = makeFeeItemFull({
        ceilingPrice: 1500,
        unitPrice: 0,
        clinicalFee: 0,
        cFlag: 1,
      });
      const billing = feeItemToBillingItem(drug, 10, 'nhis');

      expect(billing.unitPrice).toBe(1500);
      expect(billing.totalPrice).toBe(15000);
    });

    it('should use clinicalFee when other prices are absent', () => {
      const procedure = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: undefined,
        clinicalFee: 80000,
        cFlag: 1,
      });
      const billing = feeItemToBillingItem(procedure, 1, 'nhis');

      expect(billing.unitPrice).toBe(80000);
      expect(billing.totalPrice).toBe(80000);
    });

    it('should return 0 price when no tier has a valid price', () => {
      const noPrice = makeFeeItemFull({
        ceilingPrice: undefined,
        unitPrice: undefined,
        clinicalFee: undefined,
        cFlag: 1,
      });
      const billing = feeItemToBillingItem(noPrice, 1, 'nhis');

      expect(billing.unitPrice).toBe(0);
      expect(billing.totalPrice).toBe(0);
      expect(billing.copayAmount).toBe(0);
      expect(billing.insuranceAmount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity', () => {
      const item = makeFeeItemFull({ unitPrice: 10000, cFlag: 1 });
      const billing = feeItemToBillingItem(item, 0, 'nhis');

      expect(billing.totalPrice).toBe(0);
      expect(billing.copayAmount).toBe(0);
      expect(billing.insuranceAmount).toBe(0);
    });

    it('should preserve copay + insurance = total for all insurance types', () => {
      const item = makeFeeItemFull({ unitPrice: 7777, cFlag: 1 });
      const types: InsuranceType[] = ['nhis', 'auto', 'industrial', 'none'];

      for (const t of types) {
        const billing = feeItemToBillingItem(item, 3, t);
        expect(billing.copayAmount + billing.insuranceAmount).toBe(billing.totalPrice);
      }
    });

    it('should map prescriptionCode to feeCode', () => {
      const item = makeFeeItemFull({ prescriptionCode: 'MM123' });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.feeCode).toBe('MM123');
    });

    it('should map name to feeName', () => {
      const item = makeFeeItemFull({ name: '경피적전기신경자극치료' });
      const billing = feeItemToBillingItem(item, 1, 'nhis');
      expect(billing.feeName).toBe('경피적전기신경자극치료');
    });
  });
});

// ====================================================================
// applySpecialRules tests
// ====================================================================
describe('applySpecialRules', () => {
  const basePrice = 10000;

  describe('single surcharges', () => {
    it('should apply 30% night surcharge', () => {
      const result = applySpecialRules(basePrice, { night: true });
      // roundTo10(10000 * 1.3) = 13000
      expect(result).toBe(13000);
    });

    it('should apply 30% weekend surcharge', () => {
      const result = applySpecialRules(basePrice, { weekend: true });
      // roundTo10(10000 * 1.3) = 13000
      expect(result).toBe(13000);
    });

    it('should apply 30% pediatric surcharge for age < 6', () => {
      const result = applySpecialRules(basePrice, { age: 5 });
      expect(result).toBe(13000);
    });

    it('should apply pediatric surcharge for newborn (age=0)', () => {
      const result = applySpecialRules(basePrice, { age: 0 });
      expect(result).toBe(13000);
    });

    it('should NOT apply pediatric surcharge for age = 6', () => {
      const result = applySpecialRules(basePrice, { age: 6 });
      expect(result).toBe(10000);
    });

    it('should NOT apply pediatric surcharge for age > 6', () => {
      const result = applySpecialRules(basePrice, { age: 30 });
      expect(result).toBe(10000);
    });

    it('should NOT apply surcharge when age is undefined', () => {
      const result = applySpecialRules(basePrice, {});
      expect(result).toBe(10000);
    });
  });

  describe('consignment override', () => {
    it('should return original price for consignment (no margin)', () => {
      const result = applySpecialRules(basePrice, { consignment: true });
      expect(result).toBe(basePrice);
    });

    it('should return original price even with other surcharges combined', () => {
      // Consignment overrides all other adjustments
      const result = applySpecialRules(basePrice, {
        night: true,
        weekend: true,
        age: 3,
        consignment: true,
      });
      expect(result).toBe(basePrice);
    });

    it('should not apply consignment when false', () => {
      const result = applySpecialRules(basePrice, { consignment: false });
      expect(result).toBe(10000);
    });
  });

  describe('compound surcharges (stacking)', () => {
    it('should stack night + weekend surcharges (1.3 * 1.3)', () => {
      const result = applySpecialRules(basePrice, { night: true, weekend: true });
      // Step 1: roundTo10(10000 * 1.3) = 13000
      // Step 2: roundTo10(13000 * 1.3) = roundTo10(16900) = 16900
      expect(result).toBe(16900);
    });

    it('should stack night + pediatric surcharges', () => {
      const result = applySpecialRules(basePrice, { night: true, age: 3 });
      // Step 1: roundTo10(10000 * 1.3) = 13000
      // Step 2: roundTo10(13000 * 1.3) = roundTo10(16900) = 16900
      expect(result).toBe(16900);
    });

    it('should stack weekend + pediatric surcharges', () => {
      const result = applySpecialRules(basePrice, { weekend: true, age: 2 });
      // Step 1: roundTo10(10000 * 1.3) = 13000
      // Step 2: roundTo10(13000 * 1.3) = roundTo10(16900) = 16900
      expect(result).toBe(16900);
    });

    it('should stack all three surcharges (night + weekend + pediatric)', () => {
      const result = applySpecialRules(basePrice, { night: true, weekend: true, age: 1 });
      // Step 1 (night): roundTo10(10000 * 1.3) = 13000
      // Step 2 (weekend): roundTo10(13000 * 1.3) = roundTo10(16900) = 16900
      // Step 3 (pediatric): roundTo10(16900 * 1.3) = roundTo10(21970) = 21970
      expect(result).toBe(21970);
    });
  });

  describe('rounding behavior in surcharges', () => {
    it('should round intermediate results to nearest 10', () => {
      // 7777 * 1.3 = 10110.1 → roundTo10 = 10110
      const result = applySpecialRules(7777, { night: true });
      expect(result).toBe(10110);
    });

    it('should round each stage independently when stacking', () => {
      // 7777 * 1.3 = 10110.1 → roundTo10 = 10110
      // 10110 * 1.3 = 13143 → roundTo10 = 13140
      const result = applySpecialRules(7777, { night: true, weekend: true });
      expect(result).toBe(13140);
    });

    it('should handle rounding at boundary (ending in 5)', () => {
      // 1050 * 1.3 = 1365 → roundTo10 = 1370
      const result = applySpecialRules(1050, { night: true });
      expect(result).toBe(1370);
    });
  });

  describe('edge cases', () => {
    it('should return original price with no surcharges applied', () => {
      const result = applySpecialRules(basePrice, {});
      expect(result).toBe(basePrice);
    });

    it('should handle zero price', () => {
      const result = applySpecialRules(0, { night: true, weekend: true, age: 1 });
      expect(result).toBe(0);
    });

    it('should handle very large price', () => {
      const result = applySpecialRules(10000000, { night: true });
      expect(result).toBe(13000000);
    });

    it('should handle price of 1 won', () => {
      // 1 * 1.3 = 1.3 → roundTo10 = 0
      const result = applySpecialRules(1, { night: true });
      expect(result).toBe(0);
    });

    it('should handle price of 10 won', () => {
      // 10 * 1.3 = 13 → roundTo10 = 10
      const result = applySpecialRules(10, { night: true });
      expect(result).toBe(10);
    });

    it('should handle exact boundary age of 5 (eligible)', () => {
      const result = applySpecialRules(basePrice, { age: 5 });
      expect(result).toBe(13000);
    });

    it('should not modify the original price value', () => {
      const price = 10000;
      applySpecialRules(price, { night: true });
      // Ensure the function does not mutate the input (primitive, but good practice)
      expect(price).toBe(10000);
    });

    it('should handle all flags set to false/undefined', () => {
      const result = applySpecialRules(basePrice, {
        night: false,
        weekend: false,
        age: undefined,
        consignment: false,
      });
      expect(result).toBe(basePrice);
    });
  });
});

// ====================================================================
// getCategoryName tests
// ====================================================================
describe('getCategoryName', () => {
  describe('known category codes', () => {
    it('should return correct name for common categories', () => {
      expect(getCategoryName('01')).toBe('초진료');
      expect(getCategoryName('02')).toBe('재진료');
      expect(getCategoryName('05')).toBe('내복약');
      expect(getCategoryName('08')).toBe('근육주');
      expect(getCategoryName('09')).toBe('정맥주');
      expect(getCategoryName('15')).toBe('이학요법');
      expect(getCategoryName('17')).toBe('처치료');
      expect(getCategoryName('18')).toBe('수술료');
      expect(getCategoryName('23')).toBe('방사선진단');
      expect(getCategoryName('34')).toBe('초음파');
      expect(getCategoryName('36')).toBe('기타');
    });

    it('should return correct name for all defined categories', () => {
      const expectedMapping: [FeeCategory, string][] = [
        ['01', '초진료'],
        ['02', '재진료'],
        ['03', '응급관리'],
        ['05', '내복약'],
        ['06', '외용약'],
        ['07', '처방전'],
        ['08', '근육주'],
        ['09', '정맥주'],
        ['10', '수액제'],
        ['11', '기타주'],
        ['12', 'IVSide'],
        ['13', '특정재료'],
        ['14', '마취료'],
        ['15', '이학요법'],
        ['16', '정신치료'],
        ['17', '처치료'],
        ['18', '수술료'],
        ['19', '수혈료'],
        ['20', '캐스트'],
        ['21', '기능검사'],
        ['22', '기타검사'],
        ['23', '방사선진단'],
        ['28', '기타입원'],
        ['29', '식대'],
        ['31', '보조기'],
        ['32', '확인수수'],
        ['33', '호송료'],
        ['34', '초음파'],
        ['35', '병실차액'],
        ['36', '기타'],
      ];

      for (const [code, name] of expectedMapping) {
        expect(getCategoryName(code)).toBe(name);
      }
    });
  });

  describe('unknown category codes', () => {
    it('should return "기타" for unknown category code', () => {
      // Cast to bypass type checking — simulating runtime invalid data
      expect(getCategoryName('99' as FeeCategory)).toBe('기타');
    });

    it('should return "기타" for empty string', () => {
      expect(getCategoryName('' as FeeCategory)).toBe('기타');
    });

    it('should return "기타" for gap codes (e.g., 04, 24, 25, 26, 27, 30)', () => {
      const gapCodes = ['04', '24', '25', '26', '27', '30'];
      for (const code of gapCodes) {
        expect(getCategoryName(code as FeeCategory)).toBe('기타');
      }
    });
  });
});

// ====================================================================
// FEE_CATEGORY_NAMES validation
// ====================================================================
describe('FEE_CATEGORY_NAMES', () => {
  it('should have exactly 30 defined categories', () => {
    expect(Object.keys(FEE_CATEGORY_NAMES)).toHaveLength(30);
  });

  it('should have non-empty string values for all categories', () => {
    for (const [code, name] of Object.entries(FEE_CATEGORY_NAMES)) {
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('should not have duplicate category names', () => {
    const names = Object.values(FEE_CATEGORY_NAMES);
    // Note: '기타' and '기타주', '기타검사', '기타입원' are different enough
    // Check for exact duplicates
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

// ====================================================================
// Integration: resolve3TierPrice -> feeItemToBillingItem -> applySpecialRules
// ====================================================================
describe('fee-engine integration', () => {
  it('should produce correct billing for a typical NHIS consultation visit', () => {
    const consultation = makeFeeItemFull({
      prescriptionCode: 'AA157',
      name: '초진진찰료',
      unitPrice: 16800,
      cFlag: 1,
    });

    const billing = feeItemToBillingItem(consultation, 1, 'nhis');

    expect(billing.unitPrice).toBe(16800);
    expect(billing.totalPrice).toBe(16800);
    expect(billing.insuranceCovered).toBe(true);
    expect(billing.copayAmount).toBe(5040);
    expect(billing.insuranceAmount).toBe(11760);
    expect(billing.copayAmount + billing.insuranceAmount).toBe(billing.totalPrice);
  });

  it('should apply night surcharge to resolved price correctly', () => {
    const item = makeFeeItemFull({ unitPrice: 16800 });
    const resolvedPrice = resolve3TierPrice(item);
    const nightPrice = applySpecialRules(resolvedPrice, { night: true });

    // 16800 * 1.3 = 21840 → roundTo10 = 21840
    expect(nightPrice).toBe(21840);
  });

  it('should handle a complex scenario: drug + procedure + material', () => {
    // Drug with ceiling price
    const drug = makeFeeItemFull({
      prescriptionCode: 'D001',
      name: '아목시실린',
      ceilingPrice: 500,
      unitPrice: 0,
      clinicalFee: 0,
      cFlag: 1,
    });

    // Procedure with clinical fee
    const procedure = makeFeeItemFull({
      prescriptionCode: 'N0871',
      name: '관혈적 정복술',
      ceilingPrice: undefined,
      unitPrice: undefined,
      clinicalFee: 500000,
      cFlag: 1,
    });

    // Material (non-covered, cFlag=8)
    const material = makeFeeItemFull({
      prescriptionCode: 'K0001234',
      name: '특수재료',
      unitPrice: 30000,
      cFlag: 8,
    });

    const drugBilling = feeItemToBillingItem(drug, 30, 'nhis');    // 30 tablets
    const procBilling = feeItemToBillingItem(procedure, 1, 'nhis');
    const matBilling = feeItemToBillingItem(material, 1, 'nhis');

    // Drug: 500 * 30 = 15000, copay = roundTo10(15000 * 0.3) = roundTo10(4500) = 4500
    expect(drugBilling.totalPrice).toBe(15000);
    expect(drugBilling.copayAmount).toBe(4500);
    expect(drugBilling.insuranceCovered).toBe(true);

    // Procedure: 500000 * 1 = 500000, copay = roundTo10(500000 * 0.3) = 150000
    expect(procBilling.totalPrice).toBe(500000);
    expect(procBilling.copayAmount).toBe(150000);
    expect(procBilling.insuranceCovered).toBe(true);

    // Material: 30000 * 1 = 30000, copay = 30000 (non-covered)
    expect(matBilling.totalPrice).toBe(30000);
    expect(matBilling.copayAmount).toBe(30000);
    expect(matBilling.insuranceCovered).toBe(false);
  });

  it('should handle pediatric weekend night emergency scenario', () => {
    const consultPrice = 16800;
    const adjusted = applySpecialRules(consultPrice, {
      night: true,
      weekend: true,
      age: 2,
    });

    // Night: roundTo10(16800 * 1.3) = roundTo10(21840) = 21840
    // Weekend: roundTo10(21840 * 1.3) = roundTo10(28392) = 28390
    // Pediatric: roundTo10(28390 * 1.3) = roundTo10(36907) = 36910
    expect(adjusted).toBe(36910);
  });

  it('should handle auto-insurance scenario with special rules', () => {
    const item = makeFeeItemFull({
      unitPrice: 10000,
      cFlag: 1,
    });

    const billing = feeItemToBillingItem(item, 1, 'auto');

    // Auto insurance: 0% copay
    expect(billing.copayAmount).toBe(0);
    expect(billing.insuranceAmount).toBe(10000);
  });
});
