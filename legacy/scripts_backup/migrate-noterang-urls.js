#!/usr/bin/env node
/**
 * 마이그레이션: /uploads/noterang_* 로컬 URL → Firebase Storage URL
 *
 * 1. Firestore articles 컬렉션에서 /uploads/ URL을 가진 문서 조회
 * 2. Google Drive의 원본 PDF를 Firebase Storage에 업로드
 * 3. Firestore 문서의 attachmentUrl 업데이트
 * 4. content 내 이미지/링크 URL도 업데이트
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- Config ---
const SERVICE_ACCOUNT_PATH = 'c:/Users/antigravity/Downloads/miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json';
const STORAGE_BUCKET = 'miryangosweb.firebasestorage.app';
const GOOGLE_DRIVE_PDF_DIR = 'G:/내 드라이브/notebooklm';

// Init Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Parse timestamp from noterang filename
 * e.g., "noterang_20260209_001429_7dad13aa_견관절_충돌증후군.pdf" → Date
 */
function parseNoterangTimestamp(filename) {
  const match = filename.match(/noterang_(\d{8})_(\d{6})/);
  if (!match) return null;
  const [, date, time] = match;
  const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8);
  const h = time.slice(0, 2), min = time.slice(2, 4), s = time.slice(4, 6);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
}

/**
 * Parse timestamp from slides filename
 * e.g., "slides_20260209_001327.pdf" → Date
 */
function parseSlidesTimestamp(filename) {
  const match = filename.match(/slides_(\d{8})_(\d{6})/);
  if (!match) return null;
  const [, date, time] = match;
  const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8);
  const h = time.slice(0, 2), min = time.slice(2, 4), s = time.slice(4, 6);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
}

/**
 * Find the closest matching PDF from Google Drive by timestamp
 */
function findMatchingPdf(noterangFilename, pdfFiles) {
  const noterangTime = parseNoterangTimestamp(noterangFilename);
  if (!noterangTime) return null;

  let closest = null;
  let minDiff = Infinity;

  for (const pdf of pdfFiles) {
    const slidesTime = parseSlidesTimestamp(pdf);
    if (!slidesTime) continue;

    const diff = Math.abs(noterangTime.getTime() - slidesTime.getTime());
    // Within 10 minutes
    if (diff < 10 * 60 * 1000 && diff < minDiff) {
      minDiff = diff;
      closest = pdf;
    }
  }

  return closest;
}

/**
 * Upload file to Firebase Storage and return public URL
 */
async function uploadToStorage(localPath, storagePath, contentType) {
  const file = bucket.file(storagePath);
  await file.save(fs.readFileSync(localPath), { contentType });
  await file.makePublic();
  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${storagePath}`;
}

async function main() {
  console.log('=== Noterang URL Migration ===\n');

  // 1. Get PDF files from Google Drive
  let pdfFiles = [];
  try {
    pdfFiles = fs.readdirSync(GOOGLE_DRIVE_PDF_DIR)
      .filter(f => f.endsWith('.pdf'));
    console.log(`Google Drive PDFs: ${pdfFiles.length}개 발견`);
    pdfFiles.forEach(f => console.log(`  - ${f}`));
  } catch (e) {
    console.log(`Google Drive 폴더 접근 불가: ${e.message}`);
  }
  console.log();

  // 2. Query Firestore for articles with /uploads/ URLs
  const snapshot = await db.collection('articles').get();
  const articlesToFix = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const url = data.attachmentUrl || '';
    if (url.startsWith('/uploads/')) {
      articlesToFix.push({ id: doc.id, ...data });
    }
  }

  console.log(`수정 필요한 articles: ${articlesToFix.length}개\n`);

  if (articlesToFix.length === 0) {
    console.log('모든 URL이 정상입니다.');
    process.exit(0);
  }

  // 3. Process each article
  let fixed = 0;
  let failed = 0;

  for (const article of articlesToFix) {
    const filename = path.basename(article.attachmentUrl);
    console.log(`\n[${article.title}]`);
    console.log(`  현재 URL: ${article.attachmentUrl}`);

    // Find matching PDF
    const matchedPdf = findMatchingPdf(filename, pdfFiles);

    if (!matchedPdf) {
      console.log(`  매칭 PDF 없음 - 건너뜀`);
      failed++;
      continue;
    }

    const pdfLocalPath = path.join(GOOGLE_DRIVE_PDF_DIR, matchedPdf);
    console.log(`  매칭 PDF: ${matchedPdf}`);

    try {
      // Upload PDF to Firebase Storage
      const storagePdfPath = `articles/${filename}`;
      const pdfUrl = await uploadToStorage(pdfLocalPath, storagePdfPath, 'application/pdf');
      console.log(`  Storage URL: ${pdfUrl}`);

      // Update Firestore document
      const updates = { attachmentUrl: pdfUrl };

      // Also fix content if it contains the old /uploads/ URL
      if (article.content && article.content.includes('/uploads/')) {
        let newContent = article.content;
        // Replace old attachment URL
        newContent = newContent.replace(
          new RegExp(escapeRegex(article.attachmentUrl), 'g'),
          pdfUrl
        );
        // Replace old thumbnail URL if present
        if (article.content.includes('_thumb.png')) {
          const thumbMatch = article.content.match(/\/uploads\/noterang_[^)"\s]+_thumb\.png/);
          if (thumbMatch) {
            // We don't have thumbnails in Google Drive, so just remove the broken image
            newContent = newContent.replace(
              new RegExp(`!\\[.*?\\]\\(${escapeRegex(thumbMatch[0])}\\)`, 'g'),
              ''
            );
          }
        }
        updates.content = newContent;
      }

      await db.collection('articles').doc(article.id).update(updates);
      console.log(`  Firestore 업데이트 완료`);
      fixed++;
    } catch (e) {
      console.log(`  오류: ${e.message}`);
      failed++;
    }
  }

  console.log('\n=== 결과 ===');
  console.log(`성공: ${fixed}개, 실패: ${failed}개`);
  process.exit(0);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
