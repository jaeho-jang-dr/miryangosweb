import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'; // Optional if needed
import * as fs from 'fs';
import * as path from 'path';

export function initAdmin() {
    if (getApps().length === 0) {
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        
        try {
            let credential;
            
            // Try 1: Environment variable
            if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                credential = cert(serviceAccount);
            }
            // Try 2: Local file
            else {
                const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
                if (fs.existsSync(serviceAccountPath)) {
                    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                    credential = cert(serviceAccount);
                }
            }

            const config = {
                credential,
                storageBucket
            };

            if (credential) {
                initializeApp(config);
                console.log('Firebase Admin initialized with service account');
            } else {
                initializeApp({ storageBucket });
                console.log('Firebase Admin initialized with default credentials');
            }
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
            // 초기화 실패 시 에러를 전파하여 후속 호출이 명확한 원인을 파악할 수 있도록 함
            throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
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
