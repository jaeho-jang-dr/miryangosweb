import { renderHook, act } from '@testing-library/react';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';

// Create a mock SpeechRecognition class
class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onresult: ((event: any) => void) | null = null;

    start = jest.fn(() => {
        this.onstart?.();
    });

    stop = jest.fn(() => {
        this.onend?.();
    });

    abort = jest.fn();
}

describe('useVoiceDictation', () => {
    let mockRecognition: MockSpeechRecognition;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRecognition = new MockSpeechRecognition();

        // Set up webkitSpeechRecognition on window
        Object.defineProperty(window, 'webkitSpeechRecognition', {
            writable: true,
            configurable: true,
            value: jest.fn(() => mockRecognition),
        });
    });

    afterEach(() => {
        // Clean up
        delete (window as any).webkitSpeechRecognition;
    });

    // ─── Initial State (Supported) ────────────────────────────
    it('reports isSupported=true when webkitSpeechRecognition is available', () => {
        const { result } = renderHook(() => useVoiceDictation());

        expect(result.current.isSupported).toBe(true);
        expect(result.current.isListening).toBe(false);
        expect(result.current.interimTranscript).toBe('');
        expect(result.current.error).toBeNull();
    });

    // ─── Initial State (Not Supported) ────────────────────────
    it('reports isSupported=false when webkitSpeechRecognition is not available', () => {
        delete (window as any).webkitSpeechRecognition;

        const { result } = renderHook(() => useVoiceDictation());

        expect(result.current.isSupported).toBe(false);
        expect(result.current.error).toBe('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
    });

    // ─── SpeechRecognition Configuration ──────────────────────
    it('configures SpeechRecognition with Korean language', () => {
        renderHook(() => useVoiceDictation());

        expect(mockRecognition.continuous).toBe(true);
        expect(mockRecognition.interimResults).toBe(true);
        expect(mockRecognition.lang).toBe('ko-KR');
    });

    // ─── Start/Stop/Toggle ────────────────────────────────────
    it('start() calls recognition.start and sets isListening=true', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        expect(mockRecognition.start).toHaveBeenCalledTimes(1);
        expect(result.current.isListening).toBe(true);
    });

    it('stop() calls recognition.stop and sets isListening=false', () => {
        const { result } = renderHook(() => useVoiceDictation());

        // Start first
        act(() => {
            result.current.start();
        });

        expect(result.current.isListening).toBe(true);

        // Then stop
        act(() => {
            result.current.stop();
        });

        expect(mockRecognition.stop).toHaveBeenCalledTimes(1);
        expect(result.current.isListening).toBe(false);
    });

    it('toggle() starts when not listening', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.toggle();
        });

        expect(mockRecognition.start).toHaveBeenCalledTimes(1);
        expect(result.current.isListening).toBe(true);
    });

    it('toggle() stops when listening', () => {
        const { result } = renderHook(() => useVoiceDictation());

        // Start listening
        act(() => {
            result.current.start();
        });

        // Toggle should stop
        act(() => {
            result.current.toggle();
        });

        expect(mockRecognition.stop).toHaveBeenCalledTimes(1);
        expect(result.current.isListening).toBe(false);
    });

    it('start() does nothing when already listening', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        act(() => {
            result.current.start();
        });

        // start called only once because the guard check prevents double start
        expect(mockRecognition.start).toHaveBeenCalledTimes(1);
    });

    it('stop() does nothing when not listening', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.stop();
        });

        expect(mockRecognition.stop).not.toHaveBeenCalled();
    });

    // ─── Recognition Results ──────────────────────────────────
    it('calls onFinalResult when a final result is received', () => {
        const mockOnFinalResult = jest.fn();

        const { result } = renderHook(() =>
            useVoiceDictation({ onFinalResult: mockOnFinalResult })
        );

        // Start listening
        act(() => {
            result.current.start();
        });

        // Simulate a final result
        act(() => {
            mockRecognition.onresult?.({
                resultIndex: 0,
                results: {
                    length: 1,
                    0: {
                        isFinal: true,
                        0: { transcript: '안녕하세요' },
                        length: 1,
                    },
                },
            });
        });

        expect(mockOnFinalResult).toHaveBeenCalledWith('안녕하세요');
    });

    it('updates interimTranscript for interim results', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        // Simulate interim result
        act(() => {
            mockRecognition.onresult?.({
                resultIndex: 0,
                results: {
                    length: 1,
                    0: {
                        isFinal: false,
                        0: { transcript: '안녕하' },
                        length: 1,
                    },
                },
            });
        });

        expect(result.current.interimTranscript).toBe('안녕하');
    });

    it('handles mixed final and interim results', () => {
        const mockOnFinalResult = jest.fn();

        const { result } = renderHook(() =>
            useVoiceDictation({ onFinalResult: mockOnFinalResult })
        );

        act(() => {
            result.current.start();
        });

        // Simulate mixed results
        act(() => {
            mockRecognition.onresult?.({
                resultIndex: 0,
                results: {
                    length: 2,
                    0: {
                        isFinal: true,
                        0: { transcript: '완료된 문장' },
                        length: 1,
                    },
                    1: {
                        isFinal: false,
                        0: { transcript: '진행중' },
                        length: 1,
                    },
                },
            });
        });

        expect(mockOnFinalResult).toHaveBeenCalledWith('완료된 문장');
        expect(result.current.interimTranscript).toBe('진행중');
    });

    // ─── Error Handling ───────────────────────────────────────
    it('ignores no-speech error (benign)', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        act(() => {
            mockRecognition.onerror?.({ error: 'no-speech' });
        });

        expect(result.current.error).toBeNull();
        expect(result.current.isListening).toBe(true);
    });

    it('sets error for audio-capture error', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        act(() => {
            mockRecognition.onerror?.({ error: 'audio-capture' });
        });

        expect(result.current.error).toBe('마이크를 찾을 수 없습니다. 연결을 확인해주세요.');
        expect(result.current.isListening).toBe(false);
    });

    it('sets error for not-allowed error', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        act(() => {
            mockRecognition.onerror?.({ error: 'not-allowed' });
        });

        expect(result.current.error).toBe('마이크 권한이 필요합니다.');
        expect(result.current.isListening).toBe(false);
    });

    it('sets generic error message for other errors', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        act(() => {
            mockRecognition.onerror?.({ error: 'network' });
        });

        expect(result.current.error).toBe('오류 발생: network');
        expect(result.current.isListening).toBe(false);
    });

    it('clears error on successful start', () => {
        const { result } = renderHook(() => useVoiceDictation());

        // First cause an error
        act(() => {
            result.current.start();
        });
        act(() => {
            mockRecognition.onerror?.({ error: 'not-allowed' });
        });

        expect(result.current.error).toBe('마이크 권한이 필요합니다.');

        // Start again - the onstart handler should clear the error
        act(() => {
            result.current.start();
        });

        // onstart sets error to null
        expect(result.current.error).toBeNull();
    });

    // ─── Cleanup ──────────────────────────────────────────────
    it('stops recognition on unmount', () => {
        const { result, unmount } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        unmount();

        expect(mockRecognition.stop).toHaveBeenCalled();
    });

    // ─── Ref-based Callback Updates ───────────────────────────
    it('uses the latest onFinalResult callback via ref (no stale closure)', () => {
        const firstCallback = jest.fn();
        const secondCallback = jest.fn();

        const { result, rerender } = renderHook(
            ({ onFinalResult }) => useVoiceDictation({ onFinalResult }),
            { initialProps: { onFinalResult: firstCallback } }
        );

        act(() => {
            result.current.start();
        });

        // Update the callback
        rerender({ onFinalResult: secondCallback });

        // Simulate a final result - should use the second callback
        act(() => {
            mockRecognition.onresult?.({
                resultIndex: 0,
                results: {
                    length: 1,
                    0: {
                        isFinal: true,
                        0: { transcript: '테스트' },
                        length: 1,
                    },
                },
            });
        });

        expect(firstCallback).not.toHaveBeenCalled();
        expect(secondCallback).toHaveBeenCalledWith('테스트');
    });

    // ─── No onFinalResult Provided ────────────────────────────
    it('does not crash when onFinalResult is not provided', () => {
        const { result } = renderHook(() => useVoiceDictation());

        act(() => {
            result.current.start();
        });

        // Simulate a final result without callback
        expect(() => {
            act(() => {
                mockRecognition.onresult?.({
                    resultIndex: 0,
                    results: {
                        length: 1,
                        0: {
                            isFinal: true,
                            0: { transcript: '테스트' },
                            length: 1,
                        },
                    },
                });
            });
        }).not.toThrow();
    });
});
