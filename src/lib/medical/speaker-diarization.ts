
import { generateMedicalAnalysis } from './ai-client';

export interface DiarizedSegment {
  speaker: 'doctor' | 'patient';
  text: string;
}

/**
 * Identify speakers (Doctor vs Patient) from the transcript using AI.
 * 
 * @param transcript The full transcript text
 * @returns Array of segments with assigned speakers
 */
export async function identifySpeakers(
  transcript: string
): Promise<DiarizedSegment[]> {
  const prompt = `
당신은 정형외과 전문의 보조 AI입니다.
다음 진료 대화 내용을 분석하여 "의사(Doctor)"와 "환자(Patient)"의 발화로 구분해주세요.

[대화 내용]
${transcript}

[지침]
1. 문맥을 파악하여 누가 말하는지 판단하세요.
   - 의사: 질문(어디가 아프세요?, 언제부터요?), 진찰(여기 눌러볼게요), 처방(약 처방해드릴게요)
   - 환자: 증상 호소(무릎이 아파요), 답변(한 달 전부터요), 통증 표현(아파요)
2. 대화의 순서를 유지하세요.
3. 원문 내용을 변경하지 마세요.

JSON 형식으로 출력하세요:
{
  "segments": [
    { "speaker": "doctor" | "patient", "text": "발화 내용" }
  ]
}
`;

  try {
    const result = await generateMedicalAnalysis(prompt);
    return result.segments || [];
  } catch (error) {
    console.error("Speaker diarization failed:", error);
    // Fallback: Return the whole text as 'patient' or 'doctor' (or unknown) if parsing fails, 
    // but better to return empty or original as single chunk.
    // Here we'll return a single chunk as 'patient' to avoid breaking UI, or maybe just empty.
    return [{ speaker: 'patient', text: transcript }]; 
  }
}
