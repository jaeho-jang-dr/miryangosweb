
import { Timestamp } from 'firebase/firestore';
import type { EncryptedField, DigitalSignature } from './security';

export type ClinicalStatus = 'reception' | 'consulting' | 'testing' | 'treatment' | 'completed' | 'paid';

export interface Patient {
    id: string;
    name: string;
    rrn: string; // Plaintext (legacy) — will be migrated to rrnEncrypted
    gender: 'male' | 'female';
    birthDate: string; // YYYY-MM-DD
    phone: string;
    address?: string;
    memo?: string; // Critical alert like "Penicillin Allergy"
    lastVisit?: Timestamp; // Firestore Timestamp
    createdAt: Timestamp;

    // Security fields (Phase 1)
    rrnEncrypted?: EncryptedField;  // AES-256-GCM encrypted RRN
    rrnMasked?: string;             // e.g. "900101-1******"
    phoneEncrypted?: EncryptedField;
    phoneMasked?: string;           // e.g. "010-****-5678"
}

export interface Visit {
    id: string;
    patientId: string;
    patientName: string; // Denormalized for easy display
    date: Timestamp; // Timestamp
    status: ClinicalStatus;
    doctorName?: string; // 담당의 이름 / Attending physician
    testResult?: string; // Lab/Imaging Result
    testStatus?: 'ordered' | 'processing' | 'completed';
    type: 'new' | 'return'; // New patient or existing
    parentVisitId?: string; // 초진추가 시 원래 재진 visit ID
    insuranceType?: 'nhis' | 'auto' | 'none'; // National Health, Auto Insurance, etc.

    // Clinical Data (Target for STT)
    chiefComplaint?: string; // CC
    history?: string; // History of Present Illness
    symptoms?: string[];
    physicalExam?: string; // Objective (Physical Exam / Lab)
    testOrder?: string;    // Objective (Orders)
    diagnosis?: string;

    // Plan/Orders
    prescription?: string;
    treatmentNote?: string;
    physicalTherapy?: string; // 물리치료 기록

    images?: string[];

    // Structured Orders (New)
    orders?: MedicalOrder[];

    // Workflow tracking
    statusChangedAt?: Timestamp; // When status last changed (for timeout logic)

    createdAt: Timestamp;
    updatedAt: Timestamp;

    // Security fields (Phase 1)
    signature?: DigitalSignature;   // Phase 2: Electronic signature on completion
}

export interface MedicalDocument {
    id: string;
    visitId: string;
    patientId: string;
    type: 'diagnosis' | 'opinion' | 'confirmation' | 'receipt' | 'receipt_detail' | 'chart_copy';
    content: {
        diagnosis_name?: string;
        diagnosis_code?: string;
        opinion_text?: string;
        visit_purpose?: string;
        amount_total?: number;
        amount_paid?: number;
        [key: string]: any;
    };
    issuedAt: Timestamp;
    issuedBy: string;
}


export interface MedicalOrder {
    id: string;
    visitId: string;
    type: 'medication' | 'injection' | 'test' | 'procedure' | 'pt' | 'surgical';
    name: string;
    status: 'ordered' | 'completed' | 'cancelled';
    performerId?: string; // Who did it
    createdAt: Timestamp;
}

// ─── Chart Version (Phase 5) ────────────────────────────────

export interface ChartVersion {
    id: string;
    visitId: string;
    savedBy: string;       // userId
    savedByName?: string;  // display name
    savedAt: Timestamp;
    snapshot: {
        chiefComplaint?: string;
        physicalExam?: string;
        testOrder?: string;
        testResult?: string;
        diagnosis?: string;
        treatmentNote?: string;
        orders?: MedicalOrder[];
        images?: string[];
    };
}

// ─── Treatment Execution (Phase 2 Enhancement) ──────────────

export interface TreatmentExecution {
    id: string;
    modality: string;      // e.g. '핫팩 20분', '간섭파치료(ICT) 15분'
    status: 'pending' | 'in_progress' | 'completed';
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    performerId?: string;
    performerName?: string;
    durationMinutes?: number; // Expected duration parsed from modality name
}
