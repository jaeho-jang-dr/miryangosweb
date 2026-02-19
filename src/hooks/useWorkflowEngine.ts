'use client';

/**
 * 워크플로우 엔진 React Hook
 *
 * clinical layout에 마운트되어 활성 visit들을 감시하고
 * 시간 기반 자동 전환 및 이벤트 기반 전환을 수행한다.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Visit, ClinicalStatus } from '@/types/clinical';
import {
    WORKFLOW_CONFIG,
    checkTimeoutTransition,
    findAutoCompletableTreatments,
    TransitionResult,
    getTransitionMessage,
} from '@/lib/workflow-engine';

export interface WorkflowToast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    timestamp: number;
}

export function useWorkflowEngine(options: {
    enabled?: boolean;
    onTransition?: (from: ClinicalStatus, to: ClinicalStatus, visitId: string, patientName: string) => void;
} = { enabled: true }) {
    const { enabled = true, onTransition } = options;
    const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
    const [toasts, setToasts] = useState<WorkflowToast[]>([]);
    const previousVisitsRef = useRef<Map<string, ClinicalStatus>>(new Map());
    const processingRef = useRef<Set<string>>(new Set());
    const toastTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    // ─── Toast 관리 ──────────────────────────────────────
    const addToast = useCallback((message: string, type: WorkflowToast['type'] = 'info') => {
        const toast: WorkflowToast = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            message,
            type,
            timestamp: Date.now(),
        };
        setToasts(prev => [...prev, toast]);

        // 5초 후 자동 제거 (타이머 추적으로 메모리 누수 방지)
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id));
            toastTimersRef.current.delete(timer);
        }, 5000);
        toastTimersRef.current.add(timer);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ─── Firestore 상태 전환 실행 ─────────────────────────
    const applyTransition = useCallback(async (
        visit: Visit,
        newStatus: ClinicalStatus,
        reason: TransitionResult['reason']
    ) => {
        // 중복 처리 방지
        if (processingRef.current.has(visit.id)) return;
        processingRef.current.add(visit.id);

        try {
            const updates: Record<string, unknown> = {
                status: newStatus,
                statusChangedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 치료 자동 완료 시 treatmentCompletedAt 추가
            if (newStatus === 'completed' && visit.status === 'treatment') {
                updates.treatmentCompletedAt = serverTimestamp();
            }

            await updateDoc(doc(db, 'visits', visit.id), updates);

            const result: TransitionResult = {
                visitId: visit.id,
                patientName: visit.patientName,
                from: visit.status,
                to: newStatus,
                reason,
            };

            const toastType = reason.includes('timeout') || reason === 'treatment_next_patient'
                ? 'warning'
                : 'success';

            addToast(getTransitionMessage(result), toastType);

            // Fire onTransition callback if provided
            if (onTransition) {
                try { onTransition(visit.status, newStatus, visit.id, visit.patientName); } catch {}
            }
        } catch (error) {
            console.error('[Workflow] Transition failed:', visit.id, error);
        } finally {
            processingRef.current.delete(visit.id);
        }
    }, [addToast, onTransition]);

    // ─── Toast 타이머 cleanup ─────────────────────────────
    useEffect(() => {
        const timers = toastTimersRef.current;
        return () => {
            timers.forEach(timer => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    // ─── Firestore 구독: 활성 visit 감시 ──────────────────
    useEffect(() => {
        if (!enabled) return;

        // testing, treatment 상태의 visit만 감시 (자동 전환 대상)
        const q = query(
            collection(db, 'visits'),
            where('status', 'in', ['consulting', 'testing', 'treatment'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as Visit[];

            setActiveVisits(visits);

            // 새 consulting 환자 감지 → 치료실 환자 자동 완료
            const currentStatuses = new Map(visits.map(v => [v.id, v.status]));
            const prevStatuses = previousVisitsRef.current;

            for (const [id, status] of currentStatuses) {
                const prevStatus = prevStatuses.get(id);
                // 새로 consulting 진입한 환자 감지
                if (status === 'consulting' && prevStatus !== 'consulting') {
                    // 치료실 환자들 자동 완료
                    const completableVisits = findAutoCompletableTreatments(visits, Date.now());
                    for (const tv of completableVisits) {
                        applyTransition(tv, 'completed', 'treatment_next_patient');
                    }
                    break; // 한 번만 실행
                }
            }

            previousVisitsRef.current = currentStatuses;
        });

        return () => unsubscribe();
    }, [applyTransition, enabled]);

    // ─── activeVisits ref for stable interval access ──────
    const activeVisitsRef = useRef(activeVisits);
    useEffect(() => {
        activeVisitsRef.current = activeVisits;
    }, [activeVisits]);

    // ─── 타이머: 주기적 타임아웃 체크 ─────────────────────
    useEffect(() => {
        if (!enabled) return;

        const intervalMs = WORKFLOW_CONFIG.checkIntervalSeconds * 1000;

        const timer = setInterval(() => {
            const now = Date.now();

            for (const visit of activeVisitsRef.current) {
                const transition = checkTimeoutTransition(visit, now);
                if (transition) {
                    applyTransition(visit, transition.status, transition.reason);
                }
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [applyTransition, enabled]);

    return {
        activeVisits,
        toasts,
        removeToast,
    };
}
