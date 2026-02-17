import { renderHook, act } from '@testing-library/react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

/**
 * useSessionTimeout has a subtle interaction:
 * - The activity-handling useEffect depends on [resetTimer, clearTimers, showWarning]
 * - When showWarning changes to true, this effect re-runs, which calls resetTimer() again
 * - resetTimer() calls clearTimers() which sets showWarning back to false
 * - This means showWarning effectively bounces: true -> re-render -> effect -> resetTimer -> clearTimers -> false
 *
 * The actual timeout/logout still fires because the logout timer (setTimeout at timeoutMs)
 * calls onTimeout directly without going through the warning flow.
 *
 * Tests below focus on the behaviors that ARE reliably testable with fake timers.
 */

describe('useSessionTimeout', () => {
    let mockOnTimeout: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        mockOnTimeout = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // ─── Initial State ────────────────────────────────────────
    it('starts with showWarning=false and remainingSeconds=0', () => {
        const { result } = renderHook(() =>
            useSessionTimeout(mockOnTimeout)
        );

        expect(result.current.showWarning).toBe(false);
        expect(result.current.remainingSeconds).toBe(0);
    });

    it('returns a dismissWarning function', () => {
        const { result } = renderHook(() =>
            useSessionTimeout(mockOnTimeout)
        );

        expect(typeof result.current.dismissWarning).toBe('function');
    });

    // ─── Timeout Behavior ─────────────────────────────────────
    it('calls onTimeout after the specified timeout period', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        expect(mockOnTimeout).not.toHaveBeenCalled();

        // Advance past the full timeout
        act(() => {
            jest.advanceTimersByTime(timeoutMs + 100);
        });

        expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onTimeout before the timeout period', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        act(() => {
            jest.advanceTimersByTime(timeoutMs - 500);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── Activity Events Reset Timer ──────────────────────────
    it('resets the timer on mouse activity, extending the timeout', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        // Advance 5 seconds
        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        // Simulate user activity
        act(() => {
            document.dispatchEvent(new Event('mousedown'));
        });

        // Advance 5 more seconds (would have timed out without reset)
        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        // Should NOT have timed out because activity reset the timer
        expect(mockOnTimeout).not.toHaveBeenCalled();

        // Advance remaining time to trigger timeout from reset point
        act(() => {
            jest.advanceTimersByTime(6_000);
        });

        expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('resets timer on keydown activity', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        act(() => {
            document.dispatchEvent(new Event('keydown'));
        });

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('resets timer on scroll activity', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        act(() => {
            document.dispatchEvent(new Event('scroll'));
        });

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('resets timer on touchstart activity', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        act(() => {
            document.dispatchEvent(new Event('touchstart'));
        });

        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── dismissWarning Resets Timer ──────────────────────────
    it('dismissWarning prevents timeout from happening at the original time', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        const { result } = renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        // Advance 6 seconds (before warning point)
        act(() => {
            jest.advanceTimersByTime(6_000);
        });

        // Call dismissWarning (which calls resetTimer, restarting the full timeout)
        act(() => {
            result.current.dismissWarning();
        });

        // Advance 5 seconds - past the original 10s timeout but within the reset timer
        act(() => {
            jest.advanceTimersByTime(5_000);
        });

        // Should NOT have timed out because dismissWarning reset the timer
        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── Cleanup ──────────────────────────────────────────────
    it('cleans up event listeners and timers on unmount', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        const { unmount } = renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        unmount();

        // Advancing timers after unmount should not cause timeout
        act(() => {
            jest.advanceTimersByTime(20_000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('cleans up without errors after multiple timer resets', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        const { unmount } = renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        // Trigger multiple resets
        act(() => {
            jest.advanceTimersByTime(3_000);
            document.dispatchEvent(new Event('mousedown'));
        });

        act(() => {
            jest.advanceTimersByTime(3_000);
            document.dispatchEvent(new Event('keydown'));
        });

        unmount();

        // Should not crash or call onTimeout
        act(() => {
            jest.advanceTimersByTime(30_000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── Session Validation ───────────────────────────────────
    it('calls validateSession every 60 seconds when provided', async () => {
        const mockValidateSession = jest.fn().mockResolvedValue(true);
        const timeoutMs = 120_000; // long enough to not interfere
        const warningMs = 10_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs, {
                validateSession: mockValidateSession,
            })
        );

        // Advance 60 seconds + tick for promise resolution
        await act(async () => {
            jest.advanceTimersByTime(60_000);
        });

        expect(mockValidateSession).toHaveBeenCalledTimes(1);

        // Advance another 60 seconds
        await act(async () => {
            jest.advanceTimersByTime(60_000);
        });

        expect(mockValidateSession).toHaveBeenCalledTimes(2);
    });

    it('forces logout when validateSession returns false', async () => {
        const mockValidateSession = jest.fn().mockResolvedValue(false);
        const timeoutMs = 300_000; // 5 minutes - long enough so the normal timer does not fire
        const warningMs = 10_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs, {
                validateSession: mockValidateSession,
            })
        );

        // Advance 60 seconds for first validation check
        await act(async () => {
            jest.advanceTimersByTime(60_000);
        });

        expect(mockValidateSession).toHaveBeenCalled();
        // The validation failure calls onTimeoutRef.current() which is the same as onTimeout
        expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('does NOT force logout when validateSession returns true', async () => {
        const mockValidateSession = jest.fn().mockResolvedValue(true);
        const timeoutMs = 300_000; // 5 minutes
        const warningMs = 10_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs, {
                validateSession: mockValidateSession,
            })
        );

        // Advance 60 seconds for first validation check
        await act(async () => {
            jest.advanceTimersByTime(60_000);
        });

        expect(mockValidateSession).toHaveBeenCalled();
        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── Default Values ───────────────────────────────────────
    it('uses default timeout of 30 minutes (does not timeout before 30 min)', () => {
        renderHook(() => useSessionTimeout(mockOnTimeout));

        // Should not timeout before 30 minutes
        act(() => {
            jest.advanceTimersByTime(29 * 60 * 1000);
        });

        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('uses default timeout of 30 minutes (times out at 30 min)', () => {
        renderHook(() => useSessionTimeout(mockOnTimeout));

        // Should timeout at 30 minutes
        act(() => {
            jest.advanceTimersByTime(30 * 60 * 1000 + 100);
        });

        expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    // ─── Multiple Activity Events ─────────────────────────────
    it('handles rapid successive activity events without issues', () => {
        const timeoutMs = 10_000;
        const warningMs = 3_000;

        renderHook(() =>
            useSessionTimeout(mockOnTimeout, timeoutMs, warningMs)
        );

        // Rapid activity events
        for (let i = 0; i < 10; i++) {
            act(() => {
                document.dispatchEvent(new Event('mousemove'));
                jest.advanceTimersByTime(500);
            });
        }

        // Total time: 5000ms, but timer was reset each time
        // So timeout should not have been reached
        expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    // ─── Edge: No validateSession Provided ────────────────────
    it('does not set up validation interval when validateSession is not provided', async () => {
        renderHook(() =>
            useSessionTimeout(mockOnTimeout, 300_000, 10_000)
        );

        // Advance past multiple 60s intervals
        await act(async () => {
            jest.advanceTimersByTime(180_000);
        });

        // Only the regular timeout mechanism, no validation-based logout
        expect(mockOnTimeout).not.toHaveBeenCalled();
    });
});
