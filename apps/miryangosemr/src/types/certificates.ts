import { Timestamp } from 'firebase/firestore';

/** 제증명 12종 */
export type CertificateType =
  | 'diagnosis'           // 진단서
  | 'medical_opinion'     // 진료소견서
  | 'injury_diagnosis'    // 상해진단서
  | 'treatment_confirm'   // 진료확인서
  | 'doctor_opinion'      // 의사소견서 (노인장기요양)
  | 'referral'            // 진료의뢰서
  | 'disability'          // 장애진단서
  | 'residual_disability' // 후유장애진단서 (AMA)
  | 'work_capacity'       // 근로능력평가용 진단서
  | 'medical_aid_ext'     // 의료급여일수 연장승인 신청서
  | 'birth'               // 출생증명서
  | 'death';              // 사망진단서

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  diagnosis: '진단서',
  medical_opinion: '진료소견서',
  injury_diagnosis: '상해진단서',
  treatment_confirm: '진료확인서',
  doctor_opinion: '의사소견서',
  referral: '진료의뢰서',
  disability: '장애진단서',
  residual_disability: '후유장애진단서',
  work_capacity: '근로능력평가용 진단서',
  medical_aid_ext: '의료급여 연장신청서',
  birth: '출생증명서',
  death: '사망진단서',
};

/** Ichart 기준 정형외과 상용 양식 (빈도 순) */
export const COMMON_CERTIFICATE_TYPES: CertificateType[] = [
  'diagnosis',
  'treatment_confirm',
  'medical_opinion',
  'injury_diagnosis',
  'referral',
  'doctor_opinion',
];

/** 제증명 기본 인터페이스 */
export interface CertificateBase {
  id: string;
  type: CertificateType;
  serialNo: string;             // 발급번호 (YYYY-NNNN)
  patientId: string;
  patientName: string;
  patientRrn?: string;          // 주민등록번호 (masked)
  patientBirthDate?: string;
  patientGender?: 'male' | 'female';
  patientAddress?: string;
  patientPhone?: string;

  // 진단 정보
  diagnosisCodes: string[];     // KCD 코드
  diagnosisNames: string[];     // 한글 병명

  // 의사 정보
  doctorName: string;
  doctorLicenseNo: string;
  specialtyNo?: string;         // 전문의 번호

  // 발급 정보
  issueDate: string;            // YYYY-MM-DD
  purpose?: string;             // 용도

