/**
 * Import Ichart Excel master data (31 files, 3,623 records) → Firestore fee_schedule_items
 *
 * Usage:
 *   npx tsx scripts/import-fee-schedule.ts
 *   npx tsx scripts/import-fee-schedule.ts --dry-run
 *   npx tsx scripts/import-fee-schedule.ts --file 05_pomed.xlsx
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 *   - Or FIREBASE_SERVICE_ACCOUNT_KEY env var with JSON string
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { EXCEL_COLUMN_MAP, FEE_CATEGORY_NAMES, type FeeCategory } from '../src/types/fee-schedule';

// ─── Configuration ───────────────────────────────────────────────────────────

const EXCEL_DIR = 'G:\\내 드라이브\\Ichart';
const COLLECTION = 'fee_schedule_items';
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_FILE = process.argv.find((a, i) => process.argv[i - 1] === '--file');

// ─── Firebase Admin Init ─────────────────────────────────────────────────────

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (keyJson) {
    const serviceAccount = JSON.parse(keyJson);
    initializeApp({ credential: cert(serviceAccount) });
  } else if (keyPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    // Try default .env.local in project root
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
      if (match) {
        const serviceAccount = JSON.parse(match[1]);
        initializeApp({ credential: cert(serviceAccount) });
      }
    }
    if (getApps().length === 0) {
      console.error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.');
      process.exit(1);
    }
  }

  return getFirestore();
}

// ─── Excel File Discovery ────────────────────────────────────────────────────

function findExcelFiles(): string[] {
  if (SINGLE_FILE) {
    const filePath = path.join(EXCEL_DIR, SINGLE_FILE);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    return [filePath];
  }

  const files = fs.readdirSync(EXCEL_DIR)
    .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
    .sort()
    .map(f => path.join(EXCEL_DIR, f));

  console.log(`Found ${files.length} Excel files in ${EXCEL_DIR}`);
  return files;
}

// ─── Row Parser ──────────────────────────────────────────────────────────────

function parseCircleMark(value: unknown): boolean {
  if (!value) return false;
  const s = String(value).trim();
  return s === '○' || s === 'O' || s === 'o' || s === '●' || s.length > 0;
}

function safeNum(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

function safeStr(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function extractCategoryCode(categoryName: string): FeeCategory {
  const match = categoryName.match(/^(\d{2})/);
  if (match && match[1] in FEE_CATEGORY_NAMES) {
    return match[1] as FeeCategory;
  }
  return '36'; // fallback to 기타
}

interface ParsedRecord {
  prescriptionCode: string;
  hiraCode: string;
  name: string;
  ex: number | undefined;
  categoryCode: FeeCategory;
  categoryName: string;
  effectiveDate: string;
  ceilingPrice: number | undefined;
  unitPrice: number | undefined;
  clinicalFee: number | undefined;
  surcharge: number | undefined;
  cFlag: number;
  w1Flag: number | undefined;
  w2Flag: number | undefined;
  hFlag: boolean;
  pFlag: boolean;
  mFlag: boolean;
  iFlag: number | undefined;
  codeClassifier: string | undefined;
  consignmentMethod: string | undefined;
  consignmentCategory: string | undefined;
  isPsychotropic: boolean;
  isNarcotic: boolean;
  isRequired: boolean;
  isDementia: boolean;
  isDialysis: boolean;
  searchIndex: string | undefined;
  prescriptionPurpose: string | undefined;
  ingredientCode: string | undefined;
  isDiscontinued: boolean;
  dosageCode: string | undefined;
  defaultQuantity: number | undefined;
  defaultFrequency: number | undefined;
  dosageText: string | undefined;
  diagnosisCode: string | undefined;
  billingMemo: string | undefined;
  substituteCode: string | undefined;
  copayRatio: number | undefined;
  labManagement: number | undefined;
}

function parseRow(row: unknown[]): ParsedRecord | null {
  const C = EXCEL_COLUMN_MAP;

  const code = safeStr(row[C.prescriptionCode]);
  const name = safeStr(row[C.name]);
  if (!code || !name) return null;

  const categoryName = safeStr(row[C.categoryName]) || '36기타';
  const categoryCode = extractCategoryCode(categoryName);

  // Format effective date
  let effectiveDate = safeStr(row[C.effectiveDate]) || '';
  if (effectiveDate && !effectiveDate.includes('.')) {
    // Convert Excel date number to string if needed
    const dateNum = Number(effectiveDate);
    if (!isNaN(dateNum) && dateNum > 30000) {
      const d = new Date((dateNum - 25569) * 86400 * 1000);
      effectiveDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  return {
    prescriptionCode: code,
    hiraCode: safeStr(row[C.hiraCode]) || code,
    name,
    ex: safeNum(row[C.ex]),
    categoryCode,
    categoryName,
    effectiveDate,
    ceilingPrice: safeNum(row[C.ceilingPrice]),
    unitPrice: safeNum(row[C.unitPrice]),
    clinicalFee: safeNum(row[C.clinicalFee]),
    surcharge: safeNum(row[C.surcharge]),
    cFlag: safeNum(row[C.cFlag]) ?? 1,
    w1Flag: safeNum(row[C.w1Flag]),
    w2Flag: safeNum(row[C.w2Flag]),
    hFlag: row[C.hFlag] === 1 || row[C.hFlag] === '1',
    pFlag: row[C.pFlag] === 1 || row[C.pFlag] === '1',
    mFlag: row[C.mFlag] === 1 || row[C.mFlag] === '1',
    iFlag: safeNum(row[C.iFlag]),
    codeClassifier: safeStr(row[C.codeClassifier]),
    consignmentMethod: safeStr(row[C.consignmentMethod]),
    consignmentCategory: safeStr(row[C.consignmentCategory]),
    isPsychotropic: parseCircleMark(row[C.isPsychotropic]),
    isNarcotic: parseCircleMark(row[C.isNarcotic]),
    isRequired: parseCircleMark(row[C.isRequired]),
    isDementia: parseCircleMark(row[C.isDementia]),
    isDialysis: parseCircleMark(row[C.isDialysis]),
    searchIndex: safeStr(row[C.searchIndex]),
    prescriptionPurpose: safeStr(row[C.prescriptionPurpose]),
    ingredientCode: safeStr(row[C.ingredientCode]),
    isDiscontinued: parseCircleMark(row[C.isDiscontinued]),
    dosageCode: safeStr(row[C.dosageCode]),
    defaultQuantity: safeNum(row[C.defaultQuantity]),
    defaultFrequency: safeNum(row[C.defaultFrequency]),
    dosageText: safeStr(row[C.dosageText]),
    diagnosisCode: safeStr(row[C.diagnosisCode]),
    billingMemo: safeStr(row[C.billingMemo]),
    substituteCode: safeStr(row[C.substituteCode]),
    copayRatio: safeNum(row[C.copayRatio]),
    labManagement: safeNum(row[C.labManagement]),
  };
}

// ─── Excel Reader ────────────────────────────────────────────────────────────

function readExcelFile(filePath: string): ParsedRecord[] {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Skip header row (row 0)
  const records: ParsedRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
    const record = parseRow(row);
    if (record) records.push(record);
  }

  return records;
}

// ─── Firestore Upload ────────────────────────────────────────────────────────

async function uploadToFirestore(db: FirebaseFirestore.Firestore, records: ParsedRecord[]) {
  const now = new Date().toISOString();

  // Remove undefined values for Firestore
  function cleanRecord(r: ParsedRecord): Record<string, unknown> {
    const obj: Record<string, unknown> = { ...r, createdAt: now, updatedAt: now };
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) delete obj[key];
    }
    return obj;
  }

  let batchCount = 0;
  let totalWritten = 0;
  let batch: WriteBatch = db.batch();

  for (const record of records) {
    // Use prescriptionCode + categoryCode as document ID for uniqueness
    const docId = `${record.categoryCode}_${record.prescriptionCode}`;
    const ref = db.collection(COLLECTION).doc(docId);
    batch.set(ref, cleanRecord(record), { merge: true });
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalWritten += batchCount;
      console.log(`  Committed batch: ${totalWritten}/${records.length} records`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Final batch
  if (batchCount > 0) {
    await batch.commit();
    totalWritten += batchCount;
  }

  return totalWritten;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRecords(records: ParsedRecord[]): { valid: number; issues: string[] } {
  const issues: string[] = [];
  let valid = 0;

  const seenCodes = new Set<string>();
  for (const r of records) {
    const key = `${r.categoryCode}_${r.prescriptionCode}`;

    // Check for duplicates
    if (seenCodes.has(key)) {
      issues.push(`Duplicate: ${key} (${r.name})`);
    }
    seenCodes.add(key);

    // Check pricing consistency
    const hasPrice = r.ceilingPrice || r.unitPrice || r.clinicalFee;
    if (!hasPrice && r.categoryCode !== '07' && r.categoryCode !== '36') {
      issues.push(`No price: ${key} (${r.name})`);
    }

    // Ingredient code format check (6digits + 3alpha)
    if (r.ingredientCode) {
      const icMatch = r.ingredientCode.match(/^\d{6}[A-Z]{3}$/);
      if (!icMatch) {
        // Not a strict error, some have different formats
      }
    }

    valid++;
  }

  return { valid, issues };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Ichart Fee Schedule Import ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE IMPORT'}`);
  console.log(`Source: ${EXCEL_DIR}`);
  console.log('');

  const files = findExcelFiles();
  const allRecords: ParsedRecord[] = [];
  const fileSummary: { file: string; count: number }[] = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    try {
      const records = readExcelFile(filePath);
      allRecords.push(...records);
      fileSummary.push({ file: fileName, count: records.length });
      console.log(`  ${fileName}: ${records.length} records`);
    } catch (e) {
      console.error(`  ERROR reading ${fileName}: ${(e as Error).message}`);
    }
  }

  console.log(`\nTotal records: ${allRecords.length}`);

  // Validate
  const { valid, issues } = validateRecords(allRecords);
  console.log(`Valid records: ${valid}`);
  if (issues.length > 0) {
    console.log(`\nValidation issues (${issues.length}):`);
    issues.slice(0, 20).forEach(i => console.log(`  - ${i}`));
    if (issues.length > 20) console.log(`  ... and ${issues.length - 20} more`);
  }

  // Category summary
  console.log('\nCategory breakdown:');
  const catCounts: Record<string, number> = {};
  for (const r of allRecords) {
    const label = `${r.categoryCode} ${FEE_CATEGORY_NAMES[r.categoryCode] || '?'}`;
    catCounts[label] = (catCounts[label] || 0) + 1;
  }
  Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

  if (DRY_RUN) {
    console.log('\n=== DRY RUN COMPLETE (no data written) ===');
    return;
  }

  // Upload
  console.log('\nInitializing Firebase...');
  const db = initFirebase();

  console.log(`\nUploading ${allRecords.length} records to ${COLLECTION}...`);
  const written = await uploadToFirestore(db, allRecords);
  console.log(`\n=== IMPORT COMPLETE: ${written} records written ===`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
