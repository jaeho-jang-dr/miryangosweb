import {
    determineNextStatus,
    checkTimeoutTransition,
    findAutoCompletableTreatments,
    getTransitionMessage,
    WORKFLOW_CONFIG,
    TransitionResult,
    STATUS_LABELS,
} from '@/lib/workflow-engine';
import { Visit, ClinicalStatus } from '@/types/clinical';

// Helper: minimal Visit factory
function makeVisit(overrides: Partial<Visit> & { status: ClinicalStatus }): Visit {
    return {
        id: 'v1',
        patientId: 'p1',
        patientName: '홍길동',
        date: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        type: 'new',
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        ...overrides,
    } as Visit;
}

// ─── determineNextStatus ─────────────────────────────────────
describe('determineNextStatus', () => {
    it('returns null if status is not consulting', () => {
        expect(determineNextStatus({ status: 'reception' })).toBeNull();
        expect(determineNextStatus({ status: 'testing' })).toBeNull();
        expect(determineNextStatus({ status: 'treatment' })).toBeNull();
    });

    it('returns testing when test order exists without result', () => {
        const result = determineNextStatus({
            status: 'consulting',
            testOrder: 'Knee X-ray',
        });
        expect(result).toEqual({ status: 'testing', reason: 'test_ordered' });
    });

    it('returns null when test order and result both exist (no treatment)', () => {
        const result = determineNextStatus({
            status: 'consulting',
            testOrder: 'X-ray',
            testResult: 'Normal',
        });
        expect(result).toBeNull();
    });

    it('returns treatment when treatment note exists without test order', () => {
        const result = determineNextStatus({
            status: 'consulting',
            treatmentNote: 'Physical therapy',
        });
        expect(result).toEqual({ status: 'treatment', reason: 'treatment_ordered' });
    });

    it('returns treatment when treatment note exists and test has result', () => {
        const result = determineNextStatus({
            status: 'consulting',
            testOrder: 'X-ray',
            testResult: 'Normal',
            treatmentNote: 'PT session',
        });
        expect(result).toEqual({ status: 'treatment', reason: 'treatment_ordered' });
    });

    it('returns treatment when treatment note exists and testStatus is completed', () => {
        const result = determineNextStatus({
            status: 'consulting',
            testOrder: 'X-ray',
            testStatus: 'completed',
            treatmentNote: 'PT session',
        });
        expect(result).toEqual({ status: 'treatment', reason: 'treatment_ordered' });
    });

    it('prioritizes testing over treatment when test result is missing', () => {
        const result = determineNextStatus({
            status: 'consulting',
            testOrder: 'X-ray',
            treatmentNote: 'PT session',
        });
        expect(result).toEqual({ status: 'testing', reason: 'test_ordered' });
    });

    it('returns null when all fields are empty or whitespace', () => {
        expect(determineNextStatus({
            status: 'consulting',
            testOrder: '  ',
            treatmentNote: '  ',
        })).toBeNull();

        expect(determineNextStatus({
            status: 'consulting',
            testOrder: '',
            treatmentNote: '',
        })).toBeNull();
    });
});

// ─── checkTimeoutTransition ──────────────────────────────────
describe('checkTimeoutTransition', () => {
    const FIFTEEN_MIN_MS = WORKFLOW_CONFIG.treatmentTimeoutMinutes * 60 * 1000;
    const THREE_MIN_MS = WORKFLOW_CONFIG.treatmentMinStayMinutes * 60 * 1000;

    it('returns consulting for testing patient with completed testStatus', () => {
        const now = Date.now();
        const visit = makeVisit({
            status: 'testing',
            testStatus: 'completed',
            statusChangedAt: { seconds: (now - 1000) / 1000 } as any,
        });
        expect(checkTimeoutTransition(visit, now)).toEqual({
            status: 'consulting',
            reason: 'test_result_entered',
        });
    });

    it('returns consulting for testing patient with testResult text', () => {
        const now = Date.now();
        const visit = makeVisit({
            status: 'testing',
            testResult: 'Normal findings',
            statusChangedAt: { seconds: (now - 1000) / 1000 } as any,
        });
        expect(checkTimeoutTransition(visit, now)).toEqual({
            status: 'consulting',
            reason: 'test_result_entered',
        });
    });

    it('returns null for testing patient without result (no timeout)', () => {
        const now = Date.now();
        const visit = makeVisit({
            status: 'testing',
            statusChangedAt: { seconds: (now - 60 * 60 * 1000) / 1000 } as any,
        });
        // 타임아웃 제거됨: 결과 입력 없으면 아무리 시간이 지나도 null
        expect(checkTimeoutTransition(visit, now)).toBeNull();
    });

    it('returns null for treatment patient before min stay time', () => {
        const now = Date.now();
        const visit = makeVisit({
            status: 'treatment',
            statusChangedAt: { seconds: (now - THREE_MIN_MS + 60000) / 1000 } as any,
        });
        expect(checkTimeoutTransition(visit, now)).toBeNull();
    });

    it('returns completed for treatment patient after timeout', () => {
        const now = Date.now();
        const visit = makeVisit({
            status: 'treatment',
            statusChangedAt: { seconds: (now - FIFTEEN_MIN_MS - 1000) / 1000 } as any,
        });
        expect(checkTimeoutTransition(visit, now)).toEqual({
            status: 'completed',
            reason: 'treatment_timeout',
        });
    });
});

