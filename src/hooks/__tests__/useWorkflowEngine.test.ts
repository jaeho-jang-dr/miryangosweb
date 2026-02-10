import { renderHook, act } from '@testing-library/react';
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine';

// Firebase mocks from jest.setup.js
const mockOnSnapshot = require('firebase/firestore').onSnapshot as jest.Mock;
const mockUpdateDoc = require('firebase/firestore').updateDoc as jest.Mock;

describe('useWorkflowEngine', () => {
    let mockUnsubscribe: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();

        mockUnsubscribe = jest.fn();
        mockOnSnapshot.mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: [] });
            return mockUnsubscribe;
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // ─── Firestore Subscription ──────────────────────────────
    it('subscribes to Firestore on mount', () => {
        renderHook(() => useWorkflowEngine());
        expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from Firestore on unmount', () => {
        const { unmount } = renderHook(() => useWorkflowEngine());
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalled();
    });

    // ─── Toast Management ────────────────────────────────────
    it('starts with empty toasts', () => {
        const { result } = renderHook(() => useWorkflowEngine());
        expect(result.current.toasts).toEqual([]);
    });

    it('removeToast does not crash on nonexistent id', () => {
        const { result } = renderHook(() => useWorkflowEngine());
        act(() => {
            result.current.removeToast('nonexistent');
        });
        expect(result.current.toasts).toEqual([]);
    });

    it('starts with empty activeVisits', () => {
        const { result } = renderHook(() => useWorkflowEngine());
        expect(result.current.activeVisits).toEqual([]);
    });

    it('populates activeVisits from Firestore snapshot', () => {
        const testVisit = {
            id: 'v1',
            patientName: '홍길동',
            status: 'consulting',
            date: { seconds: Date.now() / 1000 },
        };

        mockOnSnapshot.mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({
                docs: [{
                    id: 'v1',
                    data: () => testVisit,
                }],
            });
            return mockUnsubscribe;
        });

        const { result } = renderHook(() => useWorkflowEngine());
        expect(result.current.activeVisits).toHaveLength(1);
        expect(result.current.activeVisits[0].patientName).toBe('홍길동');
    });

    // ─── State Transition + Dedup ────────────────────────────
    it('does NOT trigger timeout transition for testing patients (timeout removed)', async () => {
        const now = Date.now();
        const ONE_HOUR_MS = 60 * 60 * 1000;

        const testVisit = {
            id: 'v1',
            patientName: '홍길동',
            status: 'testing',
            testOrder: 'X-ray',
            statusChangedAt: { seconds: (now - ONE_HOUR_MS) / 1000 },
            updatedAt: { seconds: (now - ONE_HOUR_MS) / 1000 },
            date: { seconds: now / 1000 },
        };

        mockOnSnapshot.mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({
                docs: [{
                    id: 'v1',
                    data: () => testVisit,
                }],
            });
            return mockUnsubscribe;
        });

        mockUpdateDoc.mockResolvedValue(undefined);

        renderHook(() => useWorkflowEngine());

        // Advance past check interval (30s)
        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        // 검사실 타임아웃 제거: updateDoc이 호출되지 않아야 함
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('does not trigger duplicate transitions for the same visit', async () => {
        const FIFTEEN_MIN_MS = 15 * 60 * 1000;
        const now = Date.now();

        // treatment 환자로 변경 (testing 타임아웃은 제거됨)
        const testVisit = {
            id: 'v1',
            patientName: '홍길동',
            status: 'treatment',
            statusChangedAt: { seconds: (now - FIFTEEN_MIN_MS - 5000) / 1000 },
            updatedAt: { seconds: (now - FIFTEEN_MIN_MS - 5000) / 1000 },
            date: { seconds: now / 1000 },
        };

        // Make updateDoc slow to simulate processing
        mockUpdateDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 5000)));

        mockOnSnapshot.mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({
                docs: [{
                    id: 'v1',
                    data: () => testVisit,
                }],
            });
            return mockUnsubscribe;
        });

        renderHook(() => useWorkflowEngine());

        // First check interval
        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        // Second check while first is still processing
        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        // Should only be called once due to processingRef guard
        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    // ─── Cleanup ─────────────────────────────────────────────
    it('cleans up interval timer on unmount', () => {
        const { unmount } = renderHook(() => useWorkflowEngine());

        unmount();

        // Advancing timers after unmount should not cause errors
        act(() => {
            jest.advanceTimersByTime(60000);
        });

        // If we get here without errors, cleanup worked
        expect(true).toBe(true);
    });
});