  // 상태
  status: 'draft' | 'issued' | 'voided';
  issuedAt?: Timestamp;
  voidedAt?: Timestamp;
  voidReason?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/** 진단서 */
export interface DiagnosisCertificate extends CertificateBase {
  type: 'diagnosis';
  content: {
    diseaseHistory: string;       // 병력
    condition: string;            // 현재 증상
    treatmentPlan: string;        // 치료 경과 및 향후 치료 의견
    onset: string;                // 발병일
    firstVisitDate?: string;      // 첫 내원일
    treatmentPeriod?: string;     // 치료 기간
    prognosis?: string;           // 예후
    restrictions?: string;        // 업무 제한 사항
  };
}

/** 진료소견서 */
export interface MedicalOpinionCertificate extends CertificateBase {
  type: 'medical_opinion';
  content: {
    opinion: string;              // 의사 소견
    treatmentHistory: string;     // 치료 내역
    currentStatus: string;        // 현재 상태
    recommendation: string;       // 권고 사항
    additionalTests?: string;     // 추가 검사 필요 여부
  };
}

/** 상해진단서 */
export interface InjuryDiagnosisCertificate extends CertificateBase {
  type: 'injury_diagnosis';
  content: {
    injurySite: string;           // 상해 부위
    injuryDegree: string;         // 상해 정도 (경도/중등도/중증)
    injuryCause: string;          // 상해 원인
    injuryDate: string;           // 상해 일시
    treatmentWeeks: number;       // 치료 필요 기간 (주)
    hospitalDays?: number;        // 입원 필요 일수
    outpatientDays?: number;      // 통원 필요 일수
    opinion: string;              // 소견
    aftercare?: string;           // 향후 치료 계획
  };
}

/** 진료확인서 */
export interface TreatmentConfirmCertificate extends CertificateBase {
  type: 'treatment_confirm';
  content: {
    treatmentPeriodStart: string; // 진료 기간 시작
    treatmentPeriodEnd: string;   // 진료 기간 종료
    visitDates: string[];         // 실 통원 일자 목록
    totalVisits: number;          // 총 내원 일수
    treatmentSummary: string;     // 치료 내용 요약
  };
}

/** 의사소견서 (노인장기요양) */
export interface DoctorOpinionCertificate extends CertificateBase {
  type: 'doctor_opinion';
  content: {
    diseaseGroup: string;         // 질환군 (치매, 뇌혈관 등)
    currentStatus: string;        // 현재 상태
    careLevel: string;            // 필요 수발 등급
    recommendation: string;       // 의사 의견
    functionalStatus: string;     // 일상생활 수행 능력
    cognitiveStatus?: string;     // 인지기능 상태
  };
}

/** 진료의뢰서 */
export interface ReferralCertificate extends CertificateBase {
  type: 'referral';
  content: {
    referToHospital: string;      // 의뢰 병원명
    referToDepartment: string;    // 의뢰 진료과
    referToDoctor?: string;       // 의뢰 의사
    referralReason: string;       // 의뢰 사유
    treatmentSummary: string;     // 현재까지 치료 내용
    testResults?: string;         // 검사 결과
    requestedExam?: string;       // 요청 검사/시술
    patientHistory: string;       // 환자 병력
  };
}

/** 장애진단서 */
export interface DisabilityCertificate extends CertificateBase {
  type: 'disability';
  content: {
    disabilityType: string;       // 장애 유형
    disabilityGrade: string;      // 장애 등급
    causeOfDisability: string;    // 장애 원인
    onsetDate: string;            // 장애 발생일
    clinicalFindings: string;     // 임상 소견
    functionalLimitations: string;// 기능 제한
    permanence: string;           // 영구성 여부
    romMeasurements?: RomMeasurement[]; // ROM 측정값
  };
}

/** 후유장애진단서 (AMA) */
export interface ResidualDisabilityCertificate extends CertificateBase {
  type: 'residual_disability';
  content: {
    accidentDate: string;         // 사고일
    accidentCause: string;        // 사고 원인
    treatmentHistory: string;     // 치료 경과
    residualSymptoms: string;     // 후유 증상
    impairmentRating: number;     // 장해율 (%)
    romMeasurements: RomMeasurement[];
    muscleStrength?: string;      // 근력 평가
    amaGuideEdition?: string;     // AMA 가이드 판수
    opinion: string;              // 소견
  };
}

/** 근로능력평가용 진단서 */
export interface WorkCapacityCertificate extends CertificateBase {
  type: 'work_capacity';
  content: {
    diseaseType: string;          // 질환 유형 (16종 중)
    workCapacityLevel: string;    // 근로능력 수준
    physicalCapacity: string;     // 신체 능력
    mentalCapacity?: string;      // 정신 능력
    restrictions: string;         // 근로 제한 사항
    opinion: string;              // 의사 소견
    evaluationDate: string;       // 평가일
  };
}

/** 의료급여 연장 신청서 */
export interface MedicalAidExtCertificate extends CertificateBase {
  type: 'medical_aid_ext';
  content: {
    currentDaysUsed: number;      // 현재 사용 일수
    requestedDays: number;        // 연장 요청 일수
    reason: string;               // 연장 사유
    treatmentPlan: string;        // 향후 치료 계획
    expectedDuration: string;     // 예상 치료 기간
  };
}

/** 출생증명서 */
export interface BirthCertificate extends CertificateBase {
  type: 'birth';
  content: {
    birthDateTime: string;        // 출생 일시
    birthPlace: string;           // 출생 장소
    birthWeight: number;          // 출생 체중 (g)
    birthLength?: number;         // 출생 신장 (cm)
    motherName: string;           // 모 성명
    fatherName?: string;          // 부 성명
    deliveryMethod: string;       // 분만 방법
    apgarScore?: string;          // Apgar 점수
  };
}

/** 사망진단서 */
export interface DeathCertificate extends CertificateBase {
  type: 'death';
  content: {
    deathDateTime: string;        // 사망 일시
    deathPlace: string;           // 사망 장소
    causeOfDeath: string;         // 직접 사인
    antecedentCause?: string;     // 선행 사인
    underlyingCause?: string;     // 원사인
    contributingConditions?: string; // 기여한 기타 상태
    mannerOfDeath: 'natural' | 'accident' | 'suicide' | 'homicide' | 'undetermined';
    externalCause?: string;       // 외인에 의한 경우
    autopsyPerformed?: boolean;   // 부검 여부
  };
}

/** ROM 측정값 */
export interface RomMeasurement {
  joint: string;                  // 관절명
  side: 'left' | 'right' | 'bilateral';
  movement: string;               // 운동 (굴곡/신전/내회전/외회전 등)
  activeRom: number;              // 능동 ROM (도)
  passiveRom?: number;            // 수동 ROM (도)
  normalRom: number;              // 정상 ROM (도)
  impairmentPercent?: number;     // 장해율 (%)
}

/** 모든 제증명 Union Type */
export type Certificate =
  | DiagnosisCertificate
  | MedicalOpinionCertificate
  | InjuryDiagnosisCertificate
  | TreatmentConfirmCertificate
  | DoctorOpinionCertificate
  | ReferralCertificate
  | DisabilityCertificate
  | ResidualDisabilityCertificate
  | WorkCapacityCertificate
  | MedicalAidExtCertificate
  | BirthCertificate
  | DeathCertificate;

/** 발급대장 요약 */
export interface CertificateIssuanceSummary {
  year: number;
  totalIssued: number;
  byType: Partial<Record<CertificateType, number>>;
  lastSerialNo: number;
}
