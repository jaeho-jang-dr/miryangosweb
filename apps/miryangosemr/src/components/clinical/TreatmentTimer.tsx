'use client';

import { useState, useEffect, useRef } from 'react';
import { TreatmentExecution } from '@shared/types/clinical';
import { Timestamp } from 'firebase/firestore';
import { Play, CheckCircle, Clock, User } from 'lucide-react';

interface TreatmentTimerProps {
    executions: TreatmentExecution[];
    treatmentStartedAt?: Timestamp;
    onStartModality: (id: string) => void;
    onCompleteModality: (id: string) => void;
}

function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getTimerColor(minutes: number): string {
    if (minutes < 10) return 'text-emerald-600';
    if (minutes < 15) return 'text-amber-600';
    return 'text-red-600';
}

function getTimerBg(minutes: number): string {
    if (minutes < 10) return 'bg-emerald-50 border-emerald-200';
    if (minutes < 15) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
}

export default function TreatmentTimer({
    executions,
    treatmentStartedAt,
    onStartModality,
    onCompleteModality,
}: TreatmentTimerProps) {
    const [now, setNow] = useState(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const totalElapsedSec = treatmentStartedAt
        ? Math.floor((now - treatmentStartedAt.toMillis()) / 1000)
        : 0;
    const totalMinutes = Math.floor(totalElapsedSec / 60);

    const allCompleted = executions.length > 0 && executions.every(e => e.status === 'completed');
    const anyInProgress = executions.some(e => e.status === 'in_progress');

    return (
        <div className="space-y-4">
            {/* Overall Timer */}
            {treatmentStartedAt && (
                <div className={`p-4 rounded-xl border-2 text-center ${getTimerBg(totalMinutes)}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">전체 경과 시간</p>
                    <p className={`text-3xl font-mono font-bold ${getTimerColor(totalMinutes)}`}>
                        {formatTimer(totalElapsedSec)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                        <span>{executions.filter(e => e.status === 'completed').length}/{executions.length} 완료</span>
                        {allCompleted && <span className="text-emerald-600 font-bold">모든 치료 완료</span>}
                    </div>
                </div>
            )}

            {/* Individual Modality Cards */}
            <div className="space-y-2">
                {executions.map(exec => {
                    const elapsedSec = exec.status === 'in_progress' && exec.startedAt
                        ? Math.floor((now - exec.startedAt.toMillis()) / 1000)
                        : exec.status === 'completed' && exec.startedAt && exec.completedAt
                            ? Math.floor((exec.completedAt.toMillis() - exec.startedAt.toMillis()) / 1000)
                            : 0;

                    return (
                        <div
                            key={exec.id}
                            className={`p-3 rounded-xl border transition-all ${
                                exec.status === 'completed'
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : exec.status === 'in_progress'
                                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                                        : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium text-sm truncate ${
                                        exec.status === 'completed' ? 'text-emerald-700' : 'text-slate-800'
                                    }`}>
                                        {exec.modality}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {exec.status !== 'pending' && (
                                            <span className={`text-xs font-mono font-bold ${
                                                exec.status === 'in_progress' ? 'text-blue-600' : 'text-emerald-600'
                                            }`}>
                                                <Clock className="w-3 h-3 inline mr-0.5" />
                                                {formatTimer(elapsedSec)}
                                            </span>
                                        )}
                                        {exec.durationMinutes && exec.status === 'pending' && (
                                            <span className="text-xs text-slate-400">예상 {exec.durationMinutes}분</span>
                                        )}
                                        {exec.performerName && (
                                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                <User className="w-2.5 h-2.5" /> {exec.performerName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    {exec.status === 'pending' && (
                                        <button
                                            onClick={() => onStartModality(exec.id)}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                        >
                                            <Play className="w-3 h-3" /> 시작
                                        </button>
                                    )}
                                    {exec.status === 'in_progress' && (
                                        <button
                                            onClick={() => onCompleteModality(exec.id)}
                                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                                        >
                                            <CheckCircle className="w-3 h-3" /> 완료
                                        </button>
                                    )}
                                    {exec.status === 'completed' && (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
