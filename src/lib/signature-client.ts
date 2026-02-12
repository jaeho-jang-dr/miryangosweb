/**
 * Client-side digital signature helper.
 * Calls /api/clinical/signature/sign after visit completion.
 *
 * Usage:
 *   import { signVisit } from '@/lib/signature-client';
 *   await signVisit(visitId); // fire after chart save with complete=true
 */

import { getAuth } from 'firebase/auth';

/**
 * Request the server to sign a completed visit record.
 * Requires the user to be authenticated with Firebase Auth.
 * Returns null on failure (non-blocking).
 */
export async function signVisit(visitId: string): Promise<{ signed: boolean; error?: string }> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return { signed: false, error: 'Not authenticated' };
    }

    const token = await user.getIdToken();
    const res = await fetch('/api/clinical/signature/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ visitId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { signed: false, error: data.error || `HTTP ${res.status}` };
    }

    return { signed: true };
  } catch (err) {
    console.warn('[SignatureClient] Failed to sign visit:', err);
    return { signed: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verify a visit's digital signature.
 */
export async function verifyVisit(visitId: string): Promise<{
  valid: boolean;
  signerName?: string;
  signedAt?: string;
  reason?: string;
  error?: string;
}> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return { valid: false, error: 'Not authenticated' };
    }

    const token = await user.getIdToken();
    const res = await fetch('/api/clinical/signature/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ visitId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { valid: false, error: data.error || `HTTP ${res.status}` };
    }

    return await res.json();
  } catch (err) {
    console.warn('[SignatureClient] Failed to verify visit:', err);
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
