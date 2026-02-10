/**
 * Google Speech-to-Text API 통합
 *
 * 실시간 음성을 텍스트로 변환
 */

export interface TranscriptSegment {
    /** 변환된 텍스트 */
    text: string;
    /** 신뢰도 (0-1) */
    confidence: number;
    /** 최종 결과 여부 */
    isFinal: boolean;
    /** 타임스탬프 */
    timestamp: Date;
    /** 화자 (선택) */
    speaker?: 'doctor' | 'patient';
}

export interface SpeechRecognitionConfig {
    /** 언어 코드 */
    languageCode?: string;
    /** 샘플 레이트 */
    sampleRateHertz?: number;
    /** 오디오 인코딩 */
    encoding?: 'LINEAR16' | 'WEBM_OPUS';
    /** 의료 용어 힌트 */
    enableMedicalVocabulary?: boolean;
    /** 자동 구두점 */
    enableAutomaticPunctuation?: boolean;
}

export class SpeechRecognitionService {
    private config: Required<SpeechRecognitionConfig>;
    private onTranscriptCallback?: (segment: TranscriptSegment) => void;

    constructor(
        config: SpeechRecognitionConfig = {},
        onTranscript?: (segment: TranscriptSegment) => void
    ) {
        this.config = {
            languageCode: config.languageCode || 'ko-KR',
            sampleRateHertz: config.sampleRateHertz || 48000,
            encoding: config.encoding || 'WEBM_OPUS',
            enableMedicalVocabulary: config.enableMedicalVocabulary ?? true,
            enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true
        };
        this.onTranscriptCallback = onTranscript;
    }

    /**
     * 오디오 Blob을 텍스트로 변환
     *
     * @param audioBlob - 오디오 데이터
     * @returns 변환된 텍스트
     */
    async transcribeAudio(audioBlob: Blob): Promise<TranscriptSegment[]> {
        try {
            // FormData 생성
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('config', JSON.stringify({
                languageCode: this.config.languageCode,
                sampleRateHertz: this.config.sampleRateHertz,
                encoding: this.config.encoding,
                enableAutomaticPunctuation: this.config.enableAutomaticPunctuation,
                enableMedicalVocabulary: this.config.enableMedicalVocabulary
            }));

            // API 호출
            const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`음성 인식 실패: ${response.statusText}`);
            }

            const data = await response.json();
            return data.segments || [];

        } catch (error: any) {
            console.error('음성 인식 에러:', error);
            throw error;
        }
    }

    /**
     * 스트리밍 음성 인식 (실시간)
     *
     * @param audioStream - 오디오 스트림
     * @returns 스트림 제어 객체
     */
    async startStreamingRecognition(
        audioStream: MediaStream
    ): Promise<StreamingRecognition> {
        return new StreamingRecognition(
            audioStream,
            this.config,
            this.onTranscriptCallback
        );
    }

    /**
     * 의료 용어 힌트 설정
     */
    setMedicalVocabulary(terms: string[]): void {
        // 추후 구현: 커스텀 의료 용어 등록
        console.log('의료 용어 힌트 설정:', terms);
    }
}

/**
 * 스트리밍 음성 인식 클래스
 */
export class StreamingRecognition {
    private ws: WebSocket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private isActive = false;

    constructor(
        private audioStream: MediaStream,
        private config: Required<SpeechRecognitionConfig>,
        private onTranscript?: (segment: TranscriptSegment) => void
    ) {}

    /**
     * 스트리밍 시작
     */
    async start(): Promise<void> {
        try {
            // WebSocket 연결
            this.ws = new WebSocket(
                `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/voice/stream`
            );

            this.ws.onopen = () => {
                console.log('[STT] WebSocket 연결됨');
                this.isActive = true;

                // 설정 전송
                this.ws?.send(JSON.stringify({
                    type: 'config',
                    config: this.config
                }));

                // MediaRecorder 시작
                this.startMediaRecorder();
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'transcript') {
                    const segment: TranscriptSegment = {
                        text: data.text,
                        confidence: data.confidence || 0,
                        isFinal: data.isFinal || false,
                        timestamp: new Date(data.timestamp)
                    };

                    this.onTranscript?.(segment);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[STT] WebSocket 에러:', error);
            };

            this.ws.onclose = () => {
                console.log('[STT] WebSocket 종료');
                this.isActive = false;
            };

        } catch (error) {
            console.error('[STT] 스트리밍 시작 실패:', error);
            throw error;
        }
    }

    /**
     * MediaRecorder로 오디오 청크 전송
     */
    private startMediaRecorder(): void {
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
                // 오디오 청크를 WebSocket으로 전송
                event.data.arrayBuffer().then(buffer => {
                    this.ws?.send(buffer);
                });
            }
        };

        // 500ms마다 청크 전송
        this.mediaRecorder.start(500);
    }

    /**
     * 스트리밍 정지
     */
    stop(): void {
        this.isActive = false;

        if (this.mediaRecorder?.state !== 'inactive') {
            this.mediaRecorder?.stop();
        }

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }

    /**
     * 활성 상태 확인
     */
    isStreaming(): boolean {
        return this.isActive;
    }
}

/**
 * Web Speech API 사용 (브라우저 기본 - 대체 방법)
 */
export class WebSpeechRecognition {
    private recognition: any = null;
    private isListening = false;

    constructor(
        private onTranscript?: (segment: TranscriptSegment) => void
    ) {
        // @ts-ignore - Web Speech API 브라우저 호환성
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            throw new Error('브라우저가 Web Speech API를 지원하지 않습니다.');
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ko-KR';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                const segment: TranscriptSegment = {
                    text: transcript,
                    confidence: result[0].confidence || 0,
                    isFinal: result.isFinal,
                    timestamp: new Date()
                };

                this.onTranscript?.(segment);
            }
        };

        this.recognition.onerror = (event: any) => {
            console.error('[Web Speech] 에러:', event.error);
        };

        this.recognition.onend = () => {
            // 연속 인식을 위해 자동 재시작
            if (this.isListening) {
                this.recognition.start();
            }
        };
    }

    start(): void {
        this.isListening = true;
        this.recognition.start();
    }

    stop(): void {
        this.isListening = false;
        this.recognition.stop();
    }
}

/**
 * 음성 인식 서비스 팩토리
 */
export function createSpeechRecognition(
    useWebSpeech = false
): SpeechRecognitionService | WebSpeechRecognition {
    if (useWebSpeech) {
        return new WebSpeechRecognition();
    }
    return new SpeechRecognitionService();
}
