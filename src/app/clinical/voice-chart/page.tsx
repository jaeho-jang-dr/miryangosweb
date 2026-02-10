'use client';

import { useState, useCallback, useEffect } from 'react';
import { AudioRecorderComponent } from './components/AudioRecorderComponent';
import { LiveTranscript } from './components/LiveTranscript';
import { ChartPreview } from './components/ChartPreview';
import type { TranscriptSegment } from '@/lib/voice/speech-recognition';
import type { RecordingState } from '@/lib/voice/audio-recorder';
import type { InitialVisitChart } from '@/lib/medical/templates/initial-visit-template';
import type { SoapNote } from '@/lib/medical/templates/soap-note-template';
import { createEmptyInitialChart } from '@/lib/medical/templates/initial-visit-template';
import Link from 'next/link';
import type { DiarizedSegment } from '@/lib/medical/speaker-diarization';
import { db } from '@/lib/firebase-clinical';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Types for API responses
interface TranscriptionResponse {
    segments: { text: string; timestamp: string; }[];
}

interface AnalysisResponse {
    visitType: 'initial' | 'followup';
    chartData: InitialVisitChart | SoapNote;
    suggestions?: {
        xray?: { views: string[], reason: string }[];
        diagnosis?: { icd10Code: string, name: string }[];
    };
    diarizedSegments?: DiarizedSegment[];
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recognition, setRecognition] = useState<any>(null);

    // Initialize Web Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('@/lib/voice/speech-recognition').then(({ WebSpeechRecognition }) => {
                try {
                    const speechRecognition = new WebSpeechRecognition((segment) => {
                        setTranscriptSegments(prev => {
                            // Filter out existing temporary segments if new one is final
                            // or replace the last temporary segment
                            const filtered = prev.filter(p => p.isFinal);
                            return [...filtered, segment];
                        });
                    });
                    setRecognition(speechRecognition);
                } catch (e) {
                    console.warn('Web Speech API not supported:', e);
                }
            });
        }
    }, []);

    // Handle recording state changes to toggle recognition
    const handleStateChange = useCallback((state: RecordingState) => {
        setRecordingState(state);
        // Toggle recognition based on recording state
        if (state.isRecording && !state.isPaused) {
            recognition?.start();
        } else {
            recognition?.stop();
        }
    }, [recognition]);

    // 녹음 완료 시 음성 인식 및 차트 생성
    const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
        console.log('[VoiceChart] 녹음 완료:', audioBlob.size, 'bytes');

        try {
            setIsGenerating(true);

            let fullTranscript = '';

            // 1. 이미 실시간 인식된 텍스트가 있는지 확인 (Web Speech API)
            // isFinal이 아닌 임시 텍스트도 포함할지 여부는 선택사항이나, 
            // 녹음 종료 시점에는 보통 isFinal이 완료되었거나 마지막 청크로 남음.
            if (transcriptSegments.length > 0) {
                fullTranscript = transcriptSegments
                    .map(s => s.text)
                    .join(' ');
                console.log('[VoiceChart] 실시간 인식 결과 사용:', fullTranscript);
            }

            // 2. 실시간 결과가 없으면 서버 STT API 호출 (Fallback)
            if (!fullTranscript.trim()) {
                console.log('[VoiceChart] 실시간 결과 없음, 서버 STT API 호출...');
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

                const data = await response.json() as TranscriptionResponse;
                fullTranscript = data.segments.map((s) => s.text).join(' ');
                console.log('[VoiceChart] 서버 STT 결과 사용:', data);
            }

            if (!fullTranscript.trim()) {
                alert('인식된 음성이 없습니다. 다시 시도해주세요.');
                return;
            }

            // 3. AI로 차트 생성 (Phase 2 Implement)
            const analysisResponse = await fetch('/api/clinical/analyze-chart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcript: fullTranscript,
                    visitType: visitType
                })
            });

            if (!analysisResponse.ok) {
                console.error('AI Analysis failed:', await analysisResponse.text());
                // Fallback to empty chart
                if (!chart) {
                    const newChart = createEmptyInitialChart(patientId);
                    newChart.chiefComplaint.complaint = fullTranscript;
                    setChart(newChart);
                }
            } else {
                const analysisData = await analysisResponse.json() as AnalysisResponse;
                console.log('[VoiceChart] AI Analysis Result:', analysisData);
                
                // Update chart state with AI extracted data
                if (analysisData.visitType === 'initial') {
                    // Start with empty chart to ensure structure
                    const baseChart = createEmptyInitialChart(patientId);
                    const aiChart = analysisData.chartData as InitialVisitChart;

                    // Merge AI data
                    const mergedChart: InitialVisitChart = {
                        ...baseChart,
                        ...aiChart,
                        chiefComplaint: { ...baseChart.chiefComplaint, ...aiChart.chiefComplaint },
                        history: { ...baseChart.history, ...aiChart.history },
                        physicalExam: { ...baseChart.physicalExam, ...aiChart.physicalExam },
                        imagingPlan: { ...baseChart.imagingPlan, ...aiChart.imagingPlan },
                        diagnosis: { ...baseChart.diagnosis, ...aiChart.diagnosis }
                    };
                    
                    // Add X-ray recommendations to Imaging Plan (Phase 3)
                    if (analysisData.suggestions?.xray?.length) {
                        const xrayViews = analysisData.suggestions.xray.flatMap(rec => rec.views);
                        // Merge with existing xrayViews, avoiding duplicates
                        const existingViews = mergedChart.imagingPlan.xrayViews || [];
                        mergedChart.imagingPlan.xrayViews = Array.from(new Set([...existingViews, ...xrayViews]));
                        
                        // Add reasons
                        const reasons = analysisData.suggestions.xray.map(rec => rec.reason).join(', ');
                         if (!mergedChart.imagingPlan.reason) {
                            mergedChart.imagingPlan.reason = reasons;
                        } else {
                            mergedChart.imagingPlan.reason += `, ${reasons}`;
                        }
                    }

                    // Add Diagnosis suggestions (Phase 3)
                    if (analysisData.suggestions?.diagnosis?.length) {
                        const diagnoses = analysisData.suggestions.diagnosis.map(dx => `${dx.icd10Code} ${dx.name}`);
                        const existingDx = mergedChart.diagnosis.suspectedDiagnosis || [];
                        mergedChart.diagnosis.suspectedDiagnosis = Array.from(new Set([...existingDx, ...diagnoses]));
                    }

                    setChart(mergedChart);
                } else {
                    // Use SOAP note structure (Assuming createEmptySoapNote exists or just use analysisData)
                    // For now heavily relying on AI structure
                    setChart(analysisData.chartData);
                }

                // Update transcript with diarized segments (Phase 4)
                if (analysisData.diarizedSegments && analysisData.diarizedSegments.length > 0) {
                    const newSegments: TranscriptSegment[] = analysisData.diarizedSegments.map((seg) => ({
                        text: seg.text,
                        confidence: 1.0,
                        isFinal: true,
                        timestamp: new Date(), // Timestamp approximate
                        speaker: seg.speaker
                    }));
                    setTranscriptSegments(newSegments);
                }
            }

        } catch (error: unknown) {
            const err = error as Error;
            console.error('[VoiceChart] 에러:', err);
            alert('음성 인식 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    }, [chart, patientId, visitType, transcriptSegments]); // Added visitType dependency


    // 오디오 청크 수신 (실시간 스트리밍용 - Phase 2)
    const handleAudioChunk = useCallback(() => {
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
            const chartData = {
                ...chart,
                transcriptSegments, // 대화 내용 포함
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'completed', // 상태 관리 (임시)
                audioUrl: null // TODO: 오디오 파일 업로드 후 URL 저장 (Phase 5+)
            };

            // Firestore에 저장
            const docRef = await addDoc(collection(db, 'charts'), chartData);
            console.log('[VoiceChart] 차트 저장 완료:', docRef.id);
            
            alert(`차트가 성공적으로 저장되었습니다.\n문서 ID: ${docRef.id}`);
            
            // 성공 후 초기화 여부 확인
            if (confirm('저장이 완료되었습니다. 새로운 진료를 시작하시겠습니까?')) {
                handleReset();
            }

        } catch (error: unknown) {
            const err = error as Error;
            console.error('차트 저장 실패:', err);
            alert('차트 저장 실패: ' + err.message);
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
                            onRecordingComplete={(blob: Blob) => {
                                void handleRecordingComplete(blob);
                            }}
                            onRecordingStateChange={handleStateChange}
                            onAudioChunk={handleAudioChunk}
                        />

                        {/* 실시간 대화 내용 */}
                        <LiveTranscript
                            segments={transcriptSegments}
                            isRecording={recordingState.isRecording}
                            isAnalyzing={isGenerating}
                        />
                    </div>

                    {/* 오른쪽: 차트 미리보기 */}
                    <div className="space-y-6">
                        {/* 차트 프리뷰 */}
                        <ChartPreview
                            chart={chart}
                            isGenerating={isGenerating}
                            onChartChange={setChart}
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

                {/* 시스템 상태 */}
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">✅ 시스템 상태</h4>
                    <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                        <li>✅ 음성 녹음 기능</li>
                        <li>✅ 실시간 텍스트 표시 & 화자 분리</li>
                        <li>✅ 차트 미리보기 & 수정 UI</li>
                        <li>✅ AI 차트 자동 생성 (Gemini v2)</li>
                        <li>✅ Firestore 차트 저장 (Phase 5 완료)</li>
                        <li>⏳ 오디오 파일 영구 저장 (Phase 5+ 예정)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
