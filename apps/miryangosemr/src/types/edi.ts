/**
 * HIRA EDI XML 타입 정의
 * 건강보험심사평가원 EDI 청구서 형식
 */

export interface EdiHeader {
  submitDate: string;          // YYYYMMDD
  institutionCode: string;     // 요양기관 기호 (8자리)
  institutionName: string;     // 요양기관명
  prescriberName: string;      // 청구담당자명
  totalClaimCount: number;     // 총 청구 건수
  totalAmount: number;         // 총 청구 금액
  claimMonth: string;          // 진료년월 YYYYMM
}

export interface EdiPatient {
  patientId: string;
  patientName: string;
  birthDate: string;           // YYYYMMDD
  gender: 'M' | 'F';
  insuranceType: string;       // 보험 유형 코드
  insuranceId: string;         // 보험증 번호
}

export interface EdiDiagnosis {
  kcdCode: string;             // KCD 진단 코드
  kcdName: string;
  isPrimary: boolean;
}

export interface EdiMedication {
  drugCode: string;            // 약품 코드
  drugName: string;
  quantity: number;
  days: number;
  unitPrice: number;
}

export interface EdiProcedure {
  procedureCode: string;       // 행위 코드
  procedureName: string;
  quantity: number;
  unitPrice: number;
}

export interface EdiVisitDetail {
  visitDate: string;           // YYYYMMDD
  diagnoses: EdiDiagnosis[];
  medications: EdiMedication[];
  procedures: EdiProcedure[];
  patientCharge: number;       // 환자 부담금
  insuranceClaim: number;      // 보험 청구금
}

export interface EdiClaimItem {
  claimId: string;
  patient: EdiPatient;
  visits: EdiVisitDetail[];
  totalAmount: number;
  claimAmount: number;
  patientAmount: number;
}

export interface EdiClaimDocument {
  header: EdiHeader;
  claims: EdiClaimItem[];
}

export type EdiSubmitResult = {
  success: boolean;
  xmlContent: string;
  fileName: string;
  claimCount: number;
  totalAmount: number;
  message: string;
};
