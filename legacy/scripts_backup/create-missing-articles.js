const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = 'c:/Users/antigravity/Downloads/miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json';
const STORAGE_BUCKET = 'miryangosweb.firebasestorage.app';
const GOOGLE_DRIVE_PDF_DIR = 'G:/내 드라이브/notebooklm';

const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: STORAGE_BUCKET,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const ARTICLES = [
  {
    title: '무릎 골연화증',
    pdfFile: '0c612714_slides.pdf',
    type: 'disease',
    tags: ['자동생성', '노트랑', '인포그래픽', '무릎', '골연화증', '연골연화증', '슬개골'],
    summary: '무릎 골관절염과 연골연화증의 원인, 증상, 진단 및 치료법을 알기 쉽게 정리한 슬라이드 자료입니다.',
  },
  {
    title: '족모지통풍관절염',
    pdfFile: 'badb30d4_slides.pdf',
    type: 'disease',
    tags: ['자동생성', '노트랑', '인포그래픽', '발', '통풍', '관절염', '족모지'],
    summary: '족모지(엄지발가락) 통풍성 관절염의 원인, 증상, 진단 및 치료법을 정리한 슬라이드 자료입니다.',
  },
  {
    title: '아킬레스건염',
    pdfFile: '0bde57a4_slides.pdf',
    type: 'disease',
    tags: ['자동생성', '노트랑', '인포그래픽', '발', '아킬레스', '건염', '발목'],
    summary: '아킬레스건염의 원인, 증상, 진단 및 치료(비수술/수술)와 재활법을 정리한 슬라이드 자료입니다.',
  },
];

async function main() {
  console.log('=== 누락 3개 article 생성 ===\n');

  for (const article of ARTICLES) {
    console.log(`[${article.title}]`);

    const pdfPath = path.join(GOOGLE_DRIVE_PDF_DIR, article.pdfFile);
    if (!fs.existsSync(pdfPath)) {
      console.log(`  PDF 없음: ${pdfPath}\n`);
      continue;
    }

    const size = fs.statSync(pdfPath).size;
    console.log(`  PDF: ${article.pdfFile} (${(size / 1024 / 1024).toFixed(1)}MB)`);

    // Upload PDF to Firebase Storage
    const storageName = `noterang_${article.title.replace(/ /g, '_')}.pdf`;
    const storagePath = `articles/${storageName}`;
    const file = bucket.file(storagePath);
    await file.save(fs.readFileSync(pdfPath), { contentType: 'application/pdf' });
    await file.makePublic();
    const pdfUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${storagePath}`;
    console.log(`  Storage URL: ${pdfUrl}`);

    // Create Firestore document
    const docData = {
      title: article.title,
      type: article.type,
      tags: article.tags,
      summary: article.summary,
      content: `${article.title}에 대해 알기 쉽게 정리한 슬라이드 자료입니다.`,
      attachmentUrl: pdfUrl,
      attachmentName: storageName,
      images: [],
      isVisible: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('articles').add(docData);
    console.log(`  Firestore 문서 생성: ${docRef.id}\n`);
  }

  console.log('=== 완료 ===');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