// ─── findAutoCompletableTreatments ───────────────────────────
describe('findAutoCompletableTreatments', () => {
    const THREE_MIN_MS = WORKFLOW_CONFIG.treatmentMinStayMinutes * 60 * 1000;

    it('returns treatment visits past min stay', () => {
        const now = Date.now();
        const visits = [
            makeVisit({
                id: 'v1',
                status: 'treatment',
                statusChangedAt: { seconds: (now - THREE_MIN_MS - 1000) / 1000 } as any,
            }),
        ];
        expect(findAutoCompletableTreatments(visits, now)).toHaveLength(1);
    });

    it('excludes treatment visits before min stay', () => {
        const now = Date.now();
        const visits = [
            makeVisit({
                id: 'v1',
                status: 'treatment',
                statusChangedAt: { seconds: (now - 1000) / 1000 } as any,
            }),
        ];
        expect(findAutoCompletableTreatments(visits, now)).toHaveLength(0);
    });

    it('excludes non-treatment visits', () => {
        const now = Date.now();
        const visits = [
            makeVisit({
                id: 'v1',
                status: 'consulting',
                statusChangedAt: { seconds: (now - THREE_MIN_MS - 1000) / 1000 } as any,
            }),
        ];
        expect(findAutoCompletableTreatments(visits, now)).toHaveLength(0);
    });

    it('returns empty for empty array', () => {
        expect(findAutoCompletableTreatments([], Date.now())).toHaveLength(0);
    });
});

// ─── getTransitionMessage ────────────────────────────────────
describe('getTransitionMessage', () => {
    const base: TransitionResult = {
        visitId: 'v1',
        patientName: '홍길동',
        from: 'consulting',
        to: 'testing',
        reason: 'test_ordered',
    };

    it('formats test_ordered', () => {
        expect(getTransitionMessage({ ...base, to: 'testing', reason: 'test_ordered' }))
            .toBe('홍길동님 → 검사실 (검사 오더)');
    });

    it('formats test_result_entered', () => {
        expect(getTransitionMessage({ ...base, to: 'consulting', reason: 'test_result_entered' }))
            .toBe('홍길동님 → 진료실 (검사결과 입력완료)');
    });

    it('formats test_timeout', () => {
        expect(getTransitionMessage({ ...base, to: 'consulting', reason: 'test_timeout' }))
            .toBe('홍길동님 → 진료실 (검사 대기시간 초과)');
    });

    it('formats treatment_ordered', () => {
        expect(getTransitionMessage({ ...base, to: 'treatment', reason: 'treatment_ordered' }))
            .toBe('홍길동님 → 치료실 (치료 오더)');
    });

    it('formats treatment_timeout', () => {
        expect(getTransitionMessage({ ...base, to: 'completed', reason: 'treatment_timeout' }))
            .toBe('홍길동님 → 수납대기 (치료시간 경과)');
    });

    it('formats treatment_next_patient', () => {
        expect(getTransitionMessage({ ...base, to: 'completed', reason: 'treatment_next_patient' }))
            .toBe('홍길동님 → 수납대기 (다음 환자 진료 시작)');
    });

    it('formats manual (default)', () => {
        expect(getTransitionMessage({ ...base, to: 'treatment', reason: 'manual' }))
            .toBe('홍길동님 → 치료실');
    });
});
