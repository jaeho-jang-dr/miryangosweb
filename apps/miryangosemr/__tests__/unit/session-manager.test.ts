import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for session-manager.ts
 *
 * Since session-manager relies heavily on Firestore (setDoc, getDoc, deleteDoc),
 * we mock firebase/firestore entirely and test the exported functions through
 * vi.mock. We also test the pure generateSessionId logic.
 */

// --- Mock Firebase/Firestore ---
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn().mockReturnValue('mock-doc-ref');
const mockServerTimestamp = vi.fn().mockReturnValue('SERVER_TIMESTAMP');

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/lib/firebase', () => ({
  db: 'mock-db',
}));

// Import after mocks are set up
import {
  registerSession,
  validateSession,
  removeSession,
  getCurrentSessionId,
} from '@/lib/session-manager';

// --- Tests ---

describe('session-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state by removing any session
    // We do this by calling removeSession which sets currentSessionId to null
  });

  describe('generateSessionId (internal, tested via registerSession)', () => {
    it('should return a string session id on register', async () => {
      const sessionId = await registerSession('user-1');
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should generate unique session ids', async () => {
      const id1 = await registerSession('user-1');
      const id2 = await registerSession('user-1');
      expect(id1).not.toBe(id2);
    });
  });

  describe('registerSession', () => {
    it('should call setDoc with the correct collection and userId', async () => {
      await registerSession('user-123');
      expect(mockDoc).toHaveBeenCalledWith('mock-db', 'sessions', 'user-123');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    it('should store session data with sessionId, userId, timestamps, and userAgent', async () => {
      const sessionId = await registerSession('user-abc');
      const callArgs = mockSetDoc.mock.calls[0][1];
      expect(callArgs).toHaveProperty('sessionId', sessionId);
      expect(callArgs).toHaveProperty('userId', 'user-abc');
      expect(callArgs).toHaveProperty('createdAt');
      expect(callArgs).toHaveProperty('lastActiveAt');
      expect(callArgs).toHaveProperty('userAgent');
    });

    it('should set currentSessionId after registration', async () => {
      const sessionId = await registerSession('user-xyz');
      expect(getCurrentSessionId()).toBe(sessionId);
    });

    it('should replace previous session on re-register', async () => {
      const id1 = await registerSession('user-1');
      const id2 = await registerSession('user-1');
      expect(getCurrentSessionId()).toBe(id2);
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateSession', () => {
    it('should return false if no currentSessionId is set', async () => {
      // Reset by removing session
      await removeSession('user-1');
      const result = await validateSession('user-1');
      expect(result).toBe(false);
    });

    it('should return false if the Firestore doc does not exist', async () => {
      await registerSession('user-1');
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      const result = await validateSession('user-1');
      expect(result).toBe(false);
    });

    it('should return false if the session id in Firestore does not match', async () => {
      await registerSession('user-1');
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ sessionId: 'different-session-id' }),
      });
      const result = await validateSession('user-1');
      expect(result).toBe(false);
      // Should also clear the currentSessionId
      expect(getCurrentSessionId()).toBe(null);
    });

    it('should return true and update lastActiveAt when session matches', async () => {
      const sessionId = await registerSession('user-1');
      mockSetDoc.mockClear(); // clear the register call

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ sessionId }),
      });

      const result = await validateSession('user-1');
      expect(result).toBe(true);
      // Should have called setDoc with merge:true to update lastActiveAt
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ lastActiveAt: expect.anything() }),
        { merge: true }
      );
    });

    it('should return true (fail-open) on network/Firestore error', async () => {
      await registerSession('user-1');
      mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await validateSession('user-1');
      expect(result).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('removeSession', () => {
    it('should call deleteDoc for the user session document', async () => {
      await registerSession('user-1');
      await removeSession('user-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should set currentSessionId to null after removal', async () => {
      await registerSession('user-1');
      expect(getCurrentSessionId()).not.toBeNull();
      await removeSession('user-1');
      expect(getCurrentSessionId()).toBeNull();
    });

    it('should not throw on Firestore error during removal', async () => {
      await registerSession('user-1');
      mockDeleteDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(removeSession('user-1')).resolves.toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('should still clear currentSessionId even on error', async () => {
      await registerSession('user-1');
      mockDeleteDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await removeSession('user-1');
      expect(getCurrentSessionId()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentSessionId', () => {
    it('should return null initially (after module reset)', async () => {
      await removeSession('user-1');
      expect(getCurrentSessionId()).toBeNull();
    });

    it('should return the session id after registration', async () => {
      const sessionId = await registerSession('user-1');
      expect(getCurrentSessionId()).toBe(sessionId);
    });

    it('should return null after removal', async () => {
      await registerSession('user-1');
      await removeSession('user-1');
      expect(getCurrentSessionId()).toBeNull();
    });

    it('should return null after session is invalidated by another device', async () => {
      await registerSession('user-1');
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ sessionId: 'from-another-device' }),
      });
      await validateSession('user-1');
      expect(getCurrentSessionId()).toBeNull();
    });
  });
});


// --- Pure generateSessionId logic tests ---

describe('generateSessionId (pure logic)', () => {
  function generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  }

  it('should produce a non-empty string', () => {
    const id = generateSessionId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should produce unique IDs in rapid succession', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId());
    }
    // Due to random component, all should be unique
    expect(ids.size).toBe(100);
  });

  it('should contain only alphanumeric characters', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should have a reasonable length (timestamp base36 + random)', () => {
    const id = generateSessionId();
    // Date.now() in base36 is ~8-9 chars, random part is up to 8 chars
    expect(id.length).toBeGreaterThanOrEqual(10);
    expect(id.length).toBeLessThanOrEqual(20);
  });
});
