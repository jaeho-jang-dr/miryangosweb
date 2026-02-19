'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Session timeout hook — 의료법 제23조 보안 요구사항
 * 일정 시간 동안 사용자 활동이 없으면 콜백(로그아웃)을 실행합니다.
 *
 * @param onTimeout  타임아웃 시 실행할 함수 (e.g. signOut)
 * @param timeoutMs  비활동 타임아웃 (밀리초, 기본 30분)
 * @param warningMs  경고 표시 시점 (타임아웃 전 밀리초, 기본 5분 전)
 */
export function useSessionTimeout(
  onTimeout: () => void,
  timeoutMs: number = 30 * 60 * 1000,  // 30분
  warningMs: number = 5 * 60 * 1000,   // 5분 전 경고
  options?: {
    /** Callback for session validation check (every 60s). Return false to force logout. */
    validateSession?: () => Promise<boolean>;
  },
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // options?.validateSession을 ref로 안정화 → 불필요한 Effect 재실행 방지
  const validateSessionRef = useRef(options?.validateSession);
  useEffect(() => {
    validateSessionRef.current = options?.validateSession;
  }, [options?.validateSession]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    // Warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.floor(warningMs / 1000));
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

    // Logout timer
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      onTimeout();
    }, timeoutMs);
  }, [onTimeout, timeoutMs, warningMs, clearTimers]);

  const dismissWarning = useCallback(() => {
    resetTimer(); // User activity — reset everything
  }, [resetTimer]);

  // Session validation check (every 60s) — concurrent session detection
  // validateSessionRef 사용으로 의존성 배열에서 options?.validateSession 제거 → 안정적인 effect
  useEffect(() => {
    const interval = setInterval(async () => {
      const validate = validateSessionRef.current;
      if (!validate) return;
      const valid = await validate();
      if (!valid) {
        clearTimers();
        onTimeout();
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [onTimeout, clearTimers]); // validateSession은 ref로 추적하므로 의존성 불필요

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;

    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    resetTimer(); // Start on mount

    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
      clearTimers();
    };
  }, [resetTimer, clearTimers, showWarning]);

  return { showWarning, remainingSeconds, dismissWarning };
}
