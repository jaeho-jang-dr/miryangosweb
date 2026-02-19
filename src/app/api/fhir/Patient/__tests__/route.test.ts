/**
 * @jest-environment node
 *
 * Tests for GET and POST /api/fhir/Patient
 */

import { GET, POST } from '../route';

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((data: any, init?: any) => ({
        json: async () => data,
        status: init?.status || 200,
        headers: init?.headers || {},
      })),
    },
    NextRequest: actual.NextRequest,
  };
});

// Mock firebase-admin
jest.mock('@/lib/firebase-admin', () => ({
  initAdmin: jest.fn(),
}));

// Mock firebase-admin/auth
const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// Mock firebase-admin/firestore
const mockQueryGet = jest.fn();
const mockQueryLimit = jest.fn();
const mockQueryWhere = jest.fn();
const mockDocGet = jest.fn();
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: jest.fn(() => ({
            get: mockDocGet,
          })),
        };
      }
      if (name === 'patients') {
        return {
          where: mockQueryWhere,
          limit: mockQueryLimit,
        };
      }
      return {
        doc: jest.fn(() => ({
          get: mockDocGet,
        })),
      };
    }),
  })),
}));

// Mock audit-logger
const mockWriteAuditLog = jest.fn();
jest.mock('@/lib/audit-logger', () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
}));

// Mock FHIR utilities
const mockGetPatientAsFhir = jest.fn();
const mockUpsertPatientFromFhir = jest.fn();
const mockPatientToFhir = jest.fn();
const mockBuildSearchsetBundle = jest.fn();
jest.mock('@/lib/fhir', () => ({
  getPatientAsFhir: (...args: any[]) => mockGetPatientAsFhir(...args),
  upsertPatientFromFhir: (...args: any[]) => mockUpsertPatientFromFhir(...args),
  patientToFhir: (...args: any[]) => mockPatientToFhir(...args),
  buildSearchsetBundle: (...args: any[]) => mockBuildSearchsetBundle(...args),
}));

import { NextRequest, NextResponse } from 'next/server';

function createRequest(
  method: string,
  body?: any,
  authToken?: string,
  url?: string
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/fhir+json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const init: any = {
    method,
    headers,
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(
    url || 'http://localhost:3000/api/fhir/Patient',
    init
  );
}

describe('FHIR Patient API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  describe('GET /api/fhir/Patient', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest('GET');

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    });

    it('should return 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase ID token expired'));

      const req = createRequest('GET', undefined, 'bad-token');

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    });

    it('should return 403 when user role is not clinical staff', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-norole' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'viewer' }) });

      const req = createRequest('GET', undefined, 'valid-token');

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Clinical staff access required' },
        { status: 403 }
      );
    });

    it('should search patients and return FHIR bundle for authorized user', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'operator-001',
        email: 'nurse@hospital.com',
      });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'operator' }) });

      const mockDocs = [
        {
          id: 'patient-1',
          data: () => ({ name: 'Kim', birthDate: '1990-01-01' }),
        },
      ];
      const mockSnapshot = { docs: mockDocs, size: 1 };

      mockQueryLimit.mockReturnValue({ get: mockQueryGet });
      mockQueryGet.mockResolvedValue(mockSnapshot);

      const fhirPatient = { resourceType: 'Patient', id: 'patient-1' };
      mockPatientToFhir.mockReturnValue(fhirPatient);

      const mockBundle = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
        entry: [{ resource: fhirPatient }],
      };
      mockBuildSearchsetBundle.mockReturnValue(mockBundle);

      const req = createRequest('GET', undefined, 'valid-token');

      await GET(req);

      expect(mockPatientToFhir).toHaveBeenCalled();
      expect(mockBuildSearchsetBundle).toHaveBeenCalledWith([fhirPatient], 1);
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
          collection: 'patients',
          documentId: 'search',
          userId: 'operator-001',
        })
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        mockBundle,
        expect.objectContaining({
          headers: { 'Content-Type': 'application/fhir+json' },
        })
      );
    });

    it('should filter by name when query param is provided', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'operator-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const mockSnapshot = { docs: [], size: 0 };
      mockQueryWhere.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockSnapshot),
        }),
      });
      mockBuildSearchsetBundle.mockReturnValue({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      });

      const req = createRequest(
        'GET',
        undefined,
        'valid-token',
        'http://localhost:3000/api/fhir/Patient?name=홍길동&_count=5'
      );

      await GET(req);

      expect(mockQueryWhere).toHaveBeenCalledWith('name', '==', '홍길동');
      expect(mockBuildSearchsetBundle).toHaveBeenCalledWith([], 0);
    });
  });

  describe('POST /api/fhir/Patient', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest('POST', { resourceType: 'Patient' });

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    });

    it('should return 400 when resourceType is not Patient', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const req = createRequest(
        'POST',
        { resourceType: 'Observation', status: 'active' },
        'valid-token'
      );

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Expected resourceType: Patient' },
        { status: 400 }
      );
    });

    it('should create patient and return 201 for authorized clinical staff', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const fhirPatient = {
        resourceType: 'Patient',
        name: [{ family: 'Kim', given: ['Minjun'] }],
      };

      mockUpsertPatientFromFhir.mockResolvedValue('new-patient-123');
      const createdFhir = { ...fhirPatient, id: 'new-patient-123' };
      mockGetPatientAsFhir.mockResolvedValue(createdFhir);

      const req = createRequest('POST', fhirPatient, 'valid-token');

      await POST(req);

      expect(mockUpsertPatientFromFhir).toHaveBeenCalledWith(fhirPatient, 'admin-001');
      expect(mockGetPatientAsFhir).toHaveBeenCalledWith('new-patient-123');

      expect(NextResponse.json).toHaveBeenCalledWith(
        createdFhir,
        expect.objectContaining({
          status: 201,
          headers: expect.objectContaining({
            'Content-Type': 'application/fhir+json',
            Location: '/api/fhir/Patient/new-patient-123',
          }),
        })
      );
    });

    it('should return 403 when user role is not clinical staff', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-viewer' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'viewer' }) });

      const req = createRequest(
        'POST',
        { resourceType: 'Patient' },
        'valid-token'
      );

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Clinical staff access required' },
        { status: 403 }
      );
    });

    it('should return 500 when upsert fails', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      mockUpsertPatientFromFhir.mockRejectedValue(new Error('Firestore write failed'));

      const req = createRequest(
        'POST',
        { resourceType: 'Patient', name: [{ family: 'Test' }] },
        'valid-token'
      );

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Firestore write failed' },
        { status: 500 }
      );
    });
  });
});
