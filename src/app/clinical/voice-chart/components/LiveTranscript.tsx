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
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [segments]);

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">실시간 대화 기록</h3>
                        <p className="text-xs text-slate-400 font-medium">AI가 실시간으로 인식 중입니다</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isRecording && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Rec Listening
                        </div>
                    )}
                    {isAnalyzing && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse border border-blue-100">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            AI Analyzing
                        </div>
                    )}
                </div>
            </div>

            {/* 대화 내용 */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-4 p-6 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
            >
                {segments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 opacity-60">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium italic">대화가 시작되면 여기에 텍스트가 표시됩니다</p>
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

            {/* 하단 푸터 및 통계 */}
            <div className="px-6 py-4 bg-white border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Utterances</span>
                        <span className="text-sm font-bold text-slate-700">{segments.length} 회</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Characters</span>
                        <span className="text-sm font-bold text-slate-700">{segments.reduce((sum, s) => sum + s.text.length, 0)} 자</span>
                    </div>
                </div>
                {segments.length > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidence</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length * 100)}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-emerald-600">
                                {(segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length * 100).toFixed(0)}%
                            </span>
                        </div>
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
        <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`group max-w-[85%] px-4 py-3 rounded-2xl shadow-sm transition-all hover:shadow-md ${
                isDoctor 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : isPatient 
                    ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none' 
                    : 'bg-slate-200 text-slate-700 rounded-tl-none'
            }`}>
                <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isDoctor ? 'text-indigo-200' : isPatient ? 'text-emerald-500' : 'text-slate-500'
                    }`}>
                        {isDoctor ? 'Doctor' : isPatient ? 'Patient' : `Segment ${index + 1}`}
                    </span>
                    <span className={`text-[10px] font-medium ${isDoctor ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {new Date(segment.timestamp).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </span>
                </div>
                
                <p className={`text-[15px] leading-relaxed font-medium ${isDoctor ? 'text-white' : 'text-slate-700'}`}>
                    {segment.text}
                </p>
                
                {segment.confidence < 0.8 && !isDoctor && (
                    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        <span className="text-[10px] text-amber-500 font-bold">Low Confidence</span>
                    </div>
                )}
            </div>
        </div>
    );
}

