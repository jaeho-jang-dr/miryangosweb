/**
 * Security types for 의료법 제23조 compliance
 * Phase 1: Audit logging, encryption, digital signatures
 */

import { Timestamp } from 'firebase/firestore';

// ─── Clinical Roles ─────────────────────────────────────────

export type ClinicalRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface ClinicalUser {
  uid: string;
  email: string;
  displayName?: string;
  role: ClinicalRole;
}

// ─── Audit Log ──────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'encrypt'
  | 'decrypt'
  | 'sign'
  | 'export'
  | 'login'
  | 'logout';

export interface AuditLog {
  id: string;
  timestamp: Timestamp;
  action: AuditAction;
  collection: string;           // e.g. 'patients', 'visits', 'charts'
  documentId: string;
  userId?: string;              // Firebase Auth UID
  userEmail?: string;
  userName?: string;
  userRole?: ClinicalRole;
  ipAddress?: string;
  userAgent?: string;
  before?: Record<string, unknown>;  // Previous state (for updates)
  after?: Record<string, unknown>;   // New state
  description?: string;         // Human-readable description
  metadata?: Record<string, unknown>;
}

export type AuditLogInput = Omit<AuditLog, 'id' | 'timestamp'>;

// ─── Encryption ─────────────────────────────────────────────

export interface EncryptedField {
  ciphertext: string;   // Base64-encoded AES-256-GCM ciphertext
  iv: string;           // Base64-encoded initialization vector
  tag: string;          // Base64-encoded authentication tag
  version: number;      // Key version for rotation
}

// ─── Digital Signature (Phase 2) ────────────────────────────

export interface DigitalSignature {
  signerId: string;
  signerName: string;
  algorithm: 'ECDSA-P256';
  signature: string;      // Base64-encoded signature
  publicKey: string;      // Base64-encoded public key
  signedAt: Timestamp;
  signedFields: string[]; // Which fields were included in the hash
}
