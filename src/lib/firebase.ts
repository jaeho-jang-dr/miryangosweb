/**
 * 기본 Firebase 설정
 *
 * @deprecated 새 코드에서는 firebase-config.ts의 getFirebaseInstance('default')를 사용하세요
 * 기존 코드 호환성을 위해 유지
 */

import { getFirebaseInstance } from './firebase-config';

const instance = getFirebaseInstance('default');

export const app = instance.app;
export const auth = instance.auth;
export const db = instance.db;
export const storage = instance.storage;
