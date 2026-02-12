/**
 * Backup system types — 의료법 제23조 데이터 보존 의무
 */

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'verified';

export interface BackupVerification {
  sourceDocCounts: Record<string, number>;
  backupDocCounts: Record<string, number>;
  mismatches: string[];
  sampleChecks: {
    collection: string;
    documentId: string;
    match: boolean;
    details?: string;
  }[];
}

export interface BackupMetadata {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: BackupStatus;
  triggeredBy: string;
  method: 'manual' | 'scheduled';
  collections: string[];
  documentCounts: Record<string, number>;
  storagePath: string;
  sizeBytes: number;
  verification?: BackupVerification;
}

export interface BackupOptions {
  collections?: string[];
  verifyAfter?: boolean;
  sampleSize?: number;
}
