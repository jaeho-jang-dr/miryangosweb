/**
 * Ichart 38-column unified fee schedule schema
 * Maps directly to the 31 Excel master data files (3,623 records)
 *
 * Category codes: 01초진 ~ 36기타
 * Code patterns: AA### (visits), MM### (PT), N/O/Q/S#### (procedures),
 *                G#### (radiology), C/E/D/B#### (labs), K####### (materials)
 */

/** Category codes matching Ichart 구분명칭 */
export type FeeCategory =
  | '01' | '02' | '03' | '05' | '06' | '07' | '08' | '09'
  | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17'
  | '18' | '19' | '20' | '21' | '22' | '23' | '28' | '29'
  | '31' | '32' | '33' | '34' | '35' | '36';

export const FEE_CATEGORY_NAMES: Record<FeeCategory, string> = {
  '01': '초진료',
  '02': '재진료',
  '03': '응급관리',
  '05': '내복약',
  '06': '외용약',
  '07': '처방전',
  '08': '근육주',
  '09': '정맥주',
  '10': '수액제',
  '11': '기타주',
  '12': 'IVSide',
  '13': '특정재료',
  '14': '마취료',
  '15': '이학요법',
  '16': '정신치료',
  '17': '처치료',
  '18': '수술료',
  '19': '수혈료',
  '20': '캐스트',
  '21': '기능검사',
  '22': '기타검사',
  '23': '방사선진단',
  '28': '기타입원',
  '29': '식대',
  '31': '보조기',
  '32': '확인수수',
  '33': '호송료',
  '34': '초음파',
  '35': '병실차액',
  '36': '기타',
};

/** Code classifier types */
export type CodeClassifier = '수가' | '치료재료' | '협약재료';

/** Consignment method */
export type ConsignmentMethod = '검체위탁' | '위탁진료';

/** Consignment category */
export type ConsignmentCategory = '의원' | '병원' | '종합' | '기타' | '100/100';

/**
 * Full 38-column FeeScheduleItem matching Ichart Excel schema
 * Firestore collection: fee_schedule_items
 */
export interface FeeScheduleItemFull {
  // Identity
  id: string;                         // Firestore document ID
  prescriptionCode: string;           // col 0: 처방코드
  hiraCode: string;                   // col 1: 연합코드 (HIRA unified)
  name: string;                       // col 2: 처방명칭 (한글)
  ex?: number;                        // col 3: EX (extended value)

  // Classification
  categoryCode: FeeCategory;          // col 4: 구분코드 (extracted from 구분명칭)
  categoryName: string;               // col 4: 구분명칭 (full, e.g. "05내복약")
  effectiveDate: string;              // col 5: 적용일자 (YYYY.MM.DD)

  // 3-Tier Pricing
  ceilingPrice?: number;              // col 6: 상한가 (KRW, primarily drugs)
  unitPrice?: number;                 // col 7: 단가 (KRW)
  clinicalFee?: number;               // col 8: 진료가 (points, primarily procedures)
  surcharge?: number;                 // col 9: 가산

  // Flags
  cFlag: number;                      // col 10: C (1=standard, 7=special, 8=material)
  w1Flag?: number;                    // col 11: W1 (consignment multiplier 1)
  w2Flag?: number;                    // col 12: W2 (consignment multiplier 2)
  hFlag?: boolean;                    // col 13: H (hospital-level)
  pFlag?: boolean;                    // col 14: P (pharmacy dispensing)
  mFlag?: boolean;                    // col 15: M (additional modifier)
  iFlag?: number;                     // col 16: I (unused)

  // Code classification
  codeClassifier?: CodeClassifier;    // col 17: 코드구분자
  consignmentMethod?: ConsignmentMethod; // col 18: 위탁방식
  consignmentCategory?: ConsignmentCategory; // col 19: 위탁구분

  // Drug-specific flags
  isPsychotropic: boolean;            // col 20: 향정
  isNarcotic: boolean;                // col 21: 마약
  isRequired: boolean;                // col 22: 필수
  isDementia?: boolean;               // col 23: 치매
  isDialysis?: boolean;               // col 24: 투석

  // Search & classification
  searchIndex?: string;               // col 25: 검색색인
  prescriptionPurpose?: string;       // col 26: 처방용도
  ingredientCode?: string;            // col 27: 성분코드 (6digits+3alpha)
  isDiscontinued?: boolean;           // col 28: 중지

  // Dosage defaults
  dosageCode?: string;                // col 29: 용법코드
  defaultQuantity?: number;           // col 30: 처방수량
  defaultFrequency?: number;          // col 31: 처방횟수
  dosageText?: string;                // col 32: 용법

  // Associations
  diagnosisCode?: string;             // col 33: 병명코드 (KCD)
  billingMemo?: string;               // col 34: 청구메모
  substituteCode?: string;            // col 35: 대체코드
  copayRatio?: number;                // col 36: 본인부담률 (0.5/0.8/0.9)
  labManagement?: number;             // col 37: 검사관리

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/** Diagnosis code (KCD) */
export interface DiagnosisCode {
  id: string;
  code: string;                       // KCD code (e.g. M23.87)
  classificationCode: string;         // 분류기호
  nameKr: string;                     // 한글 병명
  nameEn?: string;                    // 영문 병명
  department?: string;                // 진료과목 (e.g. "05")
  searchIndex?: string;               // 검색색인
  isPrimary?: boolean;                // 주병명 여부
  flagA?: string;                     // A flag
  flagB?: string;                     // B flag
  flagC?: string;                     // C flag
}

/** Bundle prescription template */
export interface BundlePrescription {
  id: string;
  bundleCode: string;                 // 묶음코드
  name: string;                       // 묶음명칭
  searchIndex: string;                // 검색색인
  userId?: string;                    // 사용자(의사) ID
  userName?: string;                  // 사용자 이름
  items: BundlePrescriptionItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BundlePrescriptionItem {
  order: number;                      // 순번
  prescriptionCode: string;           // 처방코드
  name: string;                       // 처방명칭
  quantity: number;                   // 수량
  frequency: number;                  // 횟수
  days?: number;                      // 일수
  dosage?: string;                    // 용법
}

/** Excel column index mapping (0-based) for import script */
export const EXCEL_COLUMN_MAP = {
  prescriptionCode: 0,
  hiraCode: 1,
  name: 2,
  ex: 3,
  categoryName: 4,
  effectiveDate: 5,
  ceilingPrice: 6,
  unitPrice: 7,
  clinicalFee: 8,
  surcharge: 9,
  cFlag: 10,
  w1Flag: 11,
  w2Flag: 12,
  hFlag: 13,
  pFlag: 14,
  mFlag: 15,
  iFlag: 16,
  codeClassifier: 17,
  consignmentMethod: 18,
  consignmentCategory: 19,
  isPsychotropic: 20,
  isNarcotic: 21,
  isRequired: 22,
  isDementia: 23,
  isDialysis: 24,
  searchIndex: 25,
  prescriptionPurpose: 26,
  ingredientCode: 27,
  isDiscontinued: 28,
  dosageCode: 29,
  defaultQuantity: 30,
  defaultFrequency: 31,
  dosageText: 32,
  diagnosisCode: 33,
  billingMemo: 34,
  substituteCode: 35,
  copayRatio: 36,
  labManagement: 37,
} as const;
