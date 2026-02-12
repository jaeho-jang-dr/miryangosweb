/**
 * Backup Verifier — Validates backup integrity against live Firestore data
 *
 * 의료법 제23조 — 백업 데이터 무결성 검증
 */

import { initAdmin, adminDb, adminStorage } from '@/lib/firebase-admin';
import { writeAuditLog } from '@/lib/audit-logger';
import type { BackupVerification, BackupMetadata } from '@/types/backup';

/**
 * Verify a backup by comparing live Firestore data against stored JSON.
 *
 * @param backupId - The backup_metadata document ID
 * @param sampleSize - Number of random documents to sample-check per collection
 */
export async function verifyBackup(
  backupId: string,
  sampleSize = 3,
): Promise<BackupVerification> {
  initAdmin();
  const db = adminDb();
  const storage = adminStorage();
  const bucket = storage.bucket();

  // Fetch backup metadata
  const metaDoc = await db.collection('backup_metadata').doc(backupId).get();
  if (!metaDoc.exists) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  const meta = metaDoc.data() as Omit<BackupMetadata, 'id'>;
  const verification: BackupVerification = {
    sourceDocCounts: {},
    backupDocCounts: {},
    mismatches: [],
    sampleChecks: [],
  };

  for (const collectionName of meta.collections) {
    // Count live documents
    const liveSnapshot = await db.collection(collectionName).count().get();
    const liveCount = liveSnapshot.data().count;
    verification.sourceDocCounts[collectionName] = liveCount;

    // Read backup JSON from Storage
    const file = bucket.file(`${meta.storagePath}/${collectionName}.json`);
    const [exists] = await file.exists();
    if (!exists) {
      verification.mismatches.push(`Missing backup file: ${collectionName}.json`);
      verification.backupDocCounts[collectionName] = 0;
      continue;
    }

    const [contents] = await file.download();
    const backupDocs: Record<string, unknown>[] = JSON.parse(contents.toString('utf-8'));
    verification.backupDocCounts[collectionName] = backupDocs.length;

    // Compare counts
    if (liveCount !== backupDocs.length) {
      verification.mismatches.push(
        `${collectionName}: live=${liveCount}, backup=${backupDocs.length}`,
      );
    }

    // Sample check: pick random documents and compare key fields
    const sampleIndices = getRandomIndices(backupDocs.length, sampleSize);
    for (const idx of sampleIndices) {
      const backupDoc = backupDocs[idx];
      const docId = backupDoc._id as string;
      if (!docId) continue;

      const liveDoc = await db.collection(collectionName).doc(docId).get();
      if (!liveDoc.exists) {
        verification.sampleChecks.push({
          collection: collectionName,
          documentId: docId,
          match: false,
          details: 'Document missing in live Firestore',
        });
        continue;
      }

      const liveData = liveDoc.data() ?? {};
      const liveFieldCount = Object.keys(liveData).length;
      // Backup doc has _id plus the original fields
      const backupFieldCount = Object.keys(backupDoc).length - 1;

      const match = liveFieldCount === backupFieldCount;
      verification.sampleChecks.push({
        collection: collectionName,
        documentId: docId,
        match,
        details: match
          ? `Fields match (${liveFieldCount})`
          : `Field count mismatch: live=${liveFieldCount}, backup=${backupFieldCount}`,
      });

      if (!match) {
        verification.mismatches.push(
          `${collectionName}/${docId}: field count mismatch`,
        );
      }
    }
  }

  // Update backup_metadata with verification result
  const status = verification.mismatches.length === 0 ? 'verified' : 'completed';
  await db.collection('backup_metadata').doc(backupId).update({
    verification,
    status,
  });

  await writeAuditLog({
    action: 'read',
    collection: 'backup_metadata',
    documentId: backupId,
    description: `백업 검증 ${verification.mismatches.length === 0 ? '통과' : '불일치 발견'}: ${verification.mismatches.length}건`,
    metadata: {
      mismatches: verification.mismatches,
      sampleChecks: verification.sampleChecks.length,
    },
  });

  return verification;
}

function getRandomIndices(max: number, count: number): number[] {
  if (max === 0) return [];
  const effective = Math.min(count, max);
  const indices = new Set<number>();
  while (indices.size < effective) {
    indices.add(Math.floor(Math.random() * max));
  }
  return Array.from(indices);
}
