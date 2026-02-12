'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { db, storage } from '@/lib/firebase-clinical';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logAudit } from '@/lib/audit-client';

// Types for API responses
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
    const searchParams = useSearchParams();
    const visitIdParam = searchParams.get('visitId');
    const patientNameParam = searchParams.get('patientName');

    const [visitType, setVisitType] = useState<'initial' | 'followup'>('initial');
    const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
    const [recordingState, setRecordingState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0
    });
    const [chart, setChart] = useState<InitialVisitChart | SoapNote | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'saving' | 'completed' | 'error'>('idle');
    const [patientId] = useState(visitIdParam || 'demo-patient-001');
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recognition, setRecognition] = useState<any>(null);
    const [autoAnalyzeCount, setAutoAnalyzeCount] = useState(0);

    // Refs for auto-analyze timer
    const autoAnalyzeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isAnalyzingRef = useRef(false);
    const transcriptSegmentsRef = useRef<TranscriptSegment[]>([]);
    const lastAnalyzedLengthRef = useRef(0);

    // Keep ref in sync with state
    useEffect(() => {
        transcriptSegmentsRef.current = transcriptSegments;
    }, [transcriptSegments]);

    // ── 트랜스크립트를 발화 단위로 포맷팅 (AI 분석용) ──
    const formatTranscriptForAI = useCallback((segments: TranscriptSegment[]) => {
        const finalSegments = segments.filter(s => s.isFinal);
        return finalSegments.map((s, i) => `발화 ${i + 1}: ${s.text}`).join('\n');
    }, []);

    // ── 녹음된 텍스트를 차트에 바로 넣기 (AI 없이) ──
    const createChartFromTranscript = useCallback((segments: TranscriptSegment[]) => {
        const rawText = segments.filter(s => s.isFinal).map(s => s.text).join(' ');
        if (!rawText.trim()) return;

        const newChart = createEmptyInitialChart(patientId);
        newChart.chiefComplaint.complaint = rawText;
        newChart.rawTranscript = rawText;
        setChart(newChart);
        setAnalysisStatus('idle');
    }, [patientId]);

    // ── AI 분석 (수동 버튼) ──
    const handleAIAnalyze = useCallback(async () => {
        const finalSegments = transcriptSegments.filter(s => s.isFinal);
        if (finalSegments.length === 0) {
            alert('분석할 대화 내용이 없습니다. 먼저 녹음해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisStatus('analyzing');

        try {
            const formattedTranscript = formatTranscriptForAI(transcriptSegments);

            const response = await fetch('/api/clinical/analyze-chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: formattedTranscript,
                    visitType,
                    mode: 'final'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AI분석] 실패:', response.status, errorText);
                setAnalysisStatus('error');

                if (response.status === 429) {
                    alert('AI API 사용량 초과입니다. 잠시 후 다시 시도하세요.\n차트를 수동으로 편집할 수 있습니다.');
                } else {
                    alert('AI 분석에 실패했습니다. 차트를 수동으로 편집해주세요.');
                }
                return;
            }

            const analysisData = await response.json() as AnalysisResponse;
            console.log('[AI분석] 성공:', analysisData);

            // 분석 결과 차트에 반영
            if (analysisData.visitType === 'initial') {
                const baseChart = createEmptyInitialChart(patientId);
                const aiChart = analysisData.chartData as InitialVisitChart;
                // 원본 텍스트 보존
                const rawText = transcriptSegments.filter(s => s.isFinal).map(s => s.text).join(' ');

                const mergedChart: InitialVisitChart = {
                    ...baseChart,
                    ...aiChart,
                    chiefComplaint: { ...baseChart.chiefComplaint, ...aiChart.chiefComplaint },
                    history: { ...baseChart.history, ...aiChart.history },
                    occupationalHistory: { ...baseChart.occupationalHistory, ...aiChart.occupationalHistory },
                    physicalExam: { ...baseChart.physicalExam, ...aiChart.physicalExam },
                    imagingPlan: { ...baseChart.imagingPlan, ...aiChart.imagingPlan },
                    diagnosis: { ...baseChart.diagnosis, ...aiChart.diagnosis },
                    rawTranscript: rawText
                };

                if (analysisData.suggestions?.xray?.length) {
                    const xrayViews = analysisData.suggestions.xray.flatMap(rec => rec.views);
                    const existingViews = mergedChart.imagingPlan.xrayViews || [];
                    mergedChart.imagingPlan.xrayViews = Array.from(new Set([...existingViews, ...xrayViews]));
                    const reasons = analysisData.suggestions.xray.map(rec => rec.reason).join(', ');
                    mergedChart.imagingPlan.reason = mergedChart.imagingPlan.reason
                        ? `${mergedChart.imagingPlan.reason}, ${reasons}`
                        : reasons;
                }

                if (analysisData.suggestions?.diagnosis?.length) {
                    const diagnoses = analysisData.suggestions.diagnosis.map(dx => `${dx.icd10Code} ${dx.name}`);
                    const existingDx = mergedChart.diagnosis.suspectedDiagnosis || [];
                    mergedChart.diagnosis.suspectedDiagnosis = Array.from(new Set([...existingDx, ...diagnoses]));
                }

                setChart(mergedChart);
            } else {
                setChart(analysisData.chartData);
            }

            // 화자 분리 결과 업데이트
            if (analysisData.diarizedSegments?.length) {
                const newSegments: TranscriptSegment[] = analysisData.diarizedSegments.map((seg) => ({
                    text: seg.text,
                    confidence: 1.0,
                    isFinal: true,
                    timestamp: new Date(),
                    speaker: seg.speaker
                }));
                setTranscriptSegments(newSegments);
            }

            setAnalysisStatus('success');
        } catch (error) {
            console.error('[AI분석] 에러:', error);
            setAnalysisStatus('error');
            alert('AI 분석 중 오류가 발생했습니다. 차트를 수동으로 편집해주세요.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [transcriptSegments, visitType, patientId, formatTranscriptForAI]);

    // ── 실시간 자동 분석 (30초마다, realtime 모드 = API 1회) ──
    const runRealtimeAnalysis = useCallback(async () => {
        const segments = transcriptSegmentsRef.current;
        const finalSegments = segments.filter(s => s.isFinal);

        // 새 발화가 없으면 스킵
        if (finalSegments.length <= lastAnalyzedLengthRef.current || finalSegments.length < 2) return;
        if (isAnalyzingRef.current) return;

        isAnalyzingRef.current = true;
        setIsAnalyzing(true);
        setAnalysisStatus('analyzing');

        try {
            const formatted = finalSegments.map((s, i) => `발화 ${i + 1}: ${s.text}`).join('\n');
            const response = await fetch('/api/clinical/analyze-chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: formatted, visitType, mode: 'realtime' })
            });

            if (response.ok) {
                const data = await response.json() as AnalysisResponse;
                console.log('[자동분석] 실시간 결과:', data);

                if (data.visitType === 'initial') {
                    const baseChart = createEmptyInitialChart(patientId);
                    const aiChart = data.chartData as InitialVisitChart;
                    const rawText = finalSegments.map(s => s.text).join(' ');
                    setChart({
                        ...baseChart,
                        ...aiChart,
                        chiefComplaint: { ...baseChart.chiefComplaint, ...aiChart.chiefComplaint },
                        history: { ...baseChart.history, ...aiChart.history },
                        occupationalHistory: { ...baseChart.occupationalHistory, ...aiChart.occupationalHistory },
                        physicalExam: { ...baseChart.physicalExam, ...aiChart.physicalExam },
                        imagingPlan: { ...baseChart.imagingPlan, ...aiChart.imagingPlan },
                        diagnosis: { ...baseChart.diagnosis, ...aiChart.diagnosis },
                        rawTranscript: rawText
                    });
                }

                lastAnalyzedLengthRef.current = finalSegments.length;
                setAutoAnalyzeCount(prev => prev + 1);
                setAnalysisStatus('success');
            } else {
                console.warn('[자동분석] 실패:', response.status);
                setAnalysisStatus('error');
            }
        } catch (e) {
            console.warn('[자동분석] 에러:', e);
            setAnalysisStatus('error');
        } finally {
            isAnalyzingRef.current = false;
            setIsAnalyzing(false);
        }
    }, [visitType, patientId]);

    // ── 녹음 중 30초 타이머 ──
    useEffect(() => {
        if (recordingState.isRecording && !recordingState.isPaused) {
            // 녹음 시작 시 카운터 리셋
            lastAnalyzedLengthRef.current = 0;
            setAutoAnalyzeCount(0);

            autoAnalyzeTimerRef.current = setInterval(() => {
                runRealtimeAnalysis();
            }, 30000); // 30초마다

            return () => {
                if (autoAnalyzeTimerRef.current) {
                    clearInterval(autoAnalyzeTimerRef.current);
                    autoAnalyzeTimerRef.current = null;
                }
            };
        } else {
            // 녹음 정지 시 타이머 해제
            if (autoAnalyzeTimerRef.current) {
                clearInterval(autoAnalyzeTimerRef.current);
                autoAnalyzeTimerRef.current = null;
            }
        }
    }, [recordingState.isRecording, recordingState.isPaused, runRealtimeAnalysis]);

    // Initialize Web Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('@/lib/voice/speech-recognition').then(({ WebSpeechRecognition }) => {
                try {
                    const speechRecognition = new WebSpeechRecognition((segment) => {
                        setTranscriptSegments(prev => {
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
        if (state.isRecording && !state.isPaused) {
            recognition?.start();
        } else {
            recognition?.stop();
        }
    }, [recognition]);

    // ── 녹음 완료: AI 호출 없이 텍스트만 차트에 넣기 ──
    const handleRecordingComplete = useCallback((audioBlob: Blob) => {
        console.log('[VoiceChart] 녹음 완료:', audioBlob.size, 'bytes');
        setRecordedBlob(audioBlob);

        // 즉시 텍스트를 차트에 넣기 (AI 호출 안 함)
        createChartFromTranscript(transcriptSegments);
    }, [transcriptSegments, createChartFromTranscript]);

    // 오디오 청크 수신
    const handleAudioChunk = useCallback(() => {}, []);

    // 차트 저장 (Firestore — visits 컬렉션에 업데이트)
    const handleSaveChart = async () => {
        if (!chart) {
            alert('저장할 차트가 없습니다.');
            return;
        }

        setSaveStatus('uploading');

        try {
            let audioUrl = null;

            if (recordedBlob) {
                const timestamp = Date.now();
                const storageRef = ref(storage, `voice-charts/${patientId}/${timestamp}.webm`);
                const metadata = {
                    contentType: 'audio/webm',
                    customMetadata: { patientId, visitType }
                };

                let uploadSuccess = false;
                let retryCount = 0;
                while (!uploadSuccess && retryCount < 3) {
                    try {
                        const snapshot = await uploadBytes(storageRef, recordedBlob, metadata);
                        audioUrl = await getDownloadURL(snapshot.ref);
                        uploadSuccess = true;
                    } catch (e) {
                        retryCount++;
                        if (retryCount >= 3) throw e;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            setSaveStatus('saving');

            // InitialVisitChart → Visit 필드로 변환
            const initialChart = chart as InitialVisitChart;
            const cc = initialChart.chiefComplaint?.complaint || '';
            const history = [
                initialChart.history?.onsetDate ? `발병: ${initialChart.history.onsetDate}` : '',
                initialChart.history?.traumaHistory ? `외상: ${initialChart.history.traumaHistory}` : '',
                initialChart.history?.surgeryHistory ? `수술: ${initialChart.history.surgeryHistory}` : '',
                initialChart.history?.painLocation?.length ? `부위: ${initialChart.history.painLocation.join(', ')}` : '',
                initialChart.occupationalHistory?.occupation ? `직업: ${initialChart.occupationalHistory.occupation}` : '',
                initialChart.occupationalHistory?.exercises?.length ? `운동: ${initialChart.occupationalHistory.exercises.join(', ')}` : '',
            ].filter(Boolean).join('\n');

            const xrayViews = initialChart.imagingPlan?.xrayViews || [];
            const testOrder = xrayViews.join(', ');
            const diagnosis = initialChart.diagnosis?.suspectedDiagnosis?.join(', ') || '';
            const rawTranscript = transcriptSegments.filter(s => s.isFinal).map(s => s.text).join(' ');

            // P/E 데이터를 하나의 문자열로 결합
            const physicalExam = [
                initialChart.physicalExam?.inspection ? `시진: ${initialChart.physicalExam.inspection}` : '',
                initialChart.physicalExam?.palpation ? `촉진: ${initialChart.physicalExam.palpation}` : '',
                initialChart.physicalExam?.rangeOfMotion ? `ROM: ${initialChart.physicalExam.rangeOfMotion}` : '',
                initialChart.physicalExam?.specialTests?.length ? `특수검사: ${initialChart.physicalExam.specialTests.join(', ')}` : '',
            ].filter(Boolean).join('\n');

            // visitId가 있으면 visits 컬렉션 업데이트 (진료실 연동)
            if (visitIdParam) {
                const visitRef = doc(db, 'visits', visitIdParam);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const visitUpdate: Record<string, any> = {
                    chiefComplaint: cc,
                    history: history,
                    diagnosis: diagnosis,
                    physicalExam: physicalExam,
                    updatedAt: serverTimestamp(),
                    voiceChartAudioUrl: audioUrl,
                    voiceChartRawTranscript: rawTranscript,
                };

                // X-ray 오더가 있으면 검사실로 전달
                if (testOrder) {
                    visitUpdate.testOrder = testOrder;
                    visitUpdate.testStatus = 'ordered';
                }

                await updateDoc(visitRef, visitUpdate);
                logAudit({
                    action: 'update',
                    collection: 'visits',
                    documentId: visitIdParam,
                    after: visitUpdate as Record<string, unknown>,
                    description: '음성차트 저장',
                });
                console.log('[VoiceChart] Visit 업데이트 완료:', visitIdParam);

                setSaveStatus('completed');
                alert('차트가 환자 기록에 저장되었습니다.' + (testOrder ? `\n검사 오더: ${testOrder}` : ''));

                if (confirm('진료실로 돌아가시겠습니까?')) {
                    window.location.href = `/clinical/consulting/${visitIdParam}`;
                }
            } else {
                // visitId 없으면 별도 charts 컬렉션에 저장 (독립 모드)
                const chartData = {
                    ...chart,
                    chiefComplaint: cc,
                    history,
                    testOrder,
                    diagnosis,
                    transcriptSegments,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: 'completed',
                    audioUrl
                };

                const newDocRef = await addDoc(collection(db, 'charts'), chartData);
                logAudit({
                    action: 'create',
                    collection: 'charts',
                    documentId: newDocRef.id,
                    description: '독립 음성차트 생성',
                });
                console.log('[VoiceChart] 차트 저장 완료:', newDocRef.id);

                setSaveStatus('completed');
                alert(`차트가 저장되었습니다. (ID: ${newDocRef.id})`);

                if (confirm('새로운 진료를 시작하시겠습니까?')) {
                    handleReset();
                }
            }
        } catch (error: unknown) {
            setSaveStatus('error');
            const err = error as Error;
            console.error('차트 저장 실패:', err);
            alert('차트 저장 실패: ' + err.message);
        } finally {
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // 차트 초기화
    const handleReset = () => {
        if (confirm('모든 내용을 초기화하시겠습니까?')) {
            setTranscriptSegments([]);
            setChart(null);
            setRecordedBlob(null);
            setIsAnalyzing(false);
            setAnalysisStatus('idle');
            setSaveStatus('idle');
        }
    };

    const hasTranscript = transcriptSegments.filter(s => s.isFinal).length > 0;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href={visitIdParam ? `/clinical/consulting/${visitIdParam}` : '/clinical'}
                                className="text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                    🎙️ 음성 인식 진료 차트
                                    {patientNameParam && (
                                        <span className="text-lg font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                            {patientNameParam}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    대화를 녹음하고, AI 분석 또는 수동으로 차트를 작성합니다
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
                        <AudioRecorderComponent
                            onRecordingComplete={(blob: Blob) => {
                                handleRecordingComplete(blob);
                            }}
                            onRecordingStateChange={handleStateChange}
                            onAudioChunk={handleAudioChunk}
                        />

                        <LiveTranscript
                            segments={transcriptSegments}
                            isRecording={recordingState.isRecording}
                            isAnalyzing={isAnalyzing}
                        />

                        {/* 녹음 중 자동 분석 상태 */}
                        {recordingState.isRecording && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"/>
                                    <span className="text-sm text-purple-700">
                                        30초마다 AI 자동 분석 중
                                    </span>
                                </div>
                                <span className="text-xs text-purple-500">
                                    분석 횟수: {autoAnalyzeCount}회
                                </span>
                            </div>
                        )}

                        {/* AI 분석 버튼 (녹음 완료 후 표시) */}
                        {hasTranscript && !recordingState.isRecording && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAIAnalyze}
                                        disabled={isAnalyzing}
                                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                AI 분석 중...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                AI 자동 분석 (히스토리 분할)
                                            </>
                                        )}
                                    </button>
                                </div>
                                {analysisStatus === 'success' && (
                                    <p className="text-sm text-green-600 mt-2 text-center">AI 분석 완료 - 각 항목이 자동으로 채워졌습니다</p>
                                )}
                                {analysisStatus === 'error' && (
                                    <p className="text-sm text-orange-600 mt-2 text-center">AI 분석 실패 - 아래 차트를 수동으로 편집하세요</p>
                                )}
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    AI 없이도 아래 차트에서 직접 수정/입력할 수 있습니다
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 차트 미리보기 */}
                    <div className="space-y-6">
                        <ChartPreview
                            chart={chart}
                            isGenerating={isAnalyzing}
                            onChartChange={setChart}
                        />

                        {/* 액션 버튼 */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveChart}
                                disabled={!chart || isAnalyzing || saveStatus === 'uploading' || saveStatus === 'saving'}
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {saveStatus === 'uploading' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                        음성 업로드 중...
                                    </>
                                ) : saveStatus === 'saving' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                        저장 중...
                                    </>
                                ) : (
                                    visitIdParam ? '환자 기록에 저장' : '차트 저장'
                                )}
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

                {/* 사용 안내 */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li><strong>녹음</strong> — 녹음 시작 버튼으로 진료 대화를 녹음합니다</li>
                        <li><strong>자동 분석</strong> — 녹음 중 30초마다 AI가 자동으로 차트를 분석합니다</li>
                        <li><strong>추가 분석</strong> — 녹음 완료 후 &quot;AI 자동 분석&quot; 버튼으로 최종 분석 (X-ray, 진단 포함)</li>
                        <li><strong>수동 편집</strong> — AI 없이도 우측 차트에서 직접 입력/수정 가능합니다</li>
                        <li><strong>저장</strong> — 차트 저장 버튼으로 Firestore에 저장합니다</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
