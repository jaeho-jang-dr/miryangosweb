import { Timestamp } from 'firebase/firestore';

/** 병실 유형 */
export type RoomType = 'general' | 'vip' | 'icu' | 'recovery';

/** 입원 경로 */
export type AdmissionRoute = 'outpatient' | 'emergency' | 'transfer' | 'other';

/** 입원 상태 */
export type AdmissionStatus = 'admitted' | 'discharged' | 'transferred' | 'deceased';

/** 병실 정보 */
export interface Room {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  bedCount: number;
  currentOccupancy: number;
  dailyRate: number;
  isActive: boolean;
  description?: string;
}

/** 병상 정보 */
export interface Bed {
  id: string;
  roomId: string;
  bedNumber: string;
  isOccupied: boolean;
  patientId?: string;
  patientName?: string;
}

/** 입원 기록 */
export interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  chartNo?: string;

  // 입원 정보
  admissionDate: Timestamp;
  admissionRoute: AdmissionRoute;
  admittingDoctorName: string;
  diagnosis: string;
  diagnosisCode?: string;

  // 병실 배정
  roomId: string;
  roomNumber: string;
  bedId?: string;
  bedNumber?: string;
  roomType: RoomType;

  // 보험 정보
  insuranceType: 'nhis' | 'auto' | 'industrial' | 'none';
  drgCode?: string;

  // 퇴원 정보
  dischargeDate?: Timestamp;
  dischargeReason?: string;
  status: AdmissionStatus;

  // 청구 기간
  billingPeriodStart?: Timestamp;
  billingPeriodEnd?: Timestamp;

  // 메타
  memo?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 입원 환자 일일 기록 */
export interface DailyInpatientRecord {
  id: string;
  admissionId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  doctorNote?: string;
  nursingNote?: string;
  vitalSigns?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    respRate?: number;
  };
  orders?: string[];
  createdAt: Timestamp;
}

/** 재원 현황 요약 */
export interface CensusSnapshot {
  date: string;
  totalBeds: number;
  occupiedBeds: number;
  admittedToday: number;
  dischargedToday: number;
  occupancyRate: number;
}

/** 병실 유형 라벨 */
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  general: '일반실',
  vip: '특실',
  icu: '중환자실',
  recovery: '회복실',
};

/** 입원 경로 라벨 */
export const ADMISSION_ROUTE_LABELS: Record<AdmissionRoute, string> = {
  outpatient: '외래',
  emergency: '응급',
  transfer: '전원',
  other: '기타',
};

/** 입원 상태 라벨 */
export const ADMISSION_STATUS_LABELS: Record<AdmissionStatus, string> = {
  admitted: '재원',
  discharged: '퇴원',
  transferred: '전원',
  deceased: '사망',
};
