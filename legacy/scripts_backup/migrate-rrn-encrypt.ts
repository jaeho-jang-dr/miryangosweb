/**
 * RRN Migration Script — 기존 평문 주민번호를 암호화+마스킹 처리
 *
 * 실행 방법:
 *   npx tsx scripts/migrate-rrn-encrypt.ts [--dry-run]
 *
 * --dry-run: 실제 변경 없이 대상 문서만 확인
 *
 * 필요 환경변수:
 *   ENCRYPTION_MASTER_KEY (64자 hex)
 *   FIREBASE_SERVICE_ACCOUNT_KEY 또는 firebase-service-account.json
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
// Load .env.local manually (no dotenv dependency)
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
loadEnvFile(path.join(process.cwd(), '.env.local'));

// ─── Firebase Admin Init ────────────────────────────────────

function initAdmin() {
  if (getApps().length > 0) return;

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = cert(sa);
  } else {
    const saPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      credential = cert(sa);
    }
  }

  if (credential) {
    initializeApp({ credential });
  } else {
    initializeApp();
  }
}

// ─── Crypto (inline to avoid module resolution issues) ──────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_VERSION = 1;

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_MASTER_KEY must be a 64-character hex string');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext: string) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    version: KEY_VERSION,
  };
}

function maskRRN(rrn: string): string {
  const digits = rrn.replace(/[^0-9]/g, '');
  if (digits.length !== 13) return rrn.replace(/./g, '*');
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  return '*'.repeat(phone.length);
}

// ─── Migration ──────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== RRN/Phone Encryption Migration ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (변경 없음)' : 'LIVE (실제 변경)'}`);
  console.log('');

  initAdmin();
  const db = getFirestore();

  const snapshot = await db.collection('patients').get();
  console.log(`총 환자 수: ${snapshot.size}`);

  let migratedRRN = 0;
  let migratedPhone = 0;
  let skippedAlreadyEncrypted = 0;
  let skippedNoData = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const patientId = doc.id;
    const updates: Record<string, unknown> = {};

    try {
      // RRN migration
      if (data.rrn && typeof data.rrn === 'string' && data.rrn.trim().length > 0) {
        if (data.rrnEncrypted) {
          skippedAlreadyEncrypted++;
        } else {
          const encrypted = encrypt(data.rrn);
          const masked = maskRRN(data.rrn);
          updates.rrnEncrypted = encrypted;
          updates.rrnMasked = masked;
          updates.rrn = '';  // Clear plaintext
          migratedRRN++;
          console.log(`  [RRN] ${patientId} (${data.name}): ${masked}`);
        }
      } else {
        // No RRN to migrate
      }

      // Phone migration
      if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 0) {
        if (data.phoneEncrypted) {
          skippedAlreadyEncrypted++;
        } else {
          const encrypted = encrypt(data.phone);
          const masked = maskPhone(data.phone);
          updates.phoneEncrypted = encrypted;
          updates.phoneMasked = masked;
          // Note: keep phone as-is for now (used in UI searches)
          // updates.phone = masked;  // Uncomment to also mask the phone field
          migratedPhone++;
          console.log(`  [Phone] ${patientId} (${data.name}): ${masked}`);
        }
      }

      if (Object.keys(updates).length === 0) {
        skippedNoData++;
        continue;
      }

      if (!isDryRun) {
        await db.collection('patients').doc(patientId).update(updates);
      }
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ${patientId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('');
  console.log('=== 결과 ===');
  console.log(`주민번호 암호화: ${migratedRRN}건`);
  console.log(`전화번호 암호화: ${migratedPhone}건`);
  console.log(`이미 암호화됨 (스킵): ${skippedAlreadyEncrypted}건`);
  console.log(`데이터 없음 (스킵): ${skippedNoData}건`);
  console.log(`오류: ${errors}건`);
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 모드 — 실제 변경 없음. --dry-run 없이 다시 실행하세요.');
  } else {
    console.log('\n✅ 마이그레이션 완료');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
