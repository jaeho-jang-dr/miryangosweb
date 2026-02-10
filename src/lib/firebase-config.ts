/**
 * Firebase 통합 설정 파일
 *
 * 여러 Firebase 앱 인스턴스를 관리하고 초기화합니다.
 * - default: 기본 Firebase 앱
 * - public: 공개 CMS용 (메모리 캐시, long polling)
 * - clinical: 임상 시스템용 (향후 별도 프로젝트 분리 예정)
 */

import {
    initializeApp,
    getApps,
    getApp,
    FirebaseApp
} from "firebase/app";
import {
    getAuth,
    Auth
} from "firebase/auth";
import {
    getFirestore,
    Firestore,
    initializeFirestore,
    memoryLocalCache
} from "firebase/firestore";
import {
    getStorage,
    FirebaseStorage
} from "firebase/storage";

// Firebase 설정 (모든 앱에서 공통 사용)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 앱 타입 정의
export type FirebaseAppType = 'default' | 'public' | 'clinical';

// Firebase 인스턴스 인터페이스
export interface FirebaseInstance {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    storage: FirebaseStorage;
}

// 초기화된 앱 캐시
const initializedApps = new Map<FirebaseAppType, FirebaseInstance>();

/**
 * Firebase 앱 초기화 및 인스턴스 반환
 *
 * @param type - 앱 타입 ('default', 'public', 'clinical')
 * @returns Firebase 인스턴스 (app, auth, db, storage)
 */
export function getFirebaseInstance(type: FirebaseAppType = 'default'): FirebaseInstance {
    // 캐시된 인스턴스가 있으면 반환
    if (initializedApps.has(type)) {
        return initializedApps.get(type)!;
    }

    let app: FirebaseApp;
    let db: Firestore;

    switch (type) {
        case 'public':
            // Public CMS용 - 메모리 캐시와 long polling 사용
            const publicAppName = "MIRYANG_CLIENT";
            const existingPublicApp = getApps().find(a => a.name === publicAppName);

            if (existingPublicApp) {
                app = existingPublicApp;
                db = getFirestore(app);
            } else {
                app = initializeApp(firebaseConfig, publicAppName);
                // WebSocket이 제한된 환경에서 안정적인 연결을 위해
                // experimentalForceLongPolling 사용
                db = initializeFirestore(app, {
                    localCache: memoryLocalCache(),
                    experimentalForceLongPolling: true,
                });
            }
            break;

        case 'clinical':
            // Clinical용 - 현재는 default와 동일하지만 향후 분리 가능
            // NOTE: 향후 별도 Firebase 프로젝트로 분리 시
            // NEXT_PUBLIC_CLINICAL_FIREBASE_* 환경 변수 사용 예정
            const clinicalApp = getApps().find(a => a.name === '[DEFAULT]');
            if (clinicalApp) {
                app = clinicalApp;
            } else {
                app = initializeApp(firebaseConfig);
            }
            db = getFirestore(app);
            break;

        case 'default':
        default:
            // 기본 앱 - 가장 단순한 설정
            if (!getApps().length) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }
            db = getFirestore(app);
            break;
    }

    // Auth와 Storage 초기화
    const auth = getAuth(app);
    const storage = getStorage(app);

    // 인스턴스 캐싱
    const instance: FirebaseInstance = { app, auth, db, storage };
    initializedApps.set(type, instance);

    return instance;
}

/**
 * 기본 Firebase 인스턴스 (backward compatibility)
 */
const defaultInstance = getFirebaseInstance('default');

export const app = defaultInstance.app;
export const auth = defaultInstance.auth;
export const db = defaultInstance.db;
export const storage = defaultInstance.storage;

// 타입별 인스턴스 export (편의성)
export const publicFirebase = () => getFirebaseInstance('public');
export const clinicalFirebase = () => getFirebaseInstance('clinical');
