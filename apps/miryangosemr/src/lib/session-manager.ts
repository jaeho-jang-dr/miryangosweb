/**
 * Session Manager — 동시 세션 제한
 * 사용자당 1개 활성 세션만 허용
 *
 * Firestore `sessions/{userId}` 에 세션 정보 기록
 * 60초 간격 유효성 검사 — 다른 기기 로그인 시 강제 로그아웃
 */

import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SESSION_COLLECTION = 'sessions';

function generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

let currentSessionId: string | null = null;

/**
 * Register a new session for the user. Replaces any existing session.
 */
export async function registerSession(userId: string): Promise<string> {
    const sessionId = generateSessionId();
    currentSessionId = sessionId;

    await setDoc(doc(db, SESSION_COLLECTION, userId), {
        sessionId,
        userId,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });

    return sessionId;
}

/**
 * Check if the current session is still valid.
 * Returns false if another session has replaced this one.
 */
export async function validateSession(userId: string): Promise<boolean> {
    if (!currentSessionId) return false;

    try {
        const snap = await getDoc(doc(db, SESSION_COLLECTION, userId));
        if (!snap.exists()) return false;

        const data = snap.data();
        if (data.sessionId !== currentSessionId) {
            // Another session has taken over
            currentSessionId = null;
            return false;
        }

        // Update last active timestamp
        await setDoc(doc(db, SESSION_COLLECTION, userId), {
            lastActiveAt: serverTimestamp(),
        }, { merge: true });

        return true;
    } catch (e) {
        console.warn('[SessionManager] Validation error:', e);
        return true; // Fail-open to avoid locking users out on network issues
    }
}

/**
 * Remove the current session (on logout)
 */
export async function removeSession(userId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, SESSION_COLLECTION, userId));
    } catch (e) {
        console.warn('[SessionManager] Remove error:', e);
    }
    currentSessionId = null;
}

/**
 * Get current session ID (for reference)
 */
export function getCurrentSessionId(): string | null {
    return currentSessionId;
}
