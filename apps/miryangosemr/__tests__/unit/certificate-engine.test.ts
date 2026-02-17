/**
 * Unit tests for certificate-engine.ts
 * Serial number generation, CRUD, visit-date queries, and utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock firebase/firestore ──────────────────────────────────────────
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((...args: unknown[]) => ({ _path: args.slice(1).join('/') }));
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockIncrement = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  increment: (...args: unknown[]) => mockIncrement(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn(),
  },
}));

vi.mock('@/lib/firebase', () => ({
  db: { _mockDb: true },
}));

// ── Import after mocks ──────────────────────────────────────────────
import {
  generateSerialNo,
  saveCertificate,
  issueCertificate,
  voidCertificate,
  getCertificates,
  getCertificateById,
  getFirstVisitDate,
  getVisitDates,
  todayString,
  getCertificateLabel,
} from '@/lib/certificate-engine';
import type { CertificateType } from '@/types/certificates';

// ── Tests ───────────────────────────────────────────────────────────

describe('certificate-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // generateSerialNo
  // ================================================================
  describe('generateSerialNo', () => {
    it('should generate serial number with correct year and padded counter when counter doc exists', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 42 }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toBe(`${year}-0043`);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData.lastNo).toBe(43);
      expect(updateData.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should create counter doc with lastNo=1 when it does not exist', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });
      mockSetDoc.mockResolvedValueOnce(undefined);

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toBe(`${year}-0001`);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const setData = mockSetDoc.mock.calls[0][1];
      expect(setData.year).toBe(year);
      expect(setData.lastNo).toBe(1);
      expect(setData.createdAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should handle counter doc with lastNo=0 (first certificate ever)', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 0 }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toBe(`${year}-0001`);
    });

    it('should handle counter doc with lastNo=undefined (fallback to 0)', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({}),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toBe(`${year}-0001`);
    });

    it('should handle large serial numbers (>9999)', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 9999 }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toBe(`${year}-10000`);
    });

    it('should fall back to timestamp-based serial on Firestore error', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));

      const serial = await generateSerialNo('diagnosis');

      // Should match YYYY-NNNNNN pattern (6-digit timestamp suffix)
      expect(serial).toMatch(new RegExp(`^${year}-\\d{6}$`));
    });

    it('should fall back to timestamp-based serial when updateDoc fails', async () => {
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 5 }),
      });
      mockUpdateDoc.mockRejectedValueOnce(new Error('Update failed'));

      const serial = await generateSerialNo('diagnosis');

      expect(serial).toMatch(new RegExp(`^${year}-\\d{6}$`));
    });

    it('should work for any certificate type', async () => {
      const year = new Date().getFullYear();
      const types: CertificateType[] = ['diagnosis', 'referral', 'death', 'birth'];

      for (const type of types) {
        mockGetDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ lastNo: 1 }),
        });
        mockUpdateDoc.mockResolvedValueOnce(undefined);

        const serial = await generateSerialNo(type);
        expect(serial).toBe(`${year}-0002`);
      }
    });
  });

  // ================================================================
  // saveCertificate
  // ================================================================
  describe('saveCertificate', () => {
    it('should generate serial number, save to Firestore, and return doc ID', async () => {
      // Mock generateSerialNo dependencies
      const year = new Date().getFullYear();
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 10 }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      mockAddDoc.mockResolvedValueOnce({ id: 'cert-xyz789' });

      const cert = {
        type: 'diagnosis' as CertificateType,
        patientId: 'p-1',
        patientName: '홍길동',
        diagnosisCodes: ['M54.5'],
        diagnosisNames: ['요통'],
        doctorName: '김의사',
        doctorLicenseNo: 'DOC-001',
        issueDate: '2026-01-15',
        createdBy: 'staff-1',
        content: {
          diseaseHistory: '2주 전부터 요통 발생',
          condition: '요추 4-5 디스크 소견',
          treatmentPlan: '물리치료 및 약물치료',
          onset: '2025-12-30',
        },
      };

      const id = await saveCertificate(cert as any);

      expect(id).toBe('cert-xyz789');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      const savedData = mockAddDoc.mock.calls[0][1];
      expect(savedData.serialNo).toBe(`${year}-0011`);
      expect(savedData.status).toBe('draft');
      expect(savedData.createdAt).toEqual({ _type: 'serverTimestamp' });
      expect(savedData.updatedAt).toEqual({ _type: 'serverTimestamp' });
      expect(savedData.patientName).toBe('홍길동');
    });

    it('should propagate Firestore errors from addDoc', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ lastNo: 1 }),
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      mockAddDoc.mockRejectedValueOnce(new Error('Write denied'));

      const cert = {
        type: 'treatment_confirm' as CertificateType,
        patientId: 'p-1',
        patientName: 'Test',
        diagnosisCodes: [],
        diagnosisNames: [],
        doctorName: 'Dr',
        doctorLicenseNo: 'L1',
        issueDate: '2026-01-01',
        createdBy: 'staff',
        content: {
          treatmentPeriodStart: '2026-01-01',
          treatmentPeriodEnd: '2026-01-15',
          visitDates: [],
          totalVisits: 0,
          treatmentSummary: 'summary',
        },
      };

      await expect(saveCertificate(cert as any)).rejects.toThrow('Write denied');
    });
  });

  // ================================================================
  // issueCertificate
  // ================================================================
  describe('issueCertificate', () => {
    it('should update status to issued with issuedAt timestamp', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await issueCertificate('cert-1');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.status).toBe('issued');
      expect(updates.issuedAt).toEqual({ _type: 'serverTimestamp' });
      expect(updates.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should propagate Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Not found'));

      await expect(issueCertificate('nonexistent')).rejects.toThrow('Not found');
    });
  });

  // ================================================================
  // voidCertificate
  // ================================================================
  describe('voidCertificate', () => {
    it('should update status to voided with reason and timestamp', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await voidCertificate('cert-1', '환자 요청으로 무효 처리');

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.status).toBe('voided');
      expect(updates.voidReason).toBe('환자 요청으로 무효 처리');
      expect(updates.voidedAt).toEqual({ _type: 'serverTimestamp' });
      expect(updates.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });

    it('should handle empty reason string', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await voidCertificate('cert-1', '');

      const updates = mockUpdateDoc.mock.calls[0][1];
      expect(updates.voidReason).toBe('');
    });

    it('should propagate Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(voidCertificate('cert-1', 'reason')).rejects.toThrow('Permission denied');
    });
  });

  // ================================================================
  // getCertificates
  // ================================================================
  describe('getCertificates', () => {
    const mockDocs = [
      { id: 'c1', data: () => ({ patientName: '홍길동', type: 'diagnosis', status: 'draft' }) },
      { id: 'c2', data: () => ({ patientName: '김철수', type: 'referral', status: 'issued' }) },
    ];

    it('should return all certificates with limit(100) when no filters', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: mockDocs });

      const certs = await getCertificates();

      expect(certs).toHaveLength(2);
      expect(certs[0].id).toBe('c1');
      expect(certs[0].patientName).toBe('홍길동');
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should filter by patientId only', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [mockDocs[0]] });

      const certs = await getCertificates({ patientId: 'p-1' });

      expect(certs).toHaveLength(1);
      expect(mockWhere).toHaveBeenCalledWith('patientId', '==', 'p-1');
    });

    it('should filter by type only', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [mockDocs[1]] });

      const certs = await getCertificates({ type: 'referral' });

      expect(certs).toHaveLength(1);
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'referral');
    });

    it('should filter by patientId AND type together', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [mockDocs[0]] });

      const certs = await getCertificates({ patientId: 'p-1', type: 'diagnosis' });

      expect(certs).toHaveLength(1);
      // where should be called twice (patientId + type)
      expect(mockWhere).toHaveBeenCalledWith('patientId', '==', 'p-1');
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'diagnosis');
    });

    it('should filter by status only', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const certs = await getCertificates({ status: 'voided' });

      expect(certs).toEqual([]);
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'voided');
    });

    it('should return empty array when no documents match', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const certs = await getCertificates({ patientId: 'nonexistent' });

      expect(certs).toEqual([]);
    });

    it('should propagate Firestore errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Network error'));

      await expect(getCertificates()).rejects.toThrow('Network error');
    });

    it('should prioritize patientId+type filter over status filter', async () => {
      // When patientId AND type are both provided, status is ignored in the query
      mockGetDocs.mockResolvedValueOnce({ docs: mockDocs });

      await getCertificates({ patientId: 'p-1', type: 'diagnosis', status: 'draft' });

      // The implementation checks patientId && type first, so status where is not called separately
      const whereCalls = mockWhere.mock.calls;
      const statusCalls = whereCalls.filter(c => c[0] === 'status');
      // patientId + type branch does not add status filter
      expect(statusCalls).toHaveLength(0);
    });
  });

  // ================================================================
  // getCertificateById
  // ================================================================
  describe('getCertificateById', () => {
    it('should return the certificate when it exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'cert-1',
        data: () => ({ patientName: '홍길동', type: 'diagnosis', status: 'issued' }),
      });

      const cert = await getCertificateById('cert-1');

      expect(cert).not.toBeNull();
      expect(cert!.id).toBe('cert-1');
      expect(cert!.patientName).toBe('홍길동');
    });

    it('should return null when certificate does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        id: 'nonexistent',
        data: () => undefined,
      });

      const cert = await getCertificateById('nonexistent');

      expect(cert).toBeNull();
    });

    it('should propagate Firestore errors', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Document read failed'));

      await expect(getCertificateById('cert-1')).rejects.toThrow('Document read failed');
    });
  });

  // ================================================================
  // getFirstVisitDate
  // ================================================================
  describe('getFirstVisitDate', () => {
    it('should return the first visit date for a patient', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              date: { toDate: () => new Date('2025-06-15T09:00:00Z') },
            }),
          },
        ],
      });

      const date = await getFirstVisitDate('patient-1');

      expect(date).toBe('2025-06-15');
      expect(mockWhere).toHaveBeenCalledWith('patientId', '==', 'patient-1');
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'asc');
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it('should return null when patient has no visits', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const date = await getFirstVisitDate('no-visits-patient');

      expect(date).toBeNull();
    });

    it('should return null when date field has no toDate method', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({ date: 'not-a-timestamp' }),
          },
        ],
      });

      const date = await getFirstVisitDate('patient-1');

      expect(date).toBeNull();
    });

    it('should propagate Firestore errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Query failed'));

      await expect(getFirstVisitDate('patient-1')).rejects.toThrow('Query failed');
    });
  });

  // ================================================================
  // getVisitDates
  // ================================================================
  describe('getVisitDates', () => {
    it('should return all visit dates for a patient', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-02-15T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-03-20T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1');

      expect(dates).toEqual(['2025-01-10', '2025-02-15', '2025-03-20']);
    });

    it('should filter by startDate', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-02-15T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-03-20T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1', '2025-02-01');

      expect(dates).toEqual(['2025-02-15', '2025-03-20']);
    });

    it('should filter by endDate', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-02-15T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-03-20T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1', undefined, '2025-02-28');

      expect(dates).toEqual(['2025-01-10', '2025-02-15']);
    });

    it('should filter by both startDate and endDate', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-02-15T00:00:00Z') } }) },
          { data: () => ({ date: { toDate: () => new Date('2025-03-20T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1', '2025-02-01', '2025-02-28');

      expect(dates).toEqual(['2025-02-15']);
    });

    it('should return empty array when no visits exist', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const dates = await getVisitDates('patient-1');

      expect(dates).toEqual([]);
    });

    it('should skip documents with no valid date', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: null }) },
          { data: () => ({ date: { toDate: () => new Date('2025-03-20T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1');

      expect(dates).toEqual(['2025-01-10', '2025-03-20']);
    });

    it('should skip documents where toDate is not a function', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
          { data: () => ({ date: 'string-date' }) },
        ],
      });

      const dates = await getVisitDates('patient-1');

      expect(dates).toEqual(['2025-01-10']);
    });

    it('should return empty array when all dates are outside range', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ date: { toDate: () => new Date('2025-01-10T00:00:00Z') } }) },
        ],
      });

      const dates = await getVisitDates('patient-1', '2025-06-01', '2025-12-31');

      expect(dates).toEqual([]);
    });

    it('should propagate Firestore errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Query error'));

      await expect(getVisitDates('patient-1')).rejects.toThrow('Query error');
    });
  });

  // ================================================================
  // todayString
  // ================================================================
  describe('todayString', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = todayString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should match JavaScript Date ISO string slice', () => {
      const result = todayString();
      const expected = new Date().toISOString().slice(0, 10);
      expect(result).toBe(expected);
    });
  });

  // ================================================================
  // getCertificateLabel
  // ================================================================
  describe('getCertificateLabel', () => {
    it('should return correct label for diagnosis', () => {
      expect(getCertificateLabel('diagnosis')).toBe('진단서');
    });

    it('should return correct label for medical_opinion', () => {
      expect(getCertificateLabel('medical_opinion')).toBe('진료소견서');
    });

    it('should return correct label for injury_diagnosis', () => {
      expect(getCertificateLabel('injury_diagnosis')).toBe('상해진단서');
    });

    it('should return correct label for treatment_confirm', () => {
      expect(getCertificateLabel('treatment_confirm')).toBe('진료확인서');
    });

    it('should return correct label for doctor_opinion', () => {
      expect(getCertificateLabel('doctor_opinion')).toBe('의사소견서');
    });

    it('should return correct label for referral', () => {
      expect(getCertificateLabel('referral')).toBe('진료의뢰서');
    });

    it('should return correct label for disability', () => {
      expect(getCertificateLabel('disability')).toBe('장애진단서');
    });

    it('should return correct label for residual_disability', () => {
      expect(getCertificateLabel('residual_disability')).toBe('후유장애진단서');
    });

    it('should return correct label for work_capacity', () => {
      expect(getCertificateLabel('work_capacity')).toBe('근로능력평가용 진단서');
    });

    it('should return correct label for medical_aid_ext', () => {
      expect(getCertificateLabel('medical_aid_ext')).toBe('의료급여 연장신청서');
    });

    it('should return correct label for birth', () => {
      expect(getCertificateLabel('birth')).toBe('출생증명서');
    });

    it('should return correct label for death', () => {
      expect(getCertificateLabel('death')).toBe('사망진단서');
    });
  });
});
