import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60초 타임아웃

/**
 * 음성을 텍스트로 변환하는 API
 *
 * POST /api/voice/transcribe
 *
 * Google Speech-to-Text API를 사용하여 오디오를 텍스트로 변환
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const configStr = formData.get('config') as string;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'audio 파일이 필요합니다.' },
                { status: 400 }
            );
        }

        // 설정 파싱
        let config: Record<string, unknown> = {};
        if (configStr) {
            try {
                config = JSON.parse(configStr);
            } catch {
                return NextResponse.json({ error: 'Invalid config JSON' }, { status: 400 });
            }
        }

        console.log('[STT] 음성 인식 시작:', {
            filename: audioFile.name,
            size: audioFile.size,
            type: audioFile.type,
            config
        });

        // TODO: 환경 변수 체크
        if (!process.env.GOOGLE_SPEECH_API_KEY) {
            console.warn('[STT] Google Speech API 키가 없습니다. 데모 모드로 실행합니다.');

            // 데모 모드: 더미 데이터 반환
            return NextResponse.json({
                success: true,
                segments: [
                    {
                        text: "무릎이 아파요",
                        confidence: 0.95,
                        isFinal: true,
                        timestamp: new Date().toISOString()
                    },
                    {
                        text: "한 달 전부터 계속 아팠어요",
                        confidence: 0.92,
                        isFinal: true,
                        timestamp: new Date().toISOString()
                    }
                ],
                demo: true
            });
        }

        // 오디오 파일을 Buffer로 변환
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        // Google Speech-to-Text API 호출
        const segments = await transcribeWithGoogle(audioBuffer, config);

        return NextResponse.json({
            success: true,
            segments,
            demo: false
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[STT] 음성 인식 에러:', error);
        return NextResponse.json(
            {
                error: '음성 인식 중 오류가 발생했습니다.',
                message
            },
            { status: 500 }
        );
    }
}

interface STTConfig {
    encoding?: string;
    sampleRateHertz?: number;
    languageCode?: string;
    enableAutomaticPunctuation?: boolean;
    enableMedicalVocabulary?: boolean;
}

interface TranscriptSegment {
    text: string;
    confidence: number;
    isFinal: boolean;
    timestamp: string;
}

async function transcribeWithGoogle(
    audioBuffer: Buffer,
    config: STTConfig
): Promise<TranscriptSegment[]> {
    const apiKey = process.env.GOOGLE_SPEECH_API_KEY;

    // Google Speech-to-Text API 요청
    const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: {
                    encoding: config.encoding || 'WEBM_OPUS',
                    sampleRateHertz: config.sampleRateHertz || 48000,
                    languageCode: config.languageCode || 'ko-KR',
                    enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
                    model: 'default',
                    // 의료 용어 힌트
                    speechContexts: config.enableMedicalVocabulary ? [{
                        phrases: getMedicalPhrases()
                    }] : []
                },
                audio: {
                    content: audioBuffer.toString('base64')
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google STT API 에러: ${error}`);
    }

    const data = await response.json();

    // 결과 변환
    const segments = [];
    if (data.results) {
        for (const result of data.results) {
            if (result.alternatives && result.alternatives.length > 0) {
                const alternative = result.alternatives[0];
                segments.push({
                    text: alternative.transcript,
                    confidence: alternative.confidence || 0,
                    isFinal: true,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    return segments;
}

/**
 * 의료 용어 힌트 목록
 */
function getMedicalPhrases(): string[] {
    return [
        // 증상
        '통증', '부종', '염좌', '골절', '탈구', '염증',
        '저림', '마비', '어지러움', '두통', '요통',

        // 신체 부위
        '무릎', '발목', '어깨', '팔꿈치', '손목', '허리',
        '목', '엉덩이', '발', '손', '다리', '팔',
        '척추', '관절', '근육', '인대', '힘줄',

        // 검사
        '엑스레이', 'X-ray', 'MRI', 'CT', '초음파',
        '혈액검사', '소변검사',

        // 진단
        '염좌', '골절', '탈구', '파열', '손상',
        '관절염', '퇴행성', '협착증', '디스크',
        '건초염', '활액낭염', '근막염',

        // 치료
        '물리치료', '주사', '약물', '수술', '재활',
        '소염제', '진통제', '근이완제'
    ];
}
