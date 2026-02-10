/**
 * Public CMS용 Firebase 설정
 *
 * 메모리 캐시와 long polling을 사용하여 안정적인 연결 제공
 *
 * @deprecated 새 코드에서는 firebase-config.ts의 getFirebaseInstance('public')를 사용하세요
 * 기존 코드 호환성을 위해 유지
 */

import { getFirebaseInstance } from './firebase-config';

const instance = getFirebaseInstance('public');

export const app = instance.app;
export const auth = instance.auth;
export const db = instance.db;
export const storage = instance.storage;
