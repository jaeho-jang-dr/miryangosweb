/**
 * Server-side audit logger — writes to Firestore `audit_logs` collection
 * via Firebase Admin SDK (bypasses client security rules).
 *
 * 의료법 제23조 — 진료기록 접근/변경 이력 보존
 *
 * Hash Chain Integrity (3.4):
 * Each log entry includes a SHA-256 hash linking it to the previous entry,
 * enabling tamper detection via verifyAuditChain().
 */

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import type { AuditLogInput } from '@/types/security';

/**
 * Compute SHA-256 hash for an audit entry linked to previous hash
 */
function computeHash(previousHash: string, entry: Record<string, unknown>): string {
  const payload = previousHash + JSON.stringify(entry, Object.keys(entry).sort());
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Get the hash of the most recent audit log entry
 */
async function getLatestHash(): Promise<string> {
  const db = getFirestore();
  const snapshot = await db.collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return '0'; // Genesis hash
  const data = snapshot.docs[0].data();
  return data.hash || '0';
}

/**
 * Write an audit log entry with hash chain integrity.
 * Called from API routes only (server-side).
 */
export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  initAdmin();
  const db = getFirestore();

  const previousHash = await getLatestHash();
  const hash = computeHash(previousHash, input as unknown as Record<string, unknown>);

  const logEntry = {
    ...input,
    timestamp: FieldValue.serverTimestamp(),
    previousHash,
    hash,
  };

  const ref = await db.collection('audit_logs').add(logEntry);
  return ref.id;
}

/**
 * Verify the integrity of the audit log chain.
 * Returns { valid: true } if chain is intact, or details about the break point.
 */
export async function verifyAuditChain(limit: number = 100): Promise<{
  valid: boolean;
  checkedCount: number;
  brokenAt?: string;
  error?: string;
}> {
  initAdmin();
  const db = getFirestore();

  const snapshot = await db.collection('audit_logs')
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get();

  let expectedPrevHash = '0';
  let checkedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.hash) continue; // Skip legacy entries without hash

    // Verify previousHash matches expected
    if (data.previousHash !== expectedPrevHash) {
      return {
        valid: false,
        checkedCount,
        brokenAt: doc.id,
        error: `Chain broken: expected previousHash="${expectedPrevHash}" but got "${data.previousHash}"`,
      };
    }

    // Verify hash is correctly computed
    const { hash: _hash, previousHash: _prev, timestamp: _ts, ...entryData } = data;
    const recomputed = computeHash(data.previousHash, entryData);
    if (recomputed !== data.hash) {
      return {
        valid: false,
        checkedCount,
        brokenAt: doc.id,
        error: `Hash mismatch: entry may have been tampered with`,
      };
    }

    expectedPrevHash = data.hash;
    checkedCount++;
  }

  return { valid: true, checkedCount };
}

/**
 * Query audit logs with filters. Admin-only.
 */
export async function queryAuditLogs(options: {
  collection?: string;
  documentId?: string;
  userId?: string;
  action?: string;
  limit?: number;
  startAfter?: string;
}) {
  initAdmin();
  const db = getFirestore();

  let q: FirebaseFirestore.Query = db.collection('audit_logs')
    .orderBy('timestamp', 'desc');

  if (options.collection) {
    q = q.where('collection', '==', options.collection);
  }
  if (options.documentId) {
    q = q.where('documentId', '==', options.documentId);
  }
  if (options.userId) {
    q = q.where('userId', '==', options.userId);
  }
  if (options.action) {
    q = q.where('action', '==', options.action);
  }

  q = q.limit(options.limit || 50);

  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
