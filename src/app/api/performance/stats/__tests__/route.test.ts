/**
 * @jest-environment node
 *
 * Tests for GET /api/performance/stats
 */

import { GET } from '../route';

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

// Mock performance-utils
const mockGetCacheStats = jest.fn();
const mockGetMemoryUsage = jest.fn();
jest.mock('@/lib/performance-utils', () => ({
  getCacheStats: (...args: any[]) => mockGetCacheStats(...args),
  getMemoryUsage: (...args: any[]) => mockGetMemoryUsage(...args),
}));

import { NextRequest, NextResponse } from 'next/server';

function createRequest(authToken?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return new NextRequest('http://localhost:3000/api/performance/stats', {
    method: 'GET',
    headers,
  });
}

describe('Performance Stats API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMemoryUsage.mockReturnValue({
      heapUsedMB: '50.00',
      heapTotalMB: '100.00',
      external: 10485760, // 10MB
      rss: 157286400,     // 150MB
    });
    mockGetCacheStats.mockReturnValue({
      entries: 42,
      hitRate: 0.85,
    });
  });

  describe('GET /api/performance/stats', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createRequest();

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    });

    it('should return 401 when authorization header is not Bearer type', async () => {
      const req = new NextRequest('http://localhost:3000/api/performance/stats', {
        method: 'GET',
        headers: { 'Authorization': 'Basic sometoken' },
      });

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    });

    it('should return 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const req = createRequest('bad-token');

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid authorization token' },
        { status: 401 }
      );
    });

    it('should return stats for authenticated user', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

      const req = createRequest('valid-token');

      await GET(req);

      expect(mockGetMemoryUsage).toHaveBeenCalled();
      expect(mockGetCacheStats).toHaveBeenCalled();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.memory).toBeDefined();
      expect(callArgs.memory.heapUsed).toBe('50.00MB');
      expect(callArgs.memory.heapTotal).toBe('100.00MB');
      expect(callArgs.cache).toEqual({ entries: 42, hitRate: 0.85 });
      expect(callArgs.uptime).toBeDefined();
    });

    it('should return 500 when an unexpected error occurs', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
      mockGetMemoryUsage.mockImplementation(() => {
        throw new Error('Process memory unavailable');
      });

      const req = createRequest('valid-token');

      await GET(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Process memory unavailable' },
        { status: 500 }
      );
    });
  });
});
