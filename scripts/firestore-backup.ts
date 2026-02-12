/**
 * Firestore Backup Script — GCS로 전체 Firestore 데이터 내보내기
 *
 * 실행 방법:
 *   npx tsx scripts/firestore-backup.ts
 *
 * 필요 조건:
 *   - gcloud CLI 설치 및 인증 (gcloud auth login)
 *   - GCS 버킷 생성 (gs://miryangosweb-backups)
 *   - 서비스 계정에 Cloud Datastore Import Export Admin 역할 필요
 *
 * 자동화 (Windows Task Scheduler):
 *   schtasks /create /tn "Firestore Daily Backup" /tr "npx tsx D:\path\scripts\firestore-backup.ts" /sc daily /st 03:00
 *
 * 자동화 (GCP Cloud Scheduler + Cloud Functions):
 *   scripts/setup-gcp-backup.sh 참고
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'miryangosweb';
const BUCKET = `gs://${PROJECT_ID}-backups`;
const COLLECTIONS = ['patients', 'visits', 'charts', 'appointments', 'audit_logs', 'signing_keys', 'users'];

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}`;
}

function logToFile(message: string) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'firestore-backup.log');
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(message);
}

async function main() {
  const timestamp = getTimestamp();
  const outputUri = `${BUCKET}/${timestamp}`;

  logToFile(`=== Firestore Backup Start ===`);
  logToFile(`Project: ${PROJECT_ID}`);
  logToFile(`Destination: ${outputUri}`);
  logToFile(`Collections: ${COLLECTIONS.join(', ')}`);

  try {
    // 1. 버킷 존재 확인 (없으면 생성)
    try {
      execSync(`gcloud storage buckets describe ${BUCKET} --project=${PROJECT_ID} 2>&1`, { stdio: 'pipe' });
      logToFile(`Bucket exists: ${BUCKET}`);
    } catch {
      logToFile(`Creating bucket: ${BUCKET}`);
      execSync(`gcloud storage buckets create ${BUCKET} --project=${PROJECT_ID} --location=asia-northeast3 --uniform-bucket-level-access`, { stdio: 'inherit' });
    }

    // 2. Firestore export
    const collectionIds = COLLECTIONS.map(c => `--collection-ids=${c}`).join(' ');
    const cmd = `gcloud firestore export ${outputUri} ${collectionIds} --project=${PROJECT_ID}`;
    logToFile(`Executing: ${cmd}`);

    execSync(cmd, { stdio: 'inherit', timeout: 300000 }); // 5분 타임아웃

    logToFile(`✅ Backup completed: ${outputUri}`);

    // 3. 30일 이상 된 백업 자동 삭제 (retention policy)
    logToFile(`Cleaning up backups older than 30 days...`);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = `${thirtyDaysAgo.getFullYear()}${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

      const listOutput = execSync(`gcloud storage ls ${BUCKET}/ --project=${PROJECT_ID}`, { encoding: 'utf8' });
      const folders = listOutput.trim().split('\n').filter(f => f.trim());

      for (const folder of folders) {
        const folderName = folder.replace(BUCKET + '/', '').replace('/', '');
        const folderDate = folderName.split('-')[0]; // YYYYMMDD part
        if (folderDate && folderDate < cutoff) {
          logToFile(`  Deleting old backup: ${folder}`);
          execSync(`gcloud storage rm -r ${folder} --project=${PROJECT_ID}`, { stdio: 'pipe' });
        }
      }
      logToFile(`Cleanup done.`);
    } catch (cleanupErr) {
      logToFile(`Cleanup warning (non-fatal): ${cleanupErr instanceof Error ? cleanupErr.message : cleanupErr}`);
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logToFile(`❌ Backup FAILED: ${msg}`);
    process.exit(1);
  }

  logToFile(`=== Firestore Backup End ===\n`);
}

main();
