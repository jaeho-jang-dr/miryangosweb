/**
 * Public CMS용 Firebase 설정
 *
 * 메모리 캐시와 long polling을 사용하여 안정적인 연결 제공
 */

import { getFirebaseInstance } from './firebase-config';

const instance = getFirebaseInstance('public');

export const app = instance.app;
export const auth = instance.auth;
export const db = instance.db;
export const storage = instance.storage;
