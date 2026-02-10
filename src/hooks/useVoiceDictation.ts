import { useState, useEffect, useRef } from 'react';

interface UseVoiceDictationProps {
    onFinalResult?: (text: string) => void;
}

interface UseVoiceDictationReturn {
    isListening: boolean;
    interimTranscript: string;
    start: () => void;
    stop: () => void;
    toggle: () => void;
    error: string | null;
    isSupported: boolean;
}

export function useVoiceDictation({ onFinalResult }: UseVoiceDictationProps = {}): UseVoiceDictationReturn {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    const recognitionRef = useRef<any>(null);
    // Ref로 최신 콜백 추적 → SpeechRecognition 재생성 없이 항상 최신 activeField 반영
    const onFinalResultRef = useRef(onFinalResult);

    useEffect(() => {
        onFinalResultRef.current = onFinalResult;
    }, [onFinalResult]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            setIsSupported(true);
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ko-KR';

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                // Ignore 'no-speech' error as it just means silence
                if (event.error === 'no-speech') {
                    console.log("No speech detected (benign)");
                    return;
                }

                if (event.error === 'audio-capture') {
                    setError("마이크를 찾을 수 없습니다. 연결을 확인해주세요.");
                    setIsListening(false);
                    return;
                }

                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setError("마이크 권한이 필요합니다.");
                } else {
                    setError(`오류 발생: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const finalChunk = event.results[i][0].transcript;
                        // Ref 통해 최신 콜백 호출 → stale closure 방지
                        onFinalResultRef.current?.(finalChunk);
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setInterimTranscript(interim);
            };

            recognitionRef.current = recognition;
        } else {
            setIsSupported(false);
            setError("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 한 번만 생성 — 콜백은 ref로 추적

    const start = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Start error", e);
            }
        }
    };

    const stop = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    const toggle = () => {
        if (isListening) stop();
        else start();
    };

    return {
        isListening,
        interimTranscript,
        start,
        stop,
        toggle,
        error,
        isSupported
    };
}
