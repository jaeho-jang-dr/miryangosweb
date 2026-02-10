/**
 * Clinical 시스템용 Firebase 설정
 *
 * NOTE: 현재는 public과 동일한 프로젝트를 사용하지만,
 * 향후 별도 Firebase 프로젝트로 분리할 수 있도록 모듈 분리
 *
 * @deprecated 새 코드에서는 firebase-config.ts의 getFirebaseInstance('clinical')를 사용하세요
 * 기존 코드 호환성을 위해 유지
 */

import { getFirebaseInstance } from './firebase-config';

const instance = getFirebaseInstance('clinical');

export const app = instance.app;
export const auth = instance.auth;
export const db = instance.db;
export const storage = instance.storage;
