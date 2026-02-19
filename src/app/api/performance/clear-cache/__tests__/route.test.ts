/**
 * @jest-environment node
 *
 * Tests for POST /api/performance/clear-cache
 */

import { POST } from '../route';

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

// Mock performance-utils
const mockClearAllCaches = jest.fn();
const mockGetCacheStats = jest.fn();
jest.mock('@/lib/performance-utils', () => ({
  clearAllCaches: (...args: any[]) => mockClearAllCaches(...args),
  getCacheStats: (...args: any[]) => mockGetCacheStats(...args),
}));

import { NextRequest, NextResponse } from 'next/server';

function createRequest(authToken?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return new NextRequest('http://localhost:3000/api/performance/clear-cache', {
    method: 'POST',
    headers,
  });
}

describe('Clear Cache API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/performance/clear-cache', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest();

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    });

    it('should return 401 when authorization is not Bearer type', async () => {
      const req = new NextRequest('http://localhost:3000/api/performance/clear-cache', {
        method: 'POST',
        headers: { 'Authorization': 'Basic sometoken' },
      });

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    });

    it('should return 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      const req = createRequest('expired-token');

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid authorization token' },
        { status: 401 }
      );
    });

    it('should return 403 when user is not admin', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-operator' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'operator' }) });

      const req = createRequest('valid-token');

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    });

    it('should return 403 when user is manager (not admin)', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-manager' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'manager' }) });

      const req = createRequest('valid-token');

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    });

    it('should return 403 when user has no role', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-norole' });
      mockDocGet.mockResolvedValue({ data: () => ({}) });

      const req = createRequest('valid-token');

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    });

    it('should clear caches and return before/after stats for admin', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });

      const beforeStats = { entries: 100, hitRate: 0.8 };
      const afterStats = { entries: 0, hitRate: 0 };
      mockGetCacheStats
        .mockReturnValueOnce(beforeStats)
        .mockReturnValueOnce(afterStats);

      const req = createRequest('valid-token');

      await POST(req);

      expect(mockClearAllCaches).toHaveBeenCalled();
      expect(mockGetCacheStats).toHaveBeenCalledTimes(2);

      expect(NextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '모든 캐시가 초기화되었습니다',
        before: beforeStats,
        after: afterStats,
      });
    });

    it('should return 500 when an unexpected error occurs', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({ data: () => ({ role: 'admin' }) });
      mockGetCacheStats.mockImplementation(() => {
        throw new Error('Cache subsystem failure');
      });

      const req = createRequest('valid-token');

      await POST(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Cache subsystem failure' },
        { status: 500 }
      );
    });
  });
});
