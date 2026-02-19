/**
 * @jest-environment node
 *
 * Tests for POST and GET /api/clinical/audit
 */

import { POST, GET } from '../route';

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((data: any, init?: any) => ({
        json: async () => data,
        status: init?.status || 200,
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
const mockDocGet = jest.fn();
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockDocGet,
      })),
    })),
  })),
}));

// Mock audit-logger
const mockWriteAuditLog = jest.fn();
const mockQueryAuditLogs = jest.fn();
jest.mock('@/lib/audit-logger', () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
  queryAuditLogs: (...args: any[]) => mockQueryAuditLogs(...args),
}));

import { NextResponse } from 'next/server';

function createRequest(
  method: string,
  body?: any,
  authToken?: string,
  url?: string
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request(url || 'http://localhost:3000/api/clinical/audit', init);
}

describe('Audit API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/clinical/audit', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest('POST', { action: 'create', collection: 'patients', documentId: '1' });

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Authentication required') }),
        { status: 401 }
      );
    });

    it('should return 400 when required fields are missing', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'test@test.com' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const req = createRequest('POST', { action: 'create' }, 'valid-token');

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'action, collection, and documentId are required' },
        { status: 400 }
      );
    });

    it('should return 400 when action is missing', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const req = createRequest(
        'POST',
        { collection: 'patients', documentId: '1' },
        'valid-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'action, collection, and documentId are required' },
        { status: 400 }
      );
    });

    it('should return 401 when token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const req = createRequest(
        'POST',
        { action: 'create', collection: 'patients', documentId: '1' },
        'bad-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    });

    it('should create an audit log entry and return 201', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-123',
        email: 'doctor@hospital.com',
        name: 'Dr. Kim',
      });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      mockWriteAuditLog.mockResolvedValue('log-abc-123');

      const body = {
        action: 'create',
        collection: 'patients',
        documentId: 'patient-001',
        description: 'Created patient record',
        metadata: { source: 'api' },
      };

      const req = createRequest('POST', body, 'valid-token');

      await POST(req as any);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          collection: 'patients',
          documentId: 'patient-001',
          userId: 'user-123',
          userEmail: 'doctor@hospital.com',
          userName: 'Dr. Kim',
          description: 'Created patient record',
          metadata: { source: 'api' },
        })
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        { id: 'log-abc-123' },
        { status: 201 }
      );
    });

    it('should include IP and user-agent from request headers', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-456',
        email: 'test@test.com',
      });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'operator' }) });
      mockWriteAuditLog.mockResolvedValue('log-xyz');

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      });

      const req = new Request('http://localhost:3000/api/clinical/audit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'read',
          collection: 'encounters',
          documentId: 'enc-001',
        }),
      });

      await POST(req as any);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 TestBrowser',
        })
      );
    });

    it('should handle writeAuditLog errors and return 500', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      mockWriteAuditLog.mockRejectedValue(new Error('Firestore write failed'));

      const req = createRequest(
        'POST',
        { action: 'update', collection: 'patients', documentId: '1' },
        'valid-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Firestore write failed' },
        { status: 500 }
      );
    });
  });

  describe('GET /api/clinical/audit', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest('GET', undefined, undefined, 'http://localhost:3000/api/clinical/audit');

      await GET(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication required' },
        { status: 401 }
      );
    });

    it('should return 403 when user is not admin or manager', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-operator' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'operator' }) });

      const req = createRequest('GET', undefined, 'valid-token', 'http://localhost:3000/api/clinical/audit');

      await GET(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Admin or manager access required' },
        { status: 403 }
      );
    });

    it('should return 403 when user has no role', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-no-role' });
      mockDocGet.mockResolvedValue({ data: () => ({}) });

      const req = createRequest('GET', undefined, 'valid-token', 'http://localhost:3000/api/clinical/audit');

      await GET(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Admin or manager access required' },
        { status: 403 }
      );
    });

    it('should query audit logs for admin users', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      const mockLogs = [
        { id: 'log-1', action: 'create', collection: 'patients' },
        { id: 'log-2', action: 'update', collection: 'patients' },
      ];
      mockQueryAuditLogs.mockResolvedValue(mockLogs);

      const req = createRequest(
        'GET',
        undefined,
        'valid-token',
        'http://localhost:3000/api/clinical/audit?collection=patients&limit=10'
      );

      await GET(req as any);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith({
        collection: 'patients',
        documentId: undefined,
        userId: undefined,
        action: undefined,
        limit: 10,
      });

      expect(NextResponse.json).toHaveBeenCalledWith({
        logs: mockLogs,
        count: 2,
      });
    });

    it('should allow manager role to query audit logs', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'manager-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'manager' }) });
      mockQueryAuditLogs.mockResolvedValue([]);

      const req = createRequest(
        'GET',
        undefined,
        'valid-token',
        'http://localhost:3000/api/clinical/audit'
      );

      await GET(req as any);

      expect(mockQueryAuditLogs).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith({
        logs: [],
        count: 0,
      });
    });

    it('should use default limit of 50 when not specified', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      mockQueryAuditLogs.mockResolvedValue([]);

      const req = createRequest(
        'GET',
        undefined,
        'valid-token',
        'http://localhost:3000/api/clinical/audit'
      );

      await GET(req as any);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should pass all query parameters to queryAuditLogs', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      mockQueryAuditLogs.mockResolvedValue([]);

      const url = 'http://localhost:3000/api/clinical/audit?' +
        'collection=encounters&documentId=enc-001&userId=user-123&action=read&limit=25';

      const req = createRequest('GET', undefined, 'valid-token', url);

      await GET(req as any);

      expect(mockQueryAuditLogs).toHaveBeenCalledWith({
        collection: 'encounters',
        documentId: 'enc-001',
        userId: 'user-123',
        action: 'read',
        limit: 25,
      });
    });

    it('should return 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase ID token expired'));

      const req = createRequest(
        'GET',
        undefined,
        'expired-token',
        'http://localhost:3000/api/clinical/audit'
      );

      await GET(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    });
  });
});
