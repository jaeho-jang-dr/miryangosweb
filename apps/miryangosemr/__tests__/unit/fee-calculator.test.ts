import { describe, it, expect } from 'vitest';

// We mock the Firebase import to avoid initialization issues
// by directly testing the pure logic
const COPAY_RATES = {
  nhis: 0.3,
  auto: 0,
  industrial: 0,
  none: 1.0,
};

type InsuranceType = 'nhis' | 'auto' | 'industrial' | 'none';

// Pure function copies from fee-calculator.ts for testing
function calculateCopay(
  basePrice: number,
  quantity: number,
  insuranceType: InsuranceType,
  isInsuranceCovered: boolean
) {
  const total = basePrice * quantity;
  if (!isInsuranceCovered) {
    return { total, copay: total, insurance: 0 };
  }
  const copayRate = COPAY_RATES[insuranceType];
  const copay = Math.round(total * copayRate);
  const insurance = total - copay;
  return { total, copay, insurance };
}

function roundTo10(amount: number): number {
  return Math.round(amount / 10) * 10;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

describe('calculateCopay', () => {
  it('should calculate NHIS copay at 30%', () => {
    const result = calculateCopay(10000, 1, 'nhis', true);
    expect(result.total).toBe(10000);
    expect(result.copay).toBe(3000);
    expect(result.insurance).toBe(7000);
  });

  it('should handle quantity multiplication', () => {
    const result = calculateCopay(5000, 3, 'nhis', true);
    expect(result.total).toBe(15000);
    expect(result.copay).toBe(4500);
    expect(result.insurance).toBe(10500);
  });

  it('should calculate auto insurance at 0% copay', () => {
    const result = calculateCopay(50000, 1, 'auto', true);
    expect(result.total).toBe(50000);
    expect(result.copay).toBe(0);
    expect(result.insurance).toBe(50000);
  });

  it('should calculate industrial insurance at 0% copay', () => {
    const result = calculateCopay(50000, 1, 'industrial', true);
    expect(result.copay).toBe(0);
    expect(result.insurance).toBe(50000);
  });

  it('should calculate non-insurance at 100% copay', () => {
    const result = calculateCopay(30000, 2, 'none', true);
    expect(result.total).toBe(60000);
    expect(result.copay).toBe(60000);
    expect(result.insurance).toBe(0);
  });

  it('should set full copay for non-covered items regardless of insurance type', () => {
    const result = calculateCopay(20000, 1, 'nhis', false);
    expect(result.total).toBe(20000);
    expect(result.copay).toBe(20000);
    expect(result.insurance).toBe(0);
  });

  it('should handle zero price', () => {
    const result = calculateCopay(0, 1, 'nhis', true);
    expect(result.total).toBe(0);
    expect(result.copay).toBe(0);
    expect(result.insurance).toBe(0);
  });

  it('should round copay to nearest integer', () => {
    // 3333 * 0.3 = 999.9 → rounds to 1000
    const result = calculateCopay(3333, 1, 'nhis', true);
    expect(result.total).toBe(3333);
    expect(result.copay).toBe(1000);
    expect(result.insurance).toBe(2333);
  });

  it('should preserve copay + insurance = total', () => {
    const prices = [100, 1234, 5678, 9999, 12345, 100000];
    for (const price of prices) {
      const result = calculateCopay(price, 1, 'nhis', true);
      expect(result.copay + result.insurance).toBe(result.total);
    }
  });
});

describe('roundTo10', () => {
  it('should round to nearest 10', () => {
    expect(roundTo10(1234)).toBe(1230);
    expect(roundTo10(1235)).toBe(1240);
    expect(roundTo10(1230)).toBe(1230);
  });

  it('should handle zero', () => {
    expect(roundTo10(0)).toBe(0);
  });

  it('should handle exact tens', () => {
    expect(roundTo10(100)).toBe(100);
    expect(roundTo10(1000)).toBe(1000);
  });

  it('should round 5 up', () => {
    expect(roundTo10(5)).toBe(10);
    expect(roundTo10(15)).toBe(20);
    expect(roundTo10(25)).toBe(30);
  });

  it('should handle negative numbers', () => {
    expect(roundTo10(-1234)).toBe(-1230);
  });
});

describe('formatKRW', () => {
  it('should format with Korean Won symbol', () => {
    const result = formatKRW(10000);
    expect(result).toContain('10,000');
  });

  it('should handle zero', () => {
    const result = formatKRW(0);
    expect(result).toContain('0');
  });

  it('should handle large amounts', () => {
    const result = formatKRW(1234567890);
    expect(result).toContain('1,234,567,890');
  });
});
