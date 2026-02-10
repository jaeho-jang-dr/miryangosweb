'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioRecorder, type RecordingState } from '@/lib/voice/audio-recorder';

interface AudioRecorderComponentProps {
    onRecordingComplete?: (audioBlob: Blob) => void;
    onRecordingStateChange?: (state: RecordingState) => void;
    onAudioChunk?: (chunk: Blob) => void;
}

export function AudioRecorderComponent({
    onRecordingComplete,
    onRecordingStateChange,
    onAudioChunk
}: AudioRecorderComponentProps) {
    const [recordingState, setRecordingState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0
    });

    const [error, setError] = useState<string>('');
    const recorderRef = useRef<AudioRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            // 컴포넌트 언마운트 시 정리
            if (recorderRef.current) {
                recorderRef.current.destroy();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // 녹음 시작
    const handleStart = async () => {
        try {
            setError('');

            recorderRef.current = new AudioRecorder(
                {
                    sampleRate: 48000,
                    channels: 1,
                    timeslice: 1000 // 1초마다 청크 전달
                },
                {
                    onDataAvailable: onAudioChunk,
                    onStateChange: (state) => {
                        setRecordingState(state);
                        onRecordingStateChange?.(state);
                    }
                }
            );

            await recorderRef.current.startRecording();

            // 타이머 시작
            timerRef.current = setInterval(() => {
                if (recorderRef.current) {
                    setRecordingState(recorderRef.current.getState());
                }
            }, 100);

        } catch (err: any) {
            setError(err.message || '녹음 시작에 실패했습니다.');
        }
    };

    // 녹음 정지
    const handleStop = async () => {
        try {
            if (!recorderRef.current) return;

            const audioBlob = await recorderRef.current.stopRecording();
            onRecordingComplete?.(audioBlob);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setRecordingState({
                isRecording: false,
                isPaused: false,
                duration: 0
            });

        } catch (err: any) {
            setError(err.message || '녹음 정지에 실패했습니다.');
        }
    };

    // 일시정지
    const handlePause = () => {
        if (recorderRef.current) {
            recorderRef.current.pauseRecording();
        }
    };

    // 재개
    const handleResume = () => {
        if (recorderRef.current) {
            recorderRef.current.resumeRecording();
        }
    };

    // 시간 포맷팅 (초 -> MM:SS)
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* 녹음 상태 표시 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {recordingState.isRecording && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-600 font-semibold">녹음 중</span>
                        </div>
                    )}
                    {recordingState.isPaused && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-yellow-600 font-semibold">일시정지</span>
                        </div>
                    )}
                    {!recordingState.isRecording && !recordingState.isPaused && (
                        <span className="text-slate-400">대기 중</span>
                    )}
                </div>

                <div className="text-2xl font-mono font-bold text-slate-700">
                    {formatDuration(recordingState.duration)}
                </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* 컨트롤 버튼 */}
            <div className="flex gap-2">
                {!recordingState.isRecording && !recordingState.isPaused && (
                    <button
                        onClick={handleStart}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        녹음 시작
                    </button>
                )}

                {recordingState.isRecording && (
                    <>
                        <button
                            onClick={handlePause}
                            className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            일시정지
                        </button>
                        <button
                            onClick={handleStop}
                            className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                            정지
                        </button>
                    </>
                )}

                {recordingState.isPaused && (
                    <>
                        <button
                            onClick={handleResume}
                            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            재개
                        </button>
                        <button
                            onClick={handleStop}
                            className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                            정지
                        </button>
                    </>
                )}
            </div>

            {/* 도움말 */}
            <div className="mt-4 text-xs text-slate-500">
                💡 마이크 권한이 필요합니다. 브라우저에서 마이크 접근을 허용해주세요.
            </div>
        </div>
    );
}
