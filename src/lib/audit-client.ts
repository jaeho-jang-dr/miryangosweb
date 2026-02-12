/**
 * Client-side audit helper — fire-and-forget POST to /api/clinical/audit.
 * Import this in 'use client' pages to log clinical data access/changes.
 *
 * Usage:
 *   import { logAudit } from '@/lib/audit-client';
 *   logAudit({ action: 'update', collection: 'visits', documentId: id, description: '차트 저장' });
 */

import type { AuditAction } from '@/types/security';
import { getAuth } from 'firebase/auth';

interface LogAuditParams {
  action: AuditAction;
  collection: string;
  documentId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log with authentication.
 * Tries to attach the current user's Firebase Auth token for user identification.
 * Never throws — logs errors silently.
 */
export function logAudit(params: LogAuditParams): void {
  const body = JSON.stringify(params);

  // Try to get auth token for user identification
  let tokenPromise: Promise<string | null>;
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    tokenPromise = user ? user.getIdToken() : Promise.resolve(null);
  } catch {
    tokenPromise = Promise.resolve(null);
  }

  tokenPromise.then((token) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If no token (not authenticated), fall back to sendBeacon (no custom headers)
    if (!token && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        '/api/clinical/audit',
        new Blob([body], { type: 'application/json' })
      );
      if (sent) return;
    }

    // fetch with auth header
    fetch('/api/clinical/audit', {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }).catch((err) => {
      console.warn('[AuditClient] Failed to send audit log:', err.message);
    });
  }).catch(() => {
    // Last resort: sendBeacon without auth
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/clinical/audit',
        new Blob([body], { type: 'application/json' })
      );
    }
  });
}
