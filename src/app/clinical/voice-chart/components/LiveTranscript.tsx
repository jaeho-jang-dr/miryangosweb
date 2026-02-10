'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '@/lib/voice/speech-recognition';

interface LiveTranscriptProps {
    segments: TranscriptSegment[];
    isRecording: boolean;
}

export function LiveTranscript({ segments, isRecording }: LiveTranscriptProps) {
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
                {isRecording && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        음성 인식 중
                    </span>
                )}
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
    const confidenceColor =
        segment.confidence > 0.9
            ? 'text-green-600'
            : segment.confidence > 0.7
            ? 'text-yellow-600'
            : 'text-red-600';

    return (
        <div className={`p-3 rounded-lg ${segment.isFinal ? 'bg-white' : 'bg-blue-50'} border ${segment.isFinal ? 'border-slate-200' : 'border-blue-200'}`}>
            <div className="flex items-start gap-3">
                {/* 화자 아이콘 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    segment.speaker === 'doctor'
                        ? 'bg-blue-100 text-blue-700'
                        : segment.speaker === 'patient'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                }`}>
                    {segment.speaker === 'doctor' ? '의' : segment.speaker === 'patient' ? '환' : index + 1}
                </div>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                    <p className={`text-slate-800 ${!segment.isFinal && 'italic'}`}>
                        {segment.text}
                    </p>

                    {/* 메타데이터 */}
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                        <span>
                            {new Date(segment.timestamp).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </span>
                        <span className={confidenceColor}>
                            {(segment.confidence * 100).toFixed(0)}%
                        </span>
                        {!segment.isFinal && (
                            <span className="text-blue-600">임시</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
