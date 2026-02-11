const admin = require('firebase-admin');
const fs = require('fs');
const sa = JSON.parse(fs.readFileSync('c:/Users/antigravity/Downloads/miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'miryangosweb.firebasestorage.app' });
const db = admin.firestore();

const FIXES = [
  {
    docId: '5dIic2T3fYmBiAVnYJlW',
    title: '무릎 골연화증',
    attachmentUrl: 'https://storage.googleapis.com/miryangosweb.firebasestorage.app/articles/noterang_%EB%AC%B4%EB%A6%8E_%EA%B3%A8%EC%97%B0%ED%99%94%EC%A6%9D.pdf',
    attachmentName: 'noterang_무릎_골연화증.pdf',
  },
  {
    docId: 'kV0JI1NBjljHD1qFQbr6',
    title: '족모지통풍관절염',
    attachmentUrl: 'https://storage.googleapis.com/miryangosweb.firebasestorage.app/articles/noterang_%EC%A1%B1%EB%AA%A8%EC%A7%80%ED%86%B5%ED%92%8D%EA%B4%80%EC%A0%88%EC%97%BC.pdf',
    attachmentName: 'noterang_족모지통풍관절염.pdf',
  },
  {
    docId: 'mi4fb9Iy6RKeT3KfdFQL',
    title: '아킬레스건염',
    attachmentUrl: 'https://storage.googleapis.com/miryangosweb.firebasestorage.app/articles/noterang_%EC%95%84%ED%82%AC%EB%A0%88%EC%8A%A4%EA%B1%B4%EC%97%BC.pdf',
    attachmentName: 'noterang_아킬레스건염.pdf',
  },
];

async function main() {
  for (const fix of FIXES) {
    console.log(`[${fix.title}]`);
    await db.collection('articles').doc(fix.docId).update({
      attachmentUrl: fix.attachmentUrl,
      attachmentName: fix.attachmentName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  attachmentUrl + createdAt 수정 완료');
  }
  console.log('\n완료!');
  process.exit(0);
}
main();
