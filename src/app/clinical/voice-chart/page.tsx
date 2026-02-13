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
        } catch (error: unknown) {
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
        <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <Link
                            href={visitIdParam ? `/clinical/consulting/${visitIdParam}` : '/clinical'}
                            className="mt-1 w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all duration-300 group"
                        >
                            <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">AI Voice Chart</h1>
                                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-full border border-indigo-100">Pro Version</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-slate-500 font-medium">실시간 음성 인식을 통한 최적화된 EMR 차팅 시스템</p>
                                {patientNameParam && (
                                    <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-100">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        {patientNameParam} 환자 진료 중
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Visit Type Switcher */}
                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-hidden self-start md:self-auto">
                        <button
                            onClick={() => setVisitType('initial')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                visitType === 'initial'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span>📝</span> 초진 기록
                        </button>
                        <button
                            onClick={() => setVisitType('followup')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                visitType === 'followup'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <span>🔄</span> 재진 (SOAP)
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Left: Input & Transcript (5 cols) */}
                    <div className="xl:col-span-12 lg:xl:col-span-5 space-y-8">
                        <AudioRecorderComponent
                            onRecordingComplete={handleRecordingComplete}
                            onRecordingStateChange={handleStateChange}
                            onAudioChunk={handleAudioChunk}
                        />

                        <LiveTranscript
                            segments={transcriptSegments}
                            isRecording={recordingState.isRecording}
                            isAnalyzing={isAnalyzing}
                        />

                        {/* Status Bar */}
                        {recordingState.isRecording && (
                            <div className="bg-white rounded-2xl border border-indigo-100 p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Auto Analysis</p>
                                        <p className="text-sm font-bold text-slate-700">30초 주기 실시간 데이터 동기화 활성화</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cycles</p>
                                    <p className="text-lg font-black text-indigo-600">{autoAnalyzeCount}</p>
                                </div>
                            </div>
                        )}

                        {/* Final AI Action */}
                        {hasTranscript && !recordingState.isRecording && (
                            <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-xl shadow-indigo-100/20 space-y-4">
                                <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">✨</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 tracking-tight">AI 정밀 분석 (Beta)</h4>
                                        <p className="text-xs text-slate-400 font-medium">영상 검사 및 예상 진단명을 포함한 종합 레포트 생성</p>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleAIAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full group relative overflow-hidden px-6 py-4 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 text-white rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"/>
                                            AI 정밀 분석 중...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            AI 종합 차트 생성하기
                                        </>
                                    )}
                                </button>
                                
                                <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    <span>Google Gemini Pro 1.5</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <span>Diarization v2</span>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Right: Preview & Controls (7 cols) */}
                    <div className="xl:col-span-12 lg:xl:col-span-7 space-y-6">
                        <ChartPreview
                            chart={chart}
                            isGenerating={isAnalyzing}
                            onChartChange={setChart}
                        />

                        {/* Save Actions Panel */}
                        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-900/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                                    chart ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/20'
                                }`}>
                                    {saveStatus === 'completed' ? '🎉' : '💾'}
                                </div>
                                <div>
                                    <h4 className="text-xl font-black tracking-tight mb-1">진료 기록 저장이 준비되었습니다</h4>
                                    <p className="text-indigo-200/50 text-sm font-medium">검토 후 차트를 저장하면 환자의 타임라인에 즉시 반영됩니다</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
                                >
                                    초기화
                                </button>
                                <button
                                    onClick={handleSaveChart}
                                    disabled={!chart || isAnalyzing || saveStatus === 'uploading' || saveStatus === 'saving'}
                                    className="flex-[2] md:flex-none px-10 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
                                >
                                    {saveStatus === 'uploading' ? '데이터 전송 중...' : saveStatus === 'saving' ? '저장 처리 중...' : (
                                        <>
                                            {visitIdParam ? '환자 기록 저장 완료' : '차트 영구 저장'}
                                            <svg className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Guide Card */}
                        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100/50 p-6 flex gap-4">
                            <div className="text-2xl pt-1">💡</div>
                            <div className="space-y-3">
                                <h4 className="font-black text-indigo-900 tracking-tight">Smart Charting Tip</h4>
                                <ul className="text-sm text-indigo-800/70 font-bold space-y-2 list-none">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></span>
                                        실시간 대화 도중에도 오른쪽 차트 항목을 직접 클릭하여 수정할 수 있습니다.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></span>
                                        AI 분석은 대화의 맥락을 파악하여 적절한 상병 코드와 X-ray 뷰를 추천합니다.
                                    </li>
                                </ul>
                            </div>
                        </div>
                </div>
            </div>
        </div>
    );
}
