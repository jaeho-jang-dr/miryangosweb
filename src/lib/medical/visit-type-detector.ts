import { generateMedicalAnalysis } from './ai-client';

/**
 * Detects whether the visit is an initial visit or a follow-up visit based on the conversation context.
 * @param transcript The full conversation transcript between doctor and patient.
 */
export async function detectVisitType(
  transcript: string
): Promise<'initial' | 'followup'> {
  const prompt = `
당신은 정형외과 전문의 보조 AI입니다.
의사-환자의 대화를 분석하여 방문 유형을 판단하세요.

[판단 기준]
- Initial (초진): 
  - 환자가 처음 방문했거나, 새로운 증상에 대해 이야기하는 경우
  - "처음 왔어요", "새로 아파서 왔어요" 등의 표현
  - 기본적인 병력 청취(History Taking)가 이루어지는 경우
  
- Follow-up (재진):
  - 지난 진료의 경과를 확인하는 경우
  - "지난번 약 먹고 어때요?", "물리치료 받고 좀 나아지셨나요?" 등의 표현
  - 수술 후 경과 관찰

[대화 내용]
${transcript}

JSON 형식으로 출력하세요:
{
  "type": "initial" | "followup",
  "confidence": number (0-1),
  "reason": "판단 근거"
}
`;

  try {
    const response = await generateMedicalAnalysis(prompt);
    return response.type as 'initial' | 'followup';
  } catch (error) {
    console.error("Error determining visit type:", error);
    return 'initial'; // Default to initial if detection fails
  }
}
