import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Type definitions (mirrored from src/types/billing.ts) ----
type InsuranceType = 'nhis' | 'auto' | 'industrial' | 'none';

const COPAY_RATES: Record<InsuranceType, number> = {
  nhis: 0.3,
  auto: 0,
  industrial: 0,
  none: 1.0,
};

interface FeeScheduleItem {
  id: string;
  code: string;
  name: string;
  category: string;
  insuranceCovered: boolean;
  basePrice: number;
  unit: string;
  description?: string;
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

// ---- Pure function copies from billing-engine.ts ----

/** createBillingItem — creates a BillingItem from a FeeScheduleItem */
function createBillingItem(
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

/** calculateTotals — sums up billing items */
function calculateTotals(items: BillingItem[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const insuranceAmount = items.reduce((sum, item) => sum + item.insuranceAmount, 0);
  const copayAmount = items.reduce((sum, item) => sum + item.copayAmount, 0);

  return { totalAmount, insuranceAmount, copayAmount };
}

// ---- Helper factory functions ----

function makeFee(overrides: Partial<FeeScheduleItem> = {}): FeeScheduleItem {
  return {
    id: 'fee-001',
    code: 'AA157',
    name: '초진진찰료',
    category: 'consultation',
    insuranceCovered: true,
    basePrice: 16800,
    unit: '회',
    ...overrides,
  };
}

function makeBillingItem(overrides: Partial<BillingItem> = {}): BillingItem {
  return {
    id: 'item-001',
    feeCode: 'AA157',
    feeName: '초진진찰료',
    quantity: 1,
    unitPrice: 16800,
    totalPrice: 16800,
    insuranceCovered: true,
    copayAmount: 5040,
    insuranceAmount: 11760,
    ...overrides,
  };
}

// ====================================================================
// createBillingItem tests
// ====================================================================
describe('createBillingItem', () => {
  describe('basic NHIS (건강보험) calculations', () => {
    it('should calculate 30% copay for NHIS-covered consultation', () => {
      const fee = makeFee({ basePrice: 16800 });
      const item = createBillingItem(fee, 1, 'nhis');

      expect(item.feeCode).toBe('AA157');
      expect(item.feeName).toBe('초진진찰료');
      expect(item.quantity).toBe(1);
      expect(item.unitPrice).toBe(16800);
      expect(item.totalPrice).toBe(16800);
      expect(item.copayAmount).toBe(Math.round(16800 * 0.3)); // 5040
      expect(item.insuranceAmount).toBe(16800 - 5040);        // 11760
      expect(item.insuranceCovered).toBe(true);
    });

    it('should multiply by quantity correctly', () => {
      const fee = makeFee({ basePrice: 5000 });
      const item = createBillingItem(fee, 3, 'nhis');

      expect(item.totalPrice).toBe(15000);
      expect(item.copayAmount).toBe(4500);  // 15000 * 0.3
      expect(item.insuranceAmount).toBe(10500);
    });

    it('should generate a unique id for each item', () => {
      const fee = makeFee();
      const item1 = createBillingItem(fee, 1, 'nhis');
      const item2 = createBillingItem(fee, 1, 'nhis');

      expect(item1.id).toBeTruthy();
      expect(item2.id).toBeTruthy();
      expect(item1.id).not.toBe(item2.id);
    });
  });

  describe('auto insurance (자동차보험)', () => {
    it('should calculate 0% copay — insurance pays everything', () => {
      const fee = makeFee({ basePrice: 50000 });
      const item = createBillingItem(fee, 1, 'auto');

      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(50000);
    });

    it('should handle large amounts correctly', () => {
      const fee = makeFee({ basePrice: 1000000 });
      const item = createBillingItem(fee, 5, 'auto');

      expect(item.totalPrice).toBe(5000000);
      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(5000000);
    });
  });

  describe('industrial insurance (산재보험)', () => {
    it('should calculate 0% copay', () => {
      const fee = makeFee({ basePrice: 30000 });
      const item = createBillingItem(fee, 2, 'industrial');

      expect(item.totalPrice).toBe(60000);
      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(60000);
    });
  });

  describe('no insurance / self-pay (비급여/미보험)', () => {
    it('should calculate 100% copay for none insurance type', () => {
      const fee = makeFee({ basePrice: 25000 });
      const item = createBillingItem(fee, 1, 'none');

      expect(item.copayAmount).toBe(25000);
      expect(item.insuranceAmount).toBe(0);
    });

    it('should charge full price regardless of insuranceCovered flag', () => {
      const fee = makeFee({ basePrice: 25000, insuranceCovered: true });
      const item = createBillingItem(fee, 1, 'none');

      // COPAY_RATES['none'] is 1.0, so even with insuranceCovered=true, copay=100%
      expect(item.copayAmount).toBe(25000);
      expect(item.insuranceAmount).toBe(0);
    });
  });

  describe('non-covered items (비급여 항목)', () => {
    it('should charge 100% copay regardless of insurance type for non-covered items', () => {
      const fee = makeFee({ basePrice: 20000, insuranceCovered: false });

      const nhis = createBillingItem(fee, 1, 'nhis');
      expect(nhis.copayAmount).toBe(20000);
      expect(nhis.insuranceAmount).toBe(0);

      const auto = createBillingItem(fee, 1, 'auto');
      expect(auto.copayAmount).toBe(20000);
      expect(auto.insuranceAmount).toBe(0);

      const industrial = createBillingItem(fee, 1, 'industrial');
      expect(industrial.copayAmount).toBe(20000);
      expect(industrial.insuranceAmount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero basePrice', () => {
      const fee = makeFee({ basePrice: 0 });
      const item = createBillingItem(fee, 1, 'nhis');

      expect(item.totalPrice).toBe(0);
      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(0);
    });

    it('should handle zero quantity', () => {
      const fee = makeFee({ basePrice: 10000 });
      const item = createBillingItem(fee, 0, 'nhis');

      expect(item.totalPrice).toBe(0);
      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(0);
    });

    it('should handle very large quantity', () => {
      const fee = makeFee({ basePrice: 100 });
      const item = createBillingItem(fee, 999, 'nhis');

      expect(item.totalPrice).toBe(99900);
      expect(item.copayAmount).toBe(Math.round(99900 * 0.3)); // 29970
      expect(item.insuranceAmount).toBe(99900 - 29970);
    });

    it('should preserve copay + insurance = total for all insurance types', () => {
      const fee = makeFee({ basePrice: 7777 });
      const types: InsuranceType[] = ['nhis', 'auto', 'industrial', 'none'];

      for (const t of types) {
        const item = createBillingItem(fee, 3, t);
        expect(item.copayAmount + item.insuranceAmount).toBe(item.totalPrice);
      }
    });

    it('should handle rounding correctly with odd prices', () => {
      // 3333 * 0.3 = 999.9 → rounds to 1000
      const fee = makeFee({ basePrice: 3333 });
      const item = createBillingItem(fee, 1, 'nhis');

      expect(item.copayAmount).toBe(1000);
      expect(item.insuranceAmount).toBe(2333);
      expect(item.copayAmount + item.insuranceAmount).toBe(item.totalPrice);
    });

    it('should handle single-won price (very small)', () => {
      const fee = makeFee({ basePrice: 1 });
      const item = createBillingItem(fee, 1, 'nhis');

      expect(item.totalPrice).toBe(1);
      // 1 * 0.3 = 0.3 → rounds to 0
      expect(item.copayAmount).toBe(0);
      expect(item.insuranceAmount).toBe(1);
    });

    it('should copy fee code and name correctly', () => {
      const fee = makeFee({
        code: 'MM123',
        name: '물리치료-경피적전기신경자극치료',
      });
      const item = createBillingItem(fee, 2, 'nhis');

      expect(item.feeCode).toBe('MM123');
      expect(item.feeName).toBe('물리치료-경피적전기신경자극치료');
    });
  });
});

// ====================================================================
// calculateTotals tests
// ====================================================================
describe('calculateTotals', () => {
  describe('basic calculations', () => {
    it('should sum totals from a single item', () => {
      const items: BillingItem[] = [
        makeBillingItem({
          totalPrice: 16800,
          copayAmount: 5040,
          insuranceAmount: 11760,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(16800);
      expect(totals.copayAmount).toBe(5040);
      expect(totals.insuranceAmount).toBe(11760);
    });

    it('should sum totals from multiple items', () => {
      const items: BillingItem[] = [
        makeBillingItem({
          totalPrice: 16800,
          copayAmount: 5040,
          insuranceAmount: 11760,
        }),
        makeBillingItem({
          id: 'item-002',
          totalPrice: 30000,
          copayAmount: 9000,
          insuranceAmount: 21000,
        }),
        makeBillingItem({
          id: 'item-003',
          totalPrice: 5000,
          copayAmount: 5000,
          insuranceAmount: 0,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(51800);
      expect(totals.copayAmount).toBe(19040);
      expect(totals.insuranceAmount).toBe(32760);
    });

    it('should preserve totalAmount = copayAmount + insuranceAmount', () => {
      const items: BillingItem[] = [
        makeBillingItem({
          totalPrice: 10000,
          copayAmount: 3000,
          insuranceAmount: 7000,
        }),
        makeBillingItem({
          id: 'item-002',
          totalPrice: 20000,
          copayAmount: 20000,
          insuranceAmount: 0,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(30000);
      expect(totals.copayAmount + totals.insuranceAmount).toBe(totals.totalAmount);
    });
  });

  describe('edge cases', () => {
    it('should return zeros for empty array', () => {
      const totals = calculateTotals([]);

      expect(totals.totalAmount).toBe(0);
      expect(totals.copayAmount).toBe(0);
      expect(totals.insuranceAmount).toBe(0);
    });

    it('should handle items with zero amounts', () => {
      const items: BillingItem[] = [
        makeBillingItem({
          totalPrice: 0,
          copayAmount: 0,
          insuranceAmount: 0,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(0);
      expect(totals.copayAmount).toBe(0);
      expect(totals.insuranceAmount).toBe(0);
    });

    it('should handle large number of items', () => {
      const items: BillingItem[] = Array.from({ length: 100 }, (_, i) =>
        makeBillingItem({
          id: `item-${i}`,
          totalPrice: 1000,
          copayAmount: 300,
          insuranceAmount: 700,
        })
      );

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(100000);
      expect(totals.copayAmount).toBe(30000);
      expect(totals.insuranceAmount).toBe(70000);
    });

    it('should handle mix of covered and non-covered items', () => {
      const items: BillingItem[] = [
        // Covered NHIS item
        makeBillingItem({
          totalPrice: 10000,
          copayAmount: 3000,
          insuranceAmount: 7000,
          insuranceCovered: true,
        }),
        // Non-covered item (patient pays 100%)
        makeBillingItem({
          id: 'item-002',
          totalPrice: 50000,
          copayAmount: 50000,
          insuranceAmount: 0,
          insuranceCovered: false,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(60000);
      expect(totals.copayAmount).toBe(53000);
      expect(totals.insuranceAmount).toBe(7000);
    });

    it('should handle very large amounts without overflow', () => {
      const items: BillingItem[] = [
        makeBillingItem({
          totalPrice: 999999999,
          copayAmount: 299999999,
          insuranceAmount: 700000000,
        }),
        makeBillingItem({
          id: 'item-002',
          totalPrice: 999999999,
          copayAmount: 299999999,
          insuranceAmount: 700000000,
        }),
      ];

      const totals = calculateTotals(items);

      expect(totals.totalAmount).toBe(1999999998);
      expect(totals.copayAmount).toBe(599999998);
      expect(totals.insuranceAmount).toBe(1400000000);
    });
  });
});

// ====================================================================
// Integration: createBillingItem + calculateTotals
// ====================================================================
describe('billing-engine integration: createBillingItem -> calculateTotals', () => {
  it('should produce consistent totals from generated billing items', () => {
    const fees: FeeScheduleItem[] = [
      makeFee({ code: 'AA157', basePrice: 16800, insuranceCovered: true }),
      makeFee({ code: 'MM101', name: '물리치료', basePrice: 8000, insuranceCovered: true }),
      makeFee({ code: 'NN001', name: '비급여주사', basePrice: 30000, insuranceCovered: false }),
    ];

    const items = [
      createBillingItem(fees[0], 1, 'nhis'),
      createBillingItem(fees[1], 3, 'nhis'),
      createBillingItem(fees[2], 1, 'nhis'),
    ];

    const totals = calculateTotals(items);

    // AA157: 16800 * 1 = 16800, copay = 5040
    // MM101: 8000 * 3 = 24000, copay = 7200
    // NN001: 30000 * 1 = 30000, copay = 30000 (non-covered)
    expect(totals.totalAmount).toBe(16800 + 24000 + 30000);
    expect(totals.copayAmount).toBe(5040 + 7200 + 30000);
    expect(totals.insuranceAmount).toBe(11760 + 16800 + 0);

    // Invariant check
    expect(totals.copayAmount + totals.insuranceAmount).toBe(totals.totalAmount);
  });

  it('should handle all-auto-insurance scenario (0% patient responsibility)', () => {
    const fees = [
      makeFee({ basePrice: 50000 }),
      makeFee({ basePrice: 100000 }),
    ];

    const items = fees.map(f => createBillingItem(f, 1, 'auto'));
    const totals = calculateTotals(items);

    expect(totals.totalAmount).toBe(150000);
    expect(totals.copayAmount).toBe(0);
    expect(totals.insuranceAmount).toBe(150000);
  });

  it('should handle all-uninsured scenario (100% patient responsibility)', () => {
    const fees = [
      makeFee({ basePrice: 20000, insuranceCovered: false }),
      makeFee({ basePrice: 30000, insuranceCovered: false }),
    ];

    const items = fees.map(f => createBillingItem(f, 1, 'nhis'));
    const totals = calculateTotals(items);

    expect(totals.totalAmount).toBe(50000);
    expect(totals.copayAmount).toBe(50000);
    expect(totals.insuranceAmount).toBe(0);
  });
});

// ====================================================================
// COPAY_RATES constant validation
// ====================================================================
describe('COPAY_RATES', () => {
  it('should have exactly 4 insurance types', () => {
    expect(Object.keys(COPAY_RATES)).toHaveLength(4);
  });

  it('should have correct rate values', () => {
    expect(COPAY_RATES.nhis).toBe(0.3);
    expect(COPAY_RATES.auto).toBe(0);
    expect(COPAY_RATES.industrial).toBe(0);
    expect(COPAY_RATES.none).toBe(1.0);
  });

  it('should have rates in valid range [0, 1]', () => {
    for (const rate of Object.values(COPAY_RATES)) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });
});
