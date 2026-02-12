/**
 * Server-side audit logger — writes to Firestore `audit_logs` collection
 * via Firebase Admin SDK (bypasses client security rules).
 *
 * 의료법 제23조 — 진료기록 접근/변경 이력 보존
 */

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { AuditLogInput } from '@/types/security';

/**
 * Write an audit log entry. Called from API routes only (server-side).
 */
export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  initAdmin();
  const db = getFirestore();

  const logEntry = {
    ...input,
    timestamp: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection('audit_logs').add(logEntry);
  return ref.id;
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
