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
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Top Bar with Status and Progress */}
            <div className={`px-6 py-4 flex items-center justify-between transition-colors duration-500 ${
                recordingState.isRecording ? 'bg-rose-50/50' : 'bg-white'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`relative flex items-center justify-center ${recordingState.isRecording ? 'animate-pulse' : ''}`}>
                        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            recordingState.isRecording ? 'bg-rose-500' : recordingState.isPaused ? 'bg-amber-500' : 'bg-slate-300'
                        }`} />
                        {recordingState.isRecording && (
                            <div className="absolute w-3 h-3 bg-rose-500 rounded-full animate-ping opacity-75" />
                        )}
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-widest ${
                        recordingState.isRecording ? 'text-rose-600' : recordingState.isPaused ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                        {recordingState.isRecording ? 'Recording Live' : recordingState.isPaused ? 'Recording Paused' : 'Ready to Start'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Duration</span>
                        <div className="text-3xl font-black font-mono text-slate-800 tabular-nums">
                            {formatDuration(recordingState.duration)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs text-rose-600 font-bold">{error}</p>
                </div>
            )}

            {/* Controls Area */}
            <div className="p-6">
                <div className="flex items-stretch gap-4">
                    {!recordingState.isRecording && !recordingState.isPaused ? (
                        <button
                            onClick={handleStart}
                            className="flex-1 group relative overflow-hidden px-8 py-5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-200 active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3 text-lg">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                진료 시작하기
                            </div>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </button>
                    ) : (
                        <div className="flex-1 flex gap-3">
                            {recordingState.isRecording ? (
                                <button
                                    onClick={handlePause}
                                    className="flex-1 px-8 py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-200 active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    잠시 멈춤
                                </button>
                            ) : (
                                <button
                                    onClick={handleResume}
                                    className="flex-1 px-8 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    다시 시작
                                </button>
                            )}
                            <button
                                onClick={handleStop}
                                className="px-10 py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all shadow-lg shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                </svg>
                                정지 및 완료
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hint Footer */}
            <div className="px-6 py-3 bg-slate-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px]">💡</div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Tip: 마이크 접근을 허용하면 자동으로 상담 내용이 텍스트로 전환됩니다.
                </p>
            </div>
        </div>
    );
}

