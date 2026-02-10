/**
 * 진료 워크플로우 엔진
 *
 * 환자의 상태를 자동으로 전환하는 규칙 엔진.
 * 의사/간호사의 클릭을 최소화하고 자연스러운 흐름을 만든다.
 *
 * 흐름:
 *   접수(reception) → 진료실(consulting)
 *     → 검사실(testing) → 진료실(consulting)  [검사 필요 시]
 *     → 치료실(treatment) → 수납(completed) → 결제(paid)
 */

import { ClinicalStatus, Visit } from '@/types/clinical';

// ─── 워크플로우 설정 ───────────────────────────────────────
export const WORKFLOW_CONFIG = {
    /** 검사실 타임아웃: 결과 미입력 시 자동으로 진료실 복귀 (분) */
    testingTimeoutMinutes: 10,

    /** 치료실 타임아웃: 자동으로 수납 대기로 전환 (분) */
    treatmentTimeoutMinutes: 15,

    /** 치료실 최소 체류시간: 이보다 짧으면 자동완료하지 않음 (분) */
    treatmentMinStayMinutes: 3,

    /** 워크플로우 엔진 체크 주기 (초) */
    checkIntervalSeconds: 30,
};

// ─── 상태 전환 이유 (토스트 메시지용) ────────────────────────
export type TransitionReason =
    | 'test_ordered'          // 검사 오더 → 검사실
    | 'test_result_entered'   // 검사결과 입력 → 진료실
    | 'test_timeout'          // 검사 타임아웃 → 진료실
    | 'treatment_ordered'     // 치료 오더 → 치료실
    | 'treatment_timeout'     // 치료 타임아웃 → 수납
    | 'treatment_next_patient' // 다음 환자 호출 → 수납
    | 'manual';               // 수동 전환

export interface TransitionResult {
    visitId: string;
    patientName: string;
    from: ClinicalStatus;
    to: ClinicalStatus;
    reason: TransitionReason;
}

// ─── 상태 레이블 ──────────────────────────────────────────
export const STATUS_LABELS: Record<ClinicalStatus, string> = {
    reception: '접수실',
    consulting: '진료실',
    testing: '검사실',
    treatment: '치료실',
    completed: '수납대기',
    paid: '완료',
};

// ─── 전환 이유 메시지 ─────────────────────────────────────
export function getTransitionMessage(result: TransitionResult): string {
    const { patientName, to, reason } = result;
    const dest = STATUS_LABELS[to];

    switch (reason) {
        case 'test_ordered':
            return `${patientName}님 → ${dest} (검사 오더)`;
        case 'test_result_entered':
            return `${patientName}님 → ${dest} (검사결과 입력완료)`;
        case 'test_timeout':
            return `${patientName}님 → ${dest} (검사 대기시간 초과)`;
        case 'treatment_ordered':
            return `${patientName}님 → ${dest} (치료 오더)`;
        case 'treatment_timeout':
            return `${patientName}님 → ${dest} (치료시간 경과)`;
        case 'treatment_next_patient':
            return `${patientName}님 → ${dest} (다음 환자 진료 시작)`;
        default:
            return `${patientName}님 → ${dest}`;
    }
}

// ─── 핵심: 저장 시 다음 상태 결정 ─────────────────────────
/**
 * 의사가 "저장" 또는 "완료" 버튼을 눌렀을 때 다음 상태를 자동으로 결정한다.
 *
 * Rules:
 * 1. 검사 오더가 있고, 결과가 아직 없으면 → testing
 * 2. 치료/처방이 있고, (검사 없거나 검사 완료) → treatment
 * 3. 그 외 → null (변경 없음)
 */
export function determineNextStatus(
    visit: Partial<Visit> & { status: ClinicalStatus }
): { status: ClinicalStatus; reason: TransitionReason } | null {
    const { status, testOrder, testResult, testStatus, treatmentNote } = visit;

    if (status !== 'consulting') return null;

    // Rule 1: 검사 오더 있고 결과 미입력 → 검사실로
    const hasTestOrder = testOrder?.trim();
    const hasTestResult = testResult?.trim();
    const testCompleted = testStatus === 'completed';

    if (hasTestOrder && !hasTestResult && !testCompleted) {
        return { status: 'testing', reason: 'test_ordered' };
    }

    // Rule 2: 치료 오더 있고 (검사 없거나 검사 완료) → 치료실로
    const hasTreatment = treatmentNote?.trim();
    const noTestNeeded = !hasTestOrder;
    const testDone = testCompleted || !!hasTestResult;

    if (hasTreatment && (noTestNeeded || testDone)) {
        return { status: 'treatment', reason: 'treatment_ordered' };
    }

    return null;
}

// ─── 타임아웃 기반 자동 전환 체크 ──────────────────────────
/**
 * 주기적으로 호출되어 시간 초과된 visit의 상태를 전환한다.
 */
export function checkTimeoutTransition(
    visit: Visit,
    now: number
): { status: ClinicalStatus; reason: TransitionReason } | null {
    // statusChangedAt 또는 updatedAt 기준으로 경과시간 계산
    const changedAt = visit.statusChangedAt?.seconds
        ? visit.statusChangedAt.seconds * 1000
        : visit.updatedAt?.seconds
            ? visit.updatedAt.seconds * 1000
            : 0;

    if (!changedAt) return null;

    const elapsedMs = now - changedAt;

    switch (visit.status) {
        case 'testing': {
            // 검사 결과가 이미 있으면 → 진료실 복귀
            if (visit.testStatus === 'completed' || visit.testResult?.trim()) {
                return { status: 'consulting', reason: 'test_result_entered' };
            }
            // 타임아웃 → 진료실 복귀 (의사가 직접 결과 입력)
            if (elapsedMs > WORKFLOW_CONFIG.testingTimeoutMinutes * 60 * 1000) {
                return { status: 'consulting', reason: 'test_timeout' };
            }
            return null;
        }

        case 'treatment': {
            // 최소 체류시간 미달 시 무시
            if (elapsedMs < WORKFLOW_CONFIG.treatmentMinStayMinutes * 60 * 1000) {
                return null;
            }
            // 타임아웃 → 수납으로
            if (elapsedMs > WORKFLOW_CONFIG.treatmentTimeoutMinutes * 60 * 1000) {
                return { status: 'completed', reason: 'treatment_timeout' };
            }
            return null;
        }

        default:
            return null;
    }
}

// ─── 다음 환자 호출 시 치료실 환자 자동 완료 ──────────────
/**
 * 새 환자가 consulting으로 들어올 때, treatment에 있는 환자를 자동 완료한다.
 * 최소 체류시간을 넘은 환자만 대상.
 */
export function findAutoCompletableTreatments(
    visits: Visit[],
    now: number
): Visit[] {
    return visits.filter(v => {
        if (v.status !== 'treatment') return false;

        const changedAt = v.statusChangedAt?.seconds
            ? v.statusChangedAt.seconds * 1000
            : v.updatedAt?.seconds
                ? v.updatedAt.seconds * 1000
                : 0;

        if (!changedAt) return false;

        const elapsedMs = now - changedAt;
        return elapsedMs > WORKFLOW_CONFIG.treatmentMinStayMinutes * 60 * 1000;
    });
}
