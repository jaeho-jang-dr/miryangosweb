
export type ClinicalStatus = 'reception' | 'consulting' | 'testing' | 'treatment' | 'completed' | 'paid';

export interface Patient {
    id: string;
    name: string;
    rrn: string; // Keep this secure in backend if possible, but for dev we store as is
    gender: 'male' | 'female';
    birthDate: string; // YYYY-MM-DD
    phone: string;
    address?: string;
    memo?: string; // Critical alert like "Penicillin Allergy"
    lastVisit?: any; // Firestore Timestamp
    createdAt: any;
}

export interface Visit {
    id: string;
    patientId: string;
    patientName: string; // Denormalized for easy display
    date: any; // Timestamp
    status: ClinicalStatus;
    doctorName?: string; // 담당의 이름 / Attending physician
    testResult?: string; // Lab/Imaging Result
    testStatus?: 'ordered' | 'processing' | 'completed';
    type: 'new' | 'return'; // New patient or existing
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

    createdAt: any;
    updatedAt: any;
}

export interface MedicalOrder {
    id: string;
    visitId: string;
    type: 'medication' | 'injection' | 'test' | 'procedure';
    name: string;
    status: 'ordered' | 'completed' | 'cancelled';
    performerId?: string; // Who did it
    createdAt: any;
}
