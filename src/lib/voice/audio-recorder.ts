/**
 * 오디오 녹음 유틸리티
 *
 * 브라우저 MediaRecorder API를 사용한 실시간 오디오 녹음
 */

export interface AudioRecorderConfig {
    /** 오디오 샘플 레이트 (Hz) */
    sampleRate?: number;
    /** 채널 수 (1: 모노, 2: 스테레오) */
    channels?: number;
    /** MIME 타입 */
    mimeType?: string;
    /** 타임슬라이스 (ms) - 청크 단위 */
    timeslice?: number;
}

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number; // seconds
    audioBlob?: Blob;
}

export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private startTime: number = 0;
    private pausedTime: number = 0;
    private onDataAvailable?: (chunk: Blob) => void;
    private onStateChange?: (state: RecordingState) => void;

    constructor(
        private config: AudioRecorderConfig = {},
        callbacks?: {
            onDataAvailable?: (chunk: Blob) => void;
            onStateChange?: (state: RecordingState) => void;
        }
    ) {
        this.onDataAvailable = callbacks?.onDataAvailable;
        this.onStateChange = callbacks?.onStateChange;
    }

    /**
     * 녹음 시작
     */
    async startRecording(): Promise<void> {
        try {
            // 마이크 권한 요청
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.config.sampleRate || 48000,
                    channelCount: this.config.channels || 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // MediaRecorder 생성
            const mimeType = this.config.mimeType || this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

            // 이벤트 핸들러 등록
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    this.onDataAvailable?.(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.notifyStateChange();
            };

            this.mediaRecorder.onstart = () => {
                this.startTime = Date.now();
                this.notifyStateChange();
            };

            this.mediaRecorder.onpause = () => {
                this.pausedTime = Date.now();
                this.notifyStateChange();
            };

            this.mediaRecorder.onresume = () => {
                if (this.pausedTime > 0) {
                    this.startTime += (Date.now() - this.pausedTime);
                    this.pausedTime = 0;
                }
                this.notifyStateChange();
            };

            // 녹음 시작 (timeslice 설정 시 청크 단위로 데이터 전달)
            if (this.config.timeslice) {
                this.mediaRecorder.start(this.config.timeslice);
            } else {
                this.mediaRecorder.start();
            }

        } catch (error) {
            console.error('녹음 시작 실패:', error);
            throw new Error('마이크 접근 권한이 필요합니다.');
        }
    }

    /**
     * 녹음 정지
     */
    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('녹음이 시작되지 않았습니다.'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, {
                    type: this.mediaRecorder?.mimeType || 'audio/webm'
                });

                // 리소스 정리
                this.cleanup();

                this.notifyStateChange();
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * 녹음 일시정지
     */
    pauseRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        }
    }

    /**
     * 녹음 재개
     */
    resumeRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }
    }

    /**
     * 현재 녹음 상태 조회
     */
    getState(): RecordingState {
        const isRecording = this.mediaRecorder?.state === 'recording';
        const isPaused = this.mediaRecorder?.state === 'paused';

        let duration = 0;
        if (isRecording) {
            duration = (Date.now() - this.startTime) / 1000;
        } else if (isPaused && this.pausedTime > 0) {
            duration = (this.pausedTime - this.startTime) / 1000;
        }

        return {
            isRecording,
            isPaused,
            duration
        };
    }

    /**
     * 지원되는 MIME 타입 찾기
     */
    private getSupportedMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // fallback
    }

    /**
     * 상태 변경 알림
     */
    private notifyStateChange(): void {
        this.onStateChange?.(this.getState());
    }

    /**
     * 리소스 정리
     */
    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.audioChunks = [];
        this.startTime = 0;
        this.pausedTime = 0;
    }

    /**
     * 인스턴스 해제
     */
    destroy(): void {
        if (this.mediaRecorder?.state !== 'inactive') {
            this.mediaRecorder?.stop();
        }
        this.cleanup();
        this.mediaRecorder = null;
    }
}

/**
 * 오디오 Blob을 Base64로 변환
 */
export async function audioBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // data:audio/webm;base64, 제거
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 오디오 Blob을 ArrayBuffer로 변환
 */
export async function audioBlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
}

/**
 * 오디오 재생 (테스트용)
 */
export function playAudio(blob: Blob): HTMLAudioElement {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    return audio;
}
