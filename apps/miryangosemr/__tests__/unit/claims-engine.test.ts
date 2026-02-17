/**
 * Unit tests for claims-engine.ts
 * HIRA claims builder, CRUD operations, and DUR validation
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ── Mock firebase/firestore ──────────────────────────────────────────
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn(),
  },
}));

vi.mock('@/lib/firebase', () => ({
  db: { _mockDb: true },
}));

// ── Mock crypto.randomUUID ──────────────────────────────────────────
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-1234'),
});

// ── Import after mocks ──────────────────────────────────────────────
import {
  buildClaimFromBilling,
  saveClaim,
  updateClaimStatus,
  getClaims,
  validateClaimForDUR,
} from '@/lib/claims-engine';
import type { BillingRecord, BillingItem } from '@/types/billing';
import type { HIRAClaim, ClaimStatus } from '@/types/claims';

// ── Helpers ─────────────────────────────────────────────────────────

function makeBillingItem(overrides: Partial<BillingItem> = {}): BillingItem {
  return {
    id: 'item-1',
    feeCode: 'AA157',
    feeName: '초진진찰료',
    quantity: 1,
    unitPrice: 16_600,
    totalPrice: 16_600,
    insuranceCovered: true,
    copayAmount: 4_980,
    insuranceAmount: 11_620,
    ...overrides,
  };
}

function makeBillingRecord(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    id: 'billing-1',
    visitId: 'visit-1',
    patientId: 'patient-1',
    patientName: '홍길동',
    insuranceType: 'nhis',
    items: [makeBillingItem()],
    totalAmount: 16_600,
    insuranceAmount: 11_620,
    copayAmount: 4_980,
    paidAmount: 4_980,
    unpaidAmount: 0,
    paymentStatus: 'paid',
    billedAt: { toDate: () => new Date('2026-01-15T09:00:00Z') } as any,
    createdBy: 'staff-1',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('claims-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // buildClaimFromBilling
  // ================================================================
  describe('buildClaimFromBilling', () => {
    it('should convert a BillingRecord into a claim object with correct fields', () => {
      const billing = makeBillingRecord();
      const result = buildClaimFromBilling(
        billing,
        ['M54.5'],
        ['요통'],
        '김의사',
        'DOC-001'
      );

      expect(result.visitId).toBe('visit-1');
      expect(result.patientId).toBe('patient-1');
      expect(result.patientName).toBe('홍길동');
      expect(result.diagnosisCodes).toEqual(['M54.5']);
      expect(result.diagnosisNames).toEqual(['요통']);
      expect(result.doctorName).toBe('김의사');
      expect(result.doctorLicenseNo).toBe('DOC-001');
      expect(result.totalAmount).toBe(16_600);
      expect(result.insuranceAmount).toBe(11_620);
      expect(result.copayAmount).toBe(4_980);
      expect(result.status).toBe('draft');
      expect(result.durChecked).toBe(false);
    });

    it('should only include insurance-covered items', () => {
      const billing = makeBillingRecord({
        items: [
          makeBillingItem({ id: 'covered', feeCode: 'AA157', insuranceCovered: true }),
          makeBillingItem({ id: 'not-covered', feeCode: 'ZZ999', insuranceCovered: false }),
        ],
      });

      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].feeCode).toBe('AA157');
    });

    it('should map claim items with correct structure', () => {
      const billing = makeBillingRecord();
      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      const item = result.items[0];

      expect(item.id).toBe('test-uuid-1234');
      expect(item.feeCode).toBe('AA157');
      expect(item.feeName).toBe('초진진찰료');
      expect(item.quantity).toBe(1);
      expect(item.days).toBe(1);
      expect(item.unitPrice).toBe(16_600);
      expect(item.totalPrice).toBe(16_600);
      expect(item.category).toBe('행위');
    });

    it('should extract visitDate from billedAt Timestamp', () => {
      const billing = makeBillingRecord({
        billedAt: { toDate: () => new Date('2026-03-20T14:30:00Z') } as any,
      });
      const result = buildClaimFromBilling(billing, [], [], '김의사');
      expect(result.visitDate).toBe('2026-03-20');
    });

    it('should fall back to today if billedAt has no toDate method', () => {
      const billing = makeBillingRecord({
        billedAt: {} as any,
      });
      const result = buildClaimFromBilling(billing, [], [], '김의사');
      // Should be today's date in YYYY-MM-DD format
      const today = new Date().toISOString().slice(0, 10);
      expect(result.visitDate).toBe(today);
    });

    it('should handle billing with no items', () => {
      const billing = makeBillingRecord({ items: [] });
      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      expect(result.items).toEqual([]);
    });

    it('should handle billing with all non-covered items', () => {
      const billing = makeBillingRecord({
        items: [
          makeBillingItem({ id: '1', insuranceCovered: false }),
          makeBillingItem({ id: '2', insuranceCovered: false }),
        ],
      });
      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      expect(result.items).toEqual([]);
    });

    it('should handle empty diagnosis codes and names', () => {
      const billing = makeBillingRecord();
      const result = buildClaimFromBilling(billing, [], [], '김의사');
      expect(result.diagnosisCodes).toEqual([]);
      expect(result.diagnosisNames).toEqual([]);
    });

    it('should handle multiple diagnosis codes', () => {
      const billing = makeBillingRecord();
      const result = buildClaimFromBilling(
        billing,
        ['M54.5', 'M51.1', 'G54.4'],
        ['요통', '요추 추간판 장애', '요천추 신경근 장애'],
        '김의사'
      );
      expect(result.diagnosisCodes).toHaveLength(3);
      expect(result.diagnosisNames).toHaveLength(3);
    });

    it('should allow doctorLicenseNo to be undefined', () => {
      const billing = makeBillingRecord();
      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      expect(result.doctorLicenseNo).toBeUndefined();
    });

    it('should handle multiple covered items', () => {
      const billing = makeBillingRecord({
        items: [
          makeBillingItem({ id: '1', feeCode: 'AA157', feeName: '초진진찰료', insuranceCovered: true }),
          makeBillingItem({ id: '2', feeCode: 'BB200', feeName: 'X-ray 촬영', insuranceCovered: true }),
          makeBillingItem({ id: '3', feeCode: 'CC300', feeName: '물리치료', insuranceCovered: true }),
        ],
      });
      const result = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');
      expect(result.items).toHaveLength(3);
    });
  });

  // ================================================================
  // saveClaim
  // ================================================================
  describe('saveClaim', () => {
    it('should save claim to Firestore and return the document ID', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'claim-abc123' });
      const billing = makeBillingRecord();
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const id = await saveClaim(claim);

      expect(id).toBe('claim-abc123');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      const savedData = mockAddDoc.mock.calls[0][1];
      expect(savedData.visitId).toBe('visit-1');
      expect(savedData.status).toBe('draft');
      expect(savedData.createdAt).toEqual({ _type: 'serverTimestamp' });
      expect(savedData.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should propagate Firestore errors', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write failed'));
      const billing = makeBillingRecord();
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      await expect(saveClaim(claim)).rejects.toThrow('Firestore write failed');
    });
  });

  // ================================================================
  // updateClaimStatus
  // ================================================================
  describe('updateClaimStatus', () => {
    it('should update status and updatedAt', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'validated');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.status).toBe('validated');
      expect(updates.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should set submittedAt when status is submitted', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'submitted');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.submittedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should set reviewedAt when status is approved', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'approved');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.reviewedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should set reviewedAt when status is rejected', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'rejected');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.reviewedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should set rejectionReason when rejected with note', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'rejected', '진단 코드 불일치');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.rejectionReason).toBe('진단 코드 불일치');
      expect(updates.reviewedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should NOT set rejectionReason when rejected without note', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'rejected');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.rejectionReason).toBeUndefined();
    });

    it('should set adjustmentNote when adjusted with note', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'adjusted', '금액 조정됨');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.adjustmentNote).toBe('금액 조정됨');
    });

    it('should NOT set adjustmentNote for non-adjusted status even with note', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'submitted', 'some note');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.adjustmentNote).toBeUndefined();
      expect(updates.rejectionReason).toBeUndefined();
    });

    it('should NOT set submittedAt for non-submitted statuses', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'draft');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.submittedAt).toBeUndefined();
    });

    it('should NOT set reviewedAt for non-approved/rejected statuses', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await updateClaimStatus('claim-1', 'submitted');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.reviewedAt).toBeUndefined();
    });

    it('should propagate Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(updateClaimStatus('claim-1', 'submitted')).rejects.toThrow('Permission denied');
    });
  });

  // ================================================================
  // getClaims
  // ================================================================
  describe('getClaims', () => {
    it('should return claims ordered by createdAt desc when no filters', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: 'c1', data: () => ({ patientName: '홍길동', status: 'draft' }) },
          { id: 'c2', data: () => ({ patientName: '김철수', status: 'submitted' }) },
        ],
      });

      const claims = await getClaims();

      expect(claims).toHaveLength(2);
      expect(claims[0].id).toBe('c1');
      expect(claims[0].patientName).toBe('홍길동');
      expect(claims[1].id).toBe('c2');
    });

    it('should filter by status when provided', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: 'c1', data: () => ({ patientName: '홍길동', status: 'submitted' }) },
        ],
      });

      const claims = await getClaims({ status: 'submitted' });

      expect(claims).toHaveLength(1);
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'submitted');
    });

    it('should return empty array when no documents match', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const claims = await getClaims({ status: 'paid' });

      expect(claims).toEqual([]);
    });

    it('should pass filters.month without special handling (no month filter in current impl)', async () => {
      // The current implementation only filters by status; month is accepted but not used
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const claims = await getClaims({ month: '2026-01' });

      expect(claims).toEqual([]);
      // Since no status filter, it should use the default query without where
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should propagate Firestore read errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Read failed'));

      await expect(getClaims()).rejects.toThrow('Read failed');
    });
  });

  // ================================================================
  // validateClaimForDUR
  // ================================================================
  describe('validateClaimForDUR', () => {
    it('should pass when all fields are valid', () => {
      const billing = makeBillingRecord();
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should warn when diagnosisCodes is empty', () => {
      const billing = makeBillingRecord();
      const claim = buildClaimFromBilling(billing, [], [], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('진단 코드가 입력되지 않았습니다.');
    });

    it('should warn when items is empty', () => {
      const billing = makeBillingRecord({ items: [] });
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('청구 항목이 없습니다.');
    });

    it('should warn when totalAmount is 0', () => {
      const billing = makeBillingRecord({ totalAmount: 0 });
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('청구 금액이 0원 이하입니다.');
    });

    it('should warn when totalAmount is negative', () => {
      const billing = makeBillingRecord({ totalAmount: -1000 });
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('청구 금액이 0원 이하입니다.');
    });

    it('should accumulate multiple warnings', () => {
      const billing = makeBillingRecord({
        items: [],
        totalAmount: 0,
      });
      const claim = buildClaimFromBilling(billing, [], [], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(false);
      expect(result.warnings).toHaveLength(3);
      expect(result.warnings).toContain('진단 코드가 입력되지 않았습니다.');
      expect(result.warnings).toContain('청구 항목이 없습니다.');
      expect(result.warnings).toContain('청구 금액이 0원 이하입니다.');
    });

    it('should pass with totalAmount > 0 even if very small', () => {
      const billing = makeBillingRecord({ totalAmount: 1 });
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(true);
    });

    it('should pass when only items has non-covered items (items filters to empty but totalAmount > 0 and diagnosis present)', () => {
      // items will be empty because all are non-covered, but totalAmount is still > 0
      const billing = makeBillingRecord({
        items: [makeBillingItem({ insuranceCovered: false })],
        totalAmount: 16_600,
      });
      const claim = buildClaimFromBilling(billing, ['M54.5'], ['요통'], '김의사');

      const result = validateClaimForDUR(claim);

      // items is empty -> warning
      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('청구 항목이 없습니다.');
    });

    it('should validate a manually constructed claim object', () => {
      const claim = {
        visitId: 'v1',
        patientId: 'p1',
        patientName: 'Test',
        visitDate: '2026-01-01',
        diagnosisCodes: ['M54.5'],
        diagnosisNames: ['요통'],
        doctorName: 'Dr. Test',
        items: [
          {
            id: 'i1',
            feeCode: 'AA157',
            feeName: 'test',
            quantity: 1,
            days: 1,
            unitPrice: 10000,
            totalPrice: 10000,
            category: '행위',
          },
        ],
        totalAmount: 10000,
        insuranceAmount: 7000,
        copayAmount: 3000,
        status: 'draft' as const,
        durChecked: false,
      };

      const result = validateClaimForDUR(claim);

      expect(result.passed).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });
});
