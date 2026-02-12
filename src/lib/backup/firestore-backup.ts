/**
 * Firestore Backup Engine — Admin SDK direct export (no gcloud CLI)
 *
 * 의료법 제23조 — 진료기록 백업 및 보존
 * Replaces legacy gcloud CLI approach with Admin SDK + Firebase Storage.
 */

import { initAdmin, adminDb, adminStorage } from '@/lib/firebase-admin';
import { writeAuditLog } from '@/lib/audit-logger';
import { FieldValue } from 'firebase-admin/firestore';
import type { BackupMetadata, BackupOptions, BackupStatus } from '@/types/backup';

const DEFAULT_COLLECTIONS = [
  'patients', 'visits', 'charts', 'appointments',
  'audit_logs', 'signing_keys', 'users',
];
const PAGE_SIZE = 500;

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}`;
}

/** Serialize Firestore Timestamps to plain objects */
function serializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return { _type: 'Date', _value: val.toISOString() };
  if (typeof val === 'object' && val !== null && '_seconds' in val && '_nanoseconds' in val) {
    const ts = val as { _seconds: number; _nanoseconds: number };
    return { _type: 'Timestamp', _seconds: ts._seconds, _nanoseconds: ts._nanoseconds };
  }
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === 'object' && val !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return val;
}

/** Export a single collection using cursor-based pagination */
async function exportCollection(
  collectionName: string,
): Promise<{ documents: Record<string, unknown>[]; count: number }> {
  const db = adminDb();
  const documents: Record<string, unknown>[] = [];
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection(collectionName)
      .orderBy('__name__')
      .limit(PAGE_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      documents.push({
        _id: doc.id,
        ...serializeValue(doc.data()) as Record<string, unknown>,
      });
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < PAGE_SIZE) break;
  }

  return { documents, count: documents.length };
}

/**
 * Create a full backup of specified Firestore collections.
 * Uploads JSON files to Firebase Storage under `backups/{timestamp}/`.
 */
export async function createBackup(
  options: BackupOptions = {},
  triggeredBy: string,
  method: 'manual' | 'scheduled' = 'manual',
): Promise<BackupMetadata> {
  initAdmin();
  const db = adminDb();
  const storage = adminStorage();
  const bucket = storage.bucket();

  const collections = options.collections ?? DEFAULT_COLLECTIONS;
  const timestamp = getTimestamp();
  const basePath = `backups/${timestamp}`;

  const metadata: BackupMetadata = {
    id: '',
    startedAt: new Date(),
    status: 'running' as BackupStatus,
    triggeredBy,
    method,
    collections,
    documentCounts: {},
    storagePath: basePath,
    sizeBytes: 0,
  };

  // Save initial metadata to Firestore
  const metaRef = await db.collection('backup_metadata').add({
    ...metadata,
    startedAt: FieldValue.serverTimestamp(),
    status: 'running',
  });
  metadata.id = metaRef.id;

  try {
    let totalBytes = 0;

    for (const collectionName of collections) {
      const { documents, count } = await exportCollection(collectionName);
      metadata.documentCounts[collectionName] = count;

      const json = JSON.stringify(documents, null, 2);
      const buffer = Buffer.from(json, 'utf-8');
      totalBytes += buffer.byteLength;

      const file = bucket.file(`${basePath}/${collectionName}.json`);
      await file.save(buffer, {
        contentType: 'application/json',
        metadata: { backupId: metadata.id, collection: collectionName },
      });
    }

    metadata.sizeBytes = totalBytes;
    metadata.completedAt = new Date();
    metadata.status = 'completed';

    await metaRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      documentCounts: metadata.documentCounts,
      sizeBytes: totalBytes,
    });

    await writeAuditLog({
      action: 'export',
      collection: 'backup_metadata',
      documentId: metadata.id,
      userId: triggeredBy,
      description: `백업 완료: ${collections.join(', ')} (${totalBytes} bytes)`,
      metadata: { documentCounts: metadata.documentCounts },
    });

    return metadata;
  } catch (error) {
    metadata.status = 'failed';
    metadata.completedAt = new Date();

    await metaRef.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      error: error instanceof Error ? error.message : String(error),
    });

    await writeAuditLog({
      action: 'export',
      collection: 'backup_metadata',
      documentId: metadata.id,
      userId: triggeredBy,
      description: `백업 실패: ${error instanceof Error ? error.message : String(error)}`,
    });

    throw error;
  }
}

/**
 * List backup history from Firestore.
 */
export async function listBackups(options?: {
  limit?: number;
  status?: BackupStatus;
}): Promise<BackupMetadata[]> {
  initAdmin();
  const db = adminDb();

  let query: FirebaseFirestore.Query = db
    .collection('backup_metadata')
    .orderBy('startedAt', 'desc');

  if (options?.status) {
    query = query.where('status', '==', options.status);
  }

  query = query.limit(options?.limit ?? 20);

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startedAt: doc.data().startedAt?.toDate?.() ?? new Date(),
    completedAt: doc.data().completedAt?.toDate?.() ?? undefined,
  })) as BackupMetadata[];
}
