/**
 * ECDSA-P256 Digital Signature for clinical records
 * 의료법 제23조 — 전자서명을 통한 진료기록 무결성 보장
 *
 * Server-side only (uses Node.js crypto module).
 */

import crypto from 'crypto';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const ALGORITHM = 'SHA256';
const CURVE = 'prime256v1'; // = NIST P-256

// ─── Key Management ─────────────────────────────────────────

export interface KeyPair {
  publicKey: string;   // PEM-encoded
  privateKey: string;  // PEM-encoded
}

/**
 * Generate a new ECDSA-P256 key pair.
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: CURVE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/**
 * Get or create a signing key pair for a user.
 * Keys are stored in Firestore `signing_keys/{userId}`.
 */
export async function getOrCreateUserKeys(userId: string): Promise<KeyPair> {
  initAdmin();
  const db = getFirestore();
  const keyDoc = db.collection('signing_keys').doc(userId);

  const existing = await keyDoc.get();
  if (existing.exists) {
    const data = existing.data()!;
    return { publicKey: data.publicKey, privateKey: data.privateKey };
  }

  const keys = generateKeyPair();
  await keyDoc.set({
    ...keys,
    createdAt: new Date().toISOString(),
    algorithm: 'ECDSA-P256',
  });

  return keys;
}

// ─── Signing ────────────────────────────────────────────────

/**
 * Build a canonical string from the fields to sign.
 * Sorts keys alphabetically and JSON-stringifies values for deterministic hashing.
 */
export function buildCanonicalPayload(fields: Record<string, unknown>): string {
  const sorted = Object.keys(fields).sort();
  const parts = sorted.map(k => `${k}:${JSON.stringify(fields[k] ?? '')}`);
  return parts.join('|');
}

/**
 * Sign a set of fields with a private key.
 * Returns base64-encoded signature.
 */
export function signFields(fields: Record<string, unknown>, privateKeyPem: string): string {
  const payload = buildCanonicalPayload(fields);
  const signer = crypto.createSign(ALGORITHM);
  signer.update(payload);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * Verify a signature against the original fields and public key.
 */
export function verifySignature(
  fields: Record<string, unknown>,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  const payload = buildCanonicalPayload(fields);
  const verifier = crypto.createVerify(ALGORITHM);
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKeyPem, signatureBase64, 'base64');
}

// ─── High-Level: Sign a Visit Record ────────────────────────

/** Fields from a Visit that get signed */
const SIGNED_VISIT_FIELDS = [
  'id', 'patientId', 'patientName', 'status',
  'chiefComplaint', 'physicalExam', 'diagnosis',
  'treatmentNote', 'testOrder', 'testResult', 'prescription',
] as const;

export interface SignedVisitResult {
  signature: string;
  publicKey: string;
  signedFields: string[];
  signedAt: string;
  algorithm: 'ECDSA-P256';
}

/**
 * Sign a completed visit record.
 * Extracts the relevant clinical fields and signs them.
 */
export async function signVisitRecord(
  visitData: Record<string, unknown>,
  userId: string,
): Promise<SignedVisitResult> {
  const keys = await getOrCreateUserKeys(userId);

  // Extract only the fields we want to sign
  const fieldsToSign: Record<string, unknown> = {};
  for (const key of SIGNED_VISIT_FIELDS) {
    if (visitData[key] !== undefined) {
      fieldsToSign[key] = visitData[key];
    }
  }

  const signature = signFields(fieldsToSign, keys.privateKey);

  return {
    signature,
    publicKey: keys.publicKey,
    signedFields: Object.keys(fieldsToSign),
    signedAt: new Date().toISOString(),
    algorithm: 'ECDSA-P256',
  };
}

/**
 * Verify a previously signed visit record.
 */
export function verifyVisitSignature(
  visitData: Record<string, unknown>,
  signatureBase64: string,
  publicKeyPem: string,
  signedFields: string[],
): boolean {
  const fieldsToVerify: Record<string, unknown> = {};
  for (const key of signedFields) {
    if (visitData[key] !== undefined) {
      fieldsToVerify[key] = visitData[key];
    }
  }
  return verifySignature(fieldsToVerify, signatureBase64, publicKeyPem);
}
