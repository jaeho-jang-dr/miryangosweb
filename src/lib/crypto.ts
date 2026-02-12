/**
 * AES-256-GCM encryption/decryption for PHI (Protected Health Information)
 * 의료법 제23조 — 개인정보 암호화
 *
 * Server-side only (uses Node.js crypto module).
 *
 * Key Rotation:
 *   - ENCRYPTION_MASTER_KEY = current key (used for new encryptions)
 *   - ENCRYPTION_KEY_V{n}   = previous keys (used for decrypting old data)
 *   - encrypt() always uses ENCRYPTION_MASTER_KEY with the current KEY_VERSION
 *   - decrypt() reads field.version to pick the correct key
 *   - reEncrypt() decrypts with old key, re-encrypts with current key
 */

import crypto from 'crypto';
import type { EncryptedField } from '@/types/security';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // GCM recommended IV length
const TAG_LENGTH = 16;  // Authentication tag length

/** Current key version — bump this when rotating keys */
const CURRENT_KEY_VERSION = 1;

/**
 * Get the encryption key for a specific version.
 *   version 0 or current → ENCRYPTION_MASTER_KEY
 *   version N (retired)  → ENCRYPTION_KEY_VN
 */
function getKeyForVersion(version: number): Buffer {
  let hex: string | undefined;

  if (version === CURRENT_KEY_VERSION || version === 0) {
    hex = process.env.ENCRYPTION_MASTER_KEY;
    if (!hex || hex.length !== 64) {
      throw new Error('ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)');
    }
  } else {
    hex = process.env[`ENCRYPTION_KEY_V${version}`];
    if (!hex || hex.length !== 64) {
      throw new Error(`ENCRYPTION_KEY_V${version} not found or invalid (needed to decrypt version ${version} data)`);
    }
  }

  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM with the current master key.
 * Each call generates a random IV for semantic security.
 */
export function encrypt(plaintext: string): EncryptedField {
  const key = getKeyForVersion(CURRENT_KEY_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: CURRENT_KEY_VERSION,
  };
}

/**
 * Decrypt an EncryptedField back to plaintext.
 * Automatically selects the correct key based on field.version.
 */
export function decrypt(field: EncryptedField): string {
  const version = field.version || 1;
  const key = getKeyForVersion(version);
  const iv = Buffer.from(field.iv, 'base64');
  const tag = Buffer.from(field.tag, 'base64');
  const ciphertext = Buffer.from(field.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Re-encrypt a field with the current key.
 * Use this during key rotation to upgrade old-version data.
 * Returns null if already on the current version.
 */
export function reEncrypt(field: EncryptedField): EncryptedField | null {
  if (field.version === CURRENT_KEY_VERSION) {
    return null; // Already current
  }
  const plaintext = decrypt(field);
  return encrypt(plaintext);
}

/**
 * Check if a field needs re-encryption (old key version).
 */
export function needsReEncrypt(field: EncryptedField): boolean {
  return (field.version || 1) !== CURRENT_KEY_VERSION;
}

/** Export current version for external use */
export const CURRENT_VERSION = CURRENT_KEY_VERSION;

/**
 * Mask a Korean Resident Registration Number (RRN).
 * Input: "900101-1234567" → Output: "900101-1******"
 * Also handles no-dash format: "9001011234567" → "900101-1******"
 */
export function maskRRN(rrn: string): string {
  const digits = rrn.replace(/[^0-9]/g, '');
  if (digits.length !== 13) {
    return rrn.replace(/./g, '*'); // Unrecognized format — mask everything
  }
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

/**
 * Mask a Korean phone number.
 * Input: "010-1234-5678" → Output: "010-****-5678"
 * Input: "01012345678"   → Output: "010-****-5678"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }
  // Fallback: mask middle portion
  if (digits.length >= 7) {
    const keep = Math.min(3, Math.floor(digits.length / 3));
    return digits.slice(0, keep) + '*'.repeat(digits.length - keep * 2) + digits.slice(-keep);
  }
  return '*'.repeat(phone.length);
}
