import { Timestamp } from 'firebase/firestore';

// Type guard: Firebase Timestamp 여부 확인
export function isFirestoreTimestamp(value: unknown): value is Timestamp {
    return (
        value !== null &&
        typeof value === 'object' &&
        'seconds' in (value as object) &&
        'nanoseconds' in (value as object)
    );
}

export interface ClinicInfo {
    name: string;
    phone: string;
    address: string;
    lunchTime: string;
    weekdayHours: string;
    saturdayHours: string;
    holidayInfo: string;
}

export interface Notice {
    id: string;
    title: string;
    content?: string;
    body?: string;
    createdAt?: Timestamp; // Timestamp
    isVisible: boolean;
}

export interface Article {
    id: string;
    title: string;
    content: string; // Markdown
    images: string[]; // Pollinations URLs
    type: 'disease' | 'general';
    isVisible: boolean;
    createdAt?: Timestamp | Date | string;
}
