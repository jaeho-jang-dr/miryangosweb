'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '@/lib/voice/speech-recognition';


interface LiveTranscriptProps {
    segments: TranscriptSegment[];
    isRecording: boolean;
    isAnalyzing?: boolean;
}

export function LiveTranscript({ segments, isRecording, isAnalyzing }: LiveTranscriptProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 새로운 세그먼트 추가 시 자동 스크롤
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [segments]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                    📝 실시간 대화 내용
                </h3>
                {isRecording ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full animate-pulse">
                        음성 인식 중...
                    </span>
                ) : isAnalyzing ? (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full animate-pulse">
                        AI 분석 중...
                    </span>
                 ) : null}
            </div>

            {/* 대화 내용 */}
            <div
                ref={scrollRef}
                className="h-96 overflow-y-auto space-y-3 p-4 bg-slate-50 rounded-lg"
            >
                {segments.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        녹음을 시작하면 대화 내용이 여기에 표시됩니다.
                    </div>
                ) : (
                    segments.map((segment, index) => (
                        <TranscriptSegmentItem
                            key={index}
                            segment={segment}
                            index={index}
                        />
                    ))
                )}
            </div>

            {/* 통계 */}
            <div className="mt-4 flex gap-4 text-sm text-slate-600">
                <div>
                    <span className="font-semibold">{segments.length}</span> 발화
                </div>
                <div>
                    <span className="font-semibold">
                        {segments.reduce((sum, s) => sum + s.text.length, 0)}
                    </span> 글자
                </div>
                {segments.length > 0 && (
                    <div>
                        평균 신뢰도:{' '}
                        <span className="font-semibold">
                            {(
                                segments.reduce((sum, s) => sum + s.confidence, 0) /
                                segments.length * 100
                            ).toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TranscriptSegmentItem({
    segment,
    index
}: {
    segment: TranscriptSegment;
    index: number;
}) {
    const isDoctor = segment.speaker === 'doctor';
    const isPatient = segment.speaker === 'patient';
    
    return (
        <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
                isDoctor 
                    ? 'bg-blue-100 text-blue-900 rounded-tr-none' 
                    : isPatient 
                    ? 'bg-white border border-slate-200 rounded-tl-none' 
                    : 'bg-slate-100 text-slate-700'
            }`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${
                        isDoctor ? 'text-blue-700' : isPatient ? 'text-green-700' : 'text-slate-500'
                    }`}>
                        {isDoctor ? '👨‍⚕️ 의사' : isPatient ? '👤 환자' : `발화 ${index + 1}`}
                    </span>
                    <span className="text-xs text-slate-400">
                        {new Date(segment.timestamp).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
                
                <p className={`${isDoctor ? 'text-blue-900' : 'text-slate-800'}`}>
                    {segment.text}
                </p>
            </div>
        </div>
    );
}
