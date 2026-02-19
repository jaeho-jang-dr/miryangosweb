import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// 초기화 상태 추적 (중복 초기화 방지)
let initializationError: Error | null = null;
let isInitialized = false;

export function initAdmin() {
    if (isInitialized) return;
    if (getApps().length > 0) {
        isInitialized = true;
        return;
    }

    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    try {
        // Try 1: Environment variable (프로덕션 권장)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            let serviceAccount: unknown;
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            } catch {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
            }
            const credential = cert(serviceAccount as Parameters<typeof cert>[0]);
            initializeApp({ credential, storageBucket });
            isInitialized = true;
            console.log('Firebase Admin initialized with service account (env)');
            return;
        }

        // Try 2: Local file (개발 환경용)
        if (process.env.NODE_ENV !== 'production') {
            const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
            if (fs.existsSync(serviceAccountPath)) {
                let serviceAccount: unknown;
                try {
                    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                } catch {
                    throw new Error('firebase-service-account.json is not valid JSON');
                }
                const credential = cert(serviceAccount as Parameters<typeof cert>[0]);
                initializeApp({ credential, storageBucket });
                isInitialized = true;
                console.log('Firebase Admin initialized with service account (file)');
                return;
            }
        }

        // Try 3: Application Default Credentials (GCP 환경)
        initializeApp({ storageBucket });
        isInitialized = true;
        console.log('Firebase Admin initialized with application default credentials');

    } catch (error) {
        initializationError = error instanceof Error ? error : new Error('Firebase Admin initialization failed');
        console.error('Failed to initialize Firebase Admin:', initializationError.message);
        // throw하여 호출자가 명확히 오류를 인지하도록
        throw initializationError;
    }
}

/**
 * 초기화 오류 확인 (선택적)
 */
export function getInitializationError(): Error | null {
    return initializationError;
}

// Helper accessors that ensure initialization
export const adminStorage = () => {
    initAdmin();
    return getStorage();
};

export const adminAuth = () => {
    initAdmin();
    return getAuth();
};

export const adminDb = () => {
    initAdmin();
    return getFirestore();
};
