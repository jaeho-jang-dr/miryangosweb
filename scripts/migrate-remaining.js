#!/usr/bin/env node
/**
 * 2차 마이그레이션: 타임스탬프 매칭 실패한 항목들 처리
 * - 제목 유사도로 매칭
 * - 시간 범위 확대 (20분)
 * - 로컬 public/uploads 파일은 Firebase Storage로 이동
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = 'c:/Users/antigravity/Downloads/miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json';
const STORAGE_BUCKET = 'miryangosweb.firebasestorage.app';
const GOOGLE_DRIVE_PDF_DIR = 'G:/내 드라이브/notebooklm';
const LOCAL_UPLOADS_DIR = 'D:/Entertainments/DevEnvironment/miryangosweb/public/uploads';

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Manual mappings for title-based matching
const TITLE_TO_PDF = {
  '족주상골부골증': '족주상골_부골증.pdf',
  '족주상골 부골증': '족주상골_부골증.pdf',
};

function parseNoterangTimestamp(filename) {
  const match = filename.match(/noterang_(\d{8})_(\d{6})/);
  if (!match) return null;
  const [, date, time] = match;
  const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8);
  const h = time.slice(0, 2), min = time.slice(2, 4), s = time.slice(4, 6);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
}

function parseSlidesTimestamp(filename) {
  const match = filename.match(/slides_(\d{8})_(\d{6})/);
  if (!match) return null;
  const [, date, time] = match;
  const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8);
  const h = time.slice(0, 2), min = time.slice(2, 4), s = time.slice(4, 6);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
}

function findMatchingPdf(noterangFilename, title, pdfFiles) {
  // 1. Title-based matching
  if (TITLE_TO_PDF[title]) return TITLE_TO_PDF[title];

  // 2. Extended timestamp matching (20 min window)
  const noterangTime = parseNoterangTimestamp(noterangFilename);
  if (!noterangTime) return null;

  let closest = null;
  let minDiff = Infinity;

  for (const pdf of pdfFiles) {
    const slidesTime = parseSlidesTimestamp(pdf);
    if (!slidesTime) continue;
    const diff = Math.abs(noterangTime.getTime() - slidesTime.getTime());
    if (diff < 20 * 60 * 1000 && diff < minDiff) {
      minDiff = diff;
      closest = pdf;
    }
  }
  return closest;
}

async function uploadToStorage(localPath, storagePath, contentType) {
  const file = bucket.file(storagePath);
  await file.save(fs.readFileSync(localPath), { contentType });
  await file.makePublic();
  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${storagePath}`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log('=== 2차 마이그레이션 ===\n');

  const pdfFiles = fs.readdirSync(GOOGLE_DRIVE_PDF_DIR).filter(f => f.endsWith('.pdf'));

  const snapshot = await db.collection('articles').get();
  let fixed = 0, failed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const url = data.attachmentUrl || '';

    // Skip already fixed (Firebase Storage URLs)
    if (!url.startsWith('/uploads/')) continue;

    const filename = path.basename(url);
    console.log(`\n[${data.title}]`);
    console.log(`  현재 URL: ${url}`);

    // Check if file exists locally (for non-noterang uploads like timestamp-based ones)
    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      console.log(`  로컬 파일 발견 → Firebase Storage 업로드`);
      try {
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.pdf' ? 'application/pdf' :
                           ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                           ext === '.png' ? 'image/png' : 'application/octet-stream';
        const storageUrl = await uploadToStorage(localPath, `articles/${filename}`, contentType);

        const updates = { attachmentUrl: storageUrl };
        if (data.content && data.content.includes(url)) {
          updates.content = data.content.replace(new RegExp(escapeRegex(url), 'g'), storageUrl);
        }
        await db.collection('articles').doc(doc.id).update(updates);
        console.log(`  완료: ${storageUrl}`);
        fixed++;
        continue;
      } catch (e) {
        console.log(`  로컬 업로드 실패: ${e.message}`);
      }
    }

    // Try Google Drive matching
    const matchedPdf = findMatchingPdf(filename, data.title, pdfFiles);
    if (matchedPdf) {
      const pdfLocalPath = path.join(GOOGLE_DRIVE_PDF_DIR, matchedPdf);
      console.log(`  매칭 PDF: ${matchedPdf}`);
      try {
        const storageUrl = await uploadToStorage(pdfLocalPath, `articles/${filename}`, 'application/pdf');
        const updates = { attachmentUrl: storageUrl };
        if (data.content && data.content.includes('/uploads/')) {
          let newContent = data.content;
          newContent = newContent.replace(new RegExp(escapeRegex(url), 'g'), storageUrl);
          const thumbMatch = data.content.match(/\/uploads\/noterang_[^)"\s]+_thumb\.png/);
          if (thumbMatch) {
            newContent = newContent.replace(
              new RegExp(`!\\[.*?\\]\\(${escapeRegex(thumbMatch[0])}\\)`, 'g'), ''
            );
          }
          updates.content = newContent;
        }
        await db.collection('articles').doc(doc.id).update(updates);
        console.log(`  완료: ${storageUrl}`);
        fixed++;
      } catch (e) {
        console.log(`  오류: ${e.message}`);
        failed++;
      }
    } else {
      console.log(`  매칭 PDF 없음 - 건너뜀`);
      failed++;
    }
  }

  console.log(`\n=== 결과: 성공 ${fixed}, 실패 ${failed} ===`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
