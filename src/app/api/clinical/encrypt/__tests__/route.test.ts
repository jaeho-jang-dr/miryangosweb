/**
 * @jest-environment node
 *
 * Tests for POST /api/clinical/encrypt (encrypt) and PUT /api/clinical/encrypt (decrypt)
 */

import { POST, PUT } from '../route';

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

// Mock crypto library
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
const mockMaskRRN = jest.fn();
const mockMaskPhone = jest.fn();
jest.mock('@/lib/crypto', () => ({
  encrypt: (...args: any[]) => mockEncrypt(...args),
  decrypt: (...args: any[]) => mockDecrypt(...args),
  maskRRN: (...args: any[]) => mockMaskRRN(...args),
  maskPhone: (...args: any[]) => mockMaskPhone(...args),
}));

import { NextResponse } from 'next/server';

function createMockRequest(
  method: string,
  body: any,
  authToken?: string
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return new Request('http://localhost:3000/api/clinical/encrypt', {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

describe('Encrypt API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/clinical/encrypt (Encrypt)', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = createMockRequest('POST', { plaintext: '123456', fieldName: 'rrn' });

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      const req = new Request('http://localhost:3000/api/clinical/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic sometoken',
        },
        body: JSON.stringify({ plaintext: '123456', fieldName: 'rrn' }),
      });

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    });

    it('should return 400 when plaintext is missing', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'test@test.com' });

      const req = createMockRequest('POST', { fieldName: 'rrn' }, 'valid-token');

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'plaintext is required' },
        { status: 400 }
      );
    });

    it('should return 400 when plaintext is not a string', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

      const req = createMockRequest('POST', { plaintext: 12345, fieldName: 'rrn' }, 'valid-token');

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'plaintext is required' },
        { status: 400 }
      );
    });

    it('should return 400 when fieldName is missing', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

      const req = createMockRequest('POST', { plaintext: '123456' }, 'valid-token');

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'fieldName must be "rrn" or "phone"' },
        { status: 400 }
      );
    });

    it('should return 400 when fieldName is not rrn or phone', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

      const req = createMockRequest(
        'POST',
        { plaintext: '123456', fieldName: 'email' },
        'valid-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'fieldName must be "rrn" or "phone"' },
        { status: 400 }
      );
    });

    it('should encrypt RRN and return result with mask', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
      const mockEncryptedData = { ciphertext: 'abc', iv: 'def', tag: 'ghi' };
      mockEncrypt.mockReturnValue(mockEncryptedData);
      mockMaskRRN.mockReturnValue('900101-1******');

      const req = createMockRequest(
        'POST',
        { plaintext: '900101-1234567', fieldName: 'rrn' },
        'valid-token'
      );

      await POST(req as any);

      expect(mockEncrypt).toHaveBeenCalledWith('900101-1234567');
      expect(mockMaskRRN).toHaveBeenCalledWith('900101-1234567');
      expect(NextResponse.json).toHaveBeenCalledWith({
        encrypted: mockEncryptedData,
        masked: '900101-1******',
        encryptedBy: 'user-123',
      });
    });

    it('should encrypt phone and return result with mask', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-456' });
      const mockEncryptedData = { ciphertext: 'xyz', iv: '123', tag: '456' };
      mockEncrypt.mockReturnValue(mockEncryptedData);
      mockMaskPhone.mockReturnValue('010-****-5678');

      const req = createMockRequest(
        'POST',
        { plaintext: '010-1234-5678', fieldName: 'phone' },
        'valid-token'
      );

      await POST(req as any);

      expect(mockEncrypt).toHaveBeenCalledWith('010-1234-5678');
      expect(mockMaskPhone).toHaveBeenCalledWith('010-1234-5678');
      expect(NextResponse.json).toHaveBeenCalledWith({
        encrypted: mockEncryptedData,
        masked: '010-****-5678',
        encryptedBy: 'user-456',
      });
    });

    it('should return 401 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

      const req = createMockRequest(
        'POST',
        { plaintext: '123', fieldName: 'rrn' },
        'expired-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    });

    it('should return 500 when ENCRYPTION_MASTER_KEY is not configured', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
      mockEncrypt.mockImplementation(() => {
        throw new Error('ENCRYPTION_MASTER_KEY is not set');
      });

      const req = createMockRequest(
        'POST',
        { plaintext: '123', fieldName: 'rrn' },
        'valid-token'
      );

      await POST(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Server encryption not configured' },
        { status: 500 }
      );
    });
  });

  describe('PUT /api/clinical/encrypt (Decrypt)', () => {
    it('should return 401 when no authorization header is present', async () => {
      const req = new Request('http://localhost:3000/api/clinical/encrypt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted: { ciphertext: 'a', iv: 'b', tag: 'c' } }),
      });

      await PUT(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    });

    it('should return 403 when user is not admin', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-789' });
      mockDocGet.mockResolvedValue({
        data: () => ({ role: 'operator' }),
      });

      const req = createMockRequest(
        'PUT',
        { encrypted: { ciphertext: 'a', iv: 'b', tag: 'c' } },
        'valid-token'
      );

      await PUT(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Admin access required for decryption' },
        { status: 403 }
      );
    });

    it('should return 400 when encrypted data is missing fields', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({
        data: () => ({ role: 'admin' }),
      });

      const req = createMockRequest(
        'PUT',
        { encrypted: { ciphertext: 'a' } },
        'valid-token'
      );

      await PUT(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid encrypted field format' },
        { status: 400 }
      );
    });

    it('should return 400 when encrypted data is completely missing', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({
        data: () => ({ role: 'admin' }),
      });

      const req = createMockRequest('PUT', {}, 'valid-token');

      await PUT(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid encrypted field format' },
        { status: 400 }
      );
    });

    it('should decrypt successfully for admin users', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'admin-001' });
      mockDocGet.mockResolvedValue({
        data: () => ({ role: 'admin' }),
      });
      mockDecrypt.mockReturnValue('900101-1234567');

      const encryptedData = { ciphertext: 'enc1', iv: 'iv1', tag: 'tag1' };
      const req = createMockRequest('PUT', { encrypted: encryptedData }, 'valid-token');

      await PUT(req as any);

      expect(mockDecrypt).toHaveBeenCalledWith(encryptedData);
      expect(NextResponse.json).toHaveBeenCalledWith({
        plaintext: '900101-1234567',
        decryptedBy: 'admin-001',
      });
    });

    it('should return 401 when token verification fails for decrypt', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Decoding Firebase ID token failed'));

      const req = createMockRequest(
        'PUT',
        { encrypted: { ciphertext: 'a', iv: 'b', tag: 'c' } },
        'bad-token'
      );

      await PUT(req as any);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    });
  });
});
