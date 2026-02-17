import { Timestamp } from 'firebase/firestore';

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
    createdAt?: { seconds: number; nanoseconds: number } | Date | string;
}
