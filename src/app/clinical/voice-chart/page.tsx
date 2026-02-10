'use client';

import { useState, useCallback } from 'react';
import { AudioRecorderComponent } from './components/AudioRecorderComponent';
import { LiveTranscript } from './components/LiveTranscript';
import { ChartPreview } from './components/ChartPreview';
import type { TranscriptSegment, SpeechRecognitionService } from '@/lib/voice/speech-recognition';
import type { RecordingState } from '@/lib/voice/audio-recorder';
import type { InitialVisitChart } from '@/lib/medical/templates/initial-visit-template';
import type { SoapNote } from '@/lib/medical/templates/soap-note-template';
import { createEmptyInitialChart } from '@/lib/medical/templates/initial-visit-template';
import Link from 'next/link';

export default function VoiceChartPage() {
    const [visitType, setVisitType] = useState<'initial' | 'followup'>('initial');
    const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
    const [recordingState, setRecordingState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0
    });
    const [chart, setChart] = useState<InitialVisitChart | SoapNote | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [patientId] = useState('demo-patient-001'); // TODO: 실제 환자 ID 연동

    // 녹음 완료 시 음성 인식 및 차트 생성
    const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
        console.log('[VoiceChart] 녹음 완료:', audioBlob.size, 'bytes');

        try {
            setIsGenerating(true);

            // 1. 음성을 텍스트로 변환
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('config', JSON.stringify({
                languageCode: 'ko-KR',
                enableMedicalVocabulary: true
            }));

            const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('음성 인식 실패');
            }

            const data = await response.json();
            console.log('[VoiceChart] STT 결과:', data);

            // 변환된 텍스트를 transcriptSegments에 추가
            if (data.segments && data.segments.length > 0) {
                setTranscriptSegments(prev => [
                    ...prev,
                    ...data.segments.map((seg: any) => ({
                        ...seg,
                        timestamp: new Date(seg.timestamp)
                    }))
                ]);
            }

            // 2. AI로 차트 생성 (TODO: Phase 2에서 구현)
            // 현재는 빈 차트 생성
            if (!chart) {
                const newChart = createEmptyInitialChart(patientId);
                newChart.chiefComplaint.complaint = data.segments[0]?.text || '';
                setChart(newChart);
            }

        } catch (error: any) {
            console.error('[VoiceChart] 에러:', error);
            alert('음성 인식 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    }, [chart, patientId]);

    // 오디오 청크 수신 (실시간 스트리밍용 - Phase 2)
    const handleAudioChunk = useCallback((chunk: Blob) => {
        // console.log('[VoiceChart] 오디오 청크:', chunk.size);
        // TODO: 실시간 음성 인식 구현
    }, []);

    // 차트 저장
    const handleSaveChart = async () => {
        if (!chart) {
            alert('저장할 차트가 없습니다.');
            return;
        }

        try {
            // TODO: Firestore에 저장
            console.log('[VoiceChart] 차트 저장:', chart);
            alert('차트가 저장되었습니다. (개발 중)');
        } catch (error: any) {
            alert('차트 저장 실패: ' + error.message);
        }
    };

    // 차트 초기화
    const handleReset = () => {
        if (confirm('모든 내용을 초기화하시겠습니까?')) {
            setTranscriptSegments([]);
            setChart(null);
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/clinical"
                                className="text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">
                                    🎙️ 음성 인식 진료 차트
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    대화를 듣고 자동으로 차트를 작성합니다
                                </p>
                            </div>
                        </div>

                        {/* 방문 유형 선택 */}
                        <div className="flex gap-2 bg-white rounded-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setVisitType('initial')}
                                className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                                    visitType === 'initial'
                                        ? 'bg-blue-500 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                초진
                            </button>
                            <button
                                onClick={() => setVisitType('followup')}
                                className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                                    visitType === 'followup'
                                        ? 'bg-blue-500 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                재진 (SOAP)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 메인 컨텐츠 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 녹음 및 대화 내용 */}
                    <div className="space-y-6">
                        {/* 녹음 컨트롤 */}
                        <AudioRecorderComponent
                            onRecordingComplete={handleRecordingComplete}
                            onRecordingStateChange={setRecordingState}
                            onAudioChunk={handleAudioChunk}
                        />

                        {/* 실시간 대화 내용 */}
                        <LiveTranscript
                            segments={transcriptSegments}
                            isRecording={recordingState.isRecording}
                        />
                    </div>

                    {/* 오른쪽: 차트 미리보기 */}
                    <div className="space-y-6">
                        {/* 차트 프리뷰 */}
                        <ChartPreview
                            chart={chart}
                            isGenerating={isGenerating}
                        />

                        {/* 액션 버튼 */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveChart}
                                disabled={!chart || isGenerating}
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors"
                            >
                                차트 저장
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                </div>

                {/* 도움말 */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>녹음 시작 버튼을 클릭하여 진료 대화를 녹음합니다</li>
                        <li>의사와 환자의 대화가 자동으로 텍스트로 변환됩니다</li>
                        <li>녹음 정지 후 AI가 자동으로 차트를 작성합니다</li>
                        <li>생성된 차트를 확인하고 필요시 수정한 후 저장합니다</li>
                    </ol>
                </div>

                {/* Phase 1 개발 상태 */}
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">🚧 Phase 1 개발 중</h4>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>✅ 음성 녹음 기능</li>
                        <li>✅ 실시간 텍스트 표시 (데모 모드)</li>
                        <li>✅ 차트 미리보기 UI</li>
                        <li>⏳ Google Speech-to-Text API 연동 (API 키 필요)</li>
                        <li>⏳ AI 차트 자동 생성 (Phase 2 예정)</li>
                        <li>⏳ 화자 구분 기능 (Phase 4 예정)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
