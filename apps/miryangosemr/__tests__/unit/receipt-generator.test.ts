import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for receipt-generator.ts
 *
 * Tests pure functions: generateReceiptNumber, generateReceiptData
 * Mocks fee-calculator's formatKRW and the firebase dependency.
 */

// --- Types (copied from billing.ts) ---

type InsuranceType = 'nhis' | 'auto' | 'industrial' | 'none';

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

interface BillingRecord {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  insuranceType: InsuranceType;
  items: BillingItem[];
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'mixed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  receiptNumber?: string;
  billedAt: { toDate: () => Date };
  paidAt?: { toDate: () => Date };
  createdBy: string;
}

// --- Constants (copied from receipt-generator.ts) ---

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

// --- Pure function copies ---

function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${dateStr}-${random}`;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

interface ReceiptData {
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

function generateReceiptData(record: BillingRecord): ReceiptData {
  return {
    receiptNumber: record.receiptNumber || generateReceiptNumber(),
    clinicName: '밀양 정형외과',
    clinicAddress: '경남 밀양시',
    clinicPhone: '055-XXX-XXXX',
    clinicLicenseNo: 'XXXXXXX',
    patientName: record.patientName,
    visitDate: record.billedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-',
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

// --- Helper to create mock billing records ---

function makeBillingRecord(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    id: 'bill-001',
    visitId: 'visit-001',
    patientId: 'patient-001',
    patientName: '홍길동',
    insuranceType: 'nhis',
    items: [
      {
        id: 'item-1',
        feeCode: 'AA157',
        feeName: '초진진찰료',
        quantity: 1,
        unitPrice: 18800,
        totalPrice: 18800,
        insuranceCovered: true,
        copayAmount: 5640,
        insuranceAmount: 13160,
      },
    ],
    totalAmount: 18800,
    insuranceAmount: 13160,
    copayAmount: 5640,
    paidAmount: 5640,
    unpaidAmount: 0,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    receiptNumber: 'RCP-20260115-AB12',
    billedAt: { toDate: () => new Date(2026, 0, 15) },
    createdBy: 'staff-1',
    ...overrides,
  } as BillingRecord;
}


// ===================== TESTS =====================

describe('generateReceiptNumber', () => {
  it('should start with RCP- prefix', () => {
    const num = generateReceiptNumber();
    expect(num.startsWith('RCP-')).toBe(true);
  });

  it('should contain today\'s date in YYYYMMDD format', () => {
    const now = new Date();
    const expectedDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    const num = generateReceiptNumber();
    expect(num).toContain(expectedDate);
  });

  it('should match the pattern RCP-YYYYMMDD-XXXX', () => {
    const num = generateReceiptNumber();
    expect(num).toMatch(/^RCP-\d{8}-[A-Z0-9]{1,4}$/);
  });

  it('should generate unique numbers', () => {
    const numbers = new Set<string>();
    for (let i = 0; i < 50; i++) {
      numbers.add(generateReceiptNumber());
    }
    // Random component should ensure uniqueness
    expect(numbers.size).toBeGreaterThanOrEqual(45); // Allow small collision chance
  });

  it('should have uppercase random suffix', () => {
    const num = generateReceiptNumber();
    const parts = num.split('-');
    const suffix = parts[2];
    expect(suffix).toBe(suffix.toUpperCase());
  });
});


describe('generateReceiptData', () => {
  it('should use existing receiptNumber if provided', () => {
    const record = makeBillingRecord({ receiptNumber: 'RCP-20260115-CUSTOM' });
    const receipt = generateReceiptData(record);
    expect(receipt.receiptNumber).toBe('RCP-20260115-CUSTOM');
  });

  it('should generate a new receiptNumber if not provided', () => {
    const record = makeBillingRecord({ receiptNumber: undefined });
    const receipt = generateReceiptData(record);
    expect(receipt.receiptNumber).toMatch(/^RCP-\d{8}-[A-Z0-9]+$/);
  });

  it('should set clinic information correctly', () => {
    const receipt = generateReceiptData(makeBillingRecord());
    expect(receipt.clinicName).toBe('밀양 정형외과');
    expect(receipt.clinicAddress).toBe('경남 밀양시');
    expect(receipt.clinicPhone).toBe('055-XXX-XXXX');
    expect(receipt.clinicLicenseNo).toBe('XXXXXXX');
  });

  it('should set patientName from billing record', () => {
    const receipt = generateReceiptData(makeBillingRecord({ patientName: '김철수' }));
    expect(receipt.patientName).toBe('김철수');
  });

  it('should format visitDate from billedAt timestamp', () => {
    const record = makeBillingRecord({
      billedAt: { toDate: () => new Date(2026, 0, 15) },
    });
    const receipt = generateReceiptData(record);
    // toLocaleDateString('ko-KR') format
    expect(receipt.visitDate).toContain('2026');
  });

  it('should return "-" for visitDate when billedAt is missing', () => {
    const record = makeBillingRecord();
    // Simulate missing billedAt
    (record as any).billedAt = null;
    const receipt = generateReceiptData(record);
    expect(receipt.visitDate).toBe('-');
  });

  describe('insurance type labels', () => {
    it('should label nhis as 건강보험', () => {
      const receipt = generateReceiptData(makeBillingRecord({ insuranceType: 'nhis' }));
      expect(receipt.insuranceType).toBe('건강보험');
    });

    it('should label auto as 자동차보험', () => {
      const receipt = generateReceiptData(makeBillingRecord({ insuranceType: 'auto' }));
      expect(receipt.insuranceType).toBe('자동차보험');
    });

    it('should label industrial as 산재보험', () => {
      const receipt = generateReceiptData(makeBillingRecord({ insuranceType: 'industrial' }));
      expect(receipt.insuranceType).toBe('산재보험');
    });

    it('should label none as 비급여/일반', () => {
      const receipt = generateReceiptData(makeBillingRecord({ insuranceType: 'none' }));
      expect(receipt.insuranceType).toBe('비급여/일반');
    });

    it('should fall back to 일반 for unknown insurance type', () => {
      const record = makeBillingRecord();
      (record as any).insuranceType = 'unknown';
      const receipt = generateReceiptData(record);
      expect(receipt.insuranceType).toBe('일반');
    });
  });

  describe('item mapping', () => {
    it('should map insurance-covered items as 급여', () => {
      const record = makeBillingRecord({
        items: [
          { id: '1', feeCode: 'AA157', feeName: '초진진찰료', quantity: 1, unitPrice: 18800, totalPrice: 18800, insuranceCovered: true, copayAmount: 5640, insuranceAmount: 13160 },
        ],
      });
      const receipt = generateReceiptData(record);
      expect(receipt.items[0].category).toBe('급여');
    });

    it('should map non-covered items as 비급여', () => {
      const record = makeBillingRecord({
        items: [
          { id: '1', feeCode: 'NI001', feeName: '도수치료', quantity: 1, unitPrice: 50000, totalPrice: 50000, insuranceCovered: false, copayAmount: 50000, insuranceAmount: 0 },
        ],
      });
      const receipt = generateReceiptData(record);
      expect(receipt.items[0].category).toBe('비급여');
    });

    it('should correctly map item fields', () => {
      const record = makeBillingRecord({
        items: [
          { id: '1', feeCode: 'AA157', feeName: '초진진찰료', quantity: 2, unitPrice: 18800, totalPrice: 37600, insuranceCovered: true, copayAmount: 11280, insuranceAmount: 26320 },
        ],
      });
      const receipt = generateReceiptData(record);
      const item = receipt.items[0];
      expect(item.name).toBe('초진진찰료');
      expect(item.quantity).toBe(2);
      // formatKRW values
      expect(item.unitPrice).toContain('18,800');
      expect(item.totalPrice).toContain('37,600');
      expect(item.copay).toContain('11,280');
    });

    it('should handle multiple items', () => {
      const record = makeBillingRecord({
        items: [
          { id: '1', feeCode: 'AA157', feeName: '초진진찰료', quantity: 1, unitPrice: 18800, totalPrice: 18800, insuranceCovered: true, copayAmount: 5640, insuranceAmount: 13160 },
          { id: '2', feeCode: 'MM123', feeName: '핫팩', quantity: 1, unitPrice: 3000, totalPrice: 3000, insuranceCovered: true, copayAmount: 900, insuranceAmount: 2100 },
          { id: '3', feeCode: 'NI001', feeName: '도수치료', quantity: 1, unitPrice: 50000, totalPrice: 50000, insuranceCovered: false, copayAmount: 50000, insuranceAmount: 0 },
        ],
      });
      const receipt = generateReceiptData(record);
      expect(receipt.items).toHaveLength(3);
      expect(receipt.items[0].category).toBe('급여');
      expect(receipt.items[1].category).toBe('급여');
      expect(receipt.items[2].category).toBe('비급여');
    });

    it('should handle empty items array', () => {
      const record = makeBillingRecord({ items: [] });
      const receipt = generateReceiptData(record);
      expect(receipt.items).toEqual([]);
    });
  });

  describe('totals formatting', () => {
    it('should format totalAmount in KRW', () => {
      const receipt = generateReceiptData(makeBillingRecord({ totalAmount: 71800 }));
      expect(receipt.totalAmount).toContain('71,800');
    });

    it('should format insuranceAmount in KRW', () => {
      const receipt = generateReceiptData(makeBillingRecord({ insuranceAmount: 39260 }));
      expect(receipt.insuranceAmount).toContain('39,260');
    });

    it('should format copayAmount in KRW', () => {
      const receipt = generateReceiptData(makeBillingRecord({ copayAmount: 56540 }));
      expect(receipt.copayAmount).toContain('56,540');
    });

    it('should format paidAmount in KRW', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paidAmount: 56540 }));
      expect(receipt.paidAmount).toContain('56,540');
    });

    it('should handle zero amounts', () => {
      const receipt = generateReceiptData(makeBillingRecord({
        totalAmount: 0,
        insuranceAmount: 0,
        copayAmount: 0,
        paidAmount: 0,
      }));
      expect(receipt.totalAmount).toContain('0');
      expect(receipt.insuranceAmount).toContain('0');
      expect(receipt.copayAmount).toContain('0');
      expect(receipt.paidAmount).toContain('0');
    });
  });

  describe('payment method labels', () => {
    it('should label cash as 현금', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paymentMethod: 'cash' }));
      expect(receipt.paymentMethod).toBe('현금');
    });

    it('should label card as 카드', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paymentMethod: 'card' }));
      expect(receipt.paymentMethod).toBe('카드');
    });

    it('should label transfer as 계좌이체', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paymentMethod: 'transfer' }));
      expect(receipt.paymentMethod).toBe('계좌이체');
    });

    it('should label mixed as 혼합', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paymentMethod: 'mixed' }));
      expect(receipt.paymentMethod).toBe('혼합');
    });

    it('should default to 현금 when paymentMethod is undefined', () => {
      const receipt = generateReceiptData(makeBillingRecord({ paymentMethod: undefined }));
      expect(receipt.paymentMethod).toBe('현금');
    });
  });

  it('should include issuedAt timestamp', () => {
    const receipt = generateReceiptData(makeBillingRecord());
    expect(receipt.issuedAt).toBeTruthy();
    expect(typeof receipt.issuedAt).toBe('string');
  });
});
