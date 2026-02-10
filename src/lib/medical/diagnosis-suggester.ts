import { generateMedicalAnalysis } from './ai-client';
import type { InitialVisitChart } from './templates/initial-visit-template';

interface DiagnosisSuggestion {
  name: string;
  icd10Code: string; // KCD-8 코드
  confidence: number;
  reasoning: string;
}

/**
 * Suggests potential diagnoses (KCD-8 / ICD-10) based on clinical data.
 */
export async function suggestDiagnosis(
  data: Partial<InitialVisitChart>
): Promise<DiagnosisSuggestion[]> {
  const prompt = `
당신은 정형외과 전문의 보조 AI입니다.
다음 환자의 임상 정보를 바탕으로 가능성 높은 한국표준질병사인분류(KCD-8) 진단명을 3가지 추천해 주세요.

[환자 정보]
- 주소 (CC): ${data.chiefComplaint?.complaint}
- 병력 (History): ${data.history?.onsetDate ? `발병: ${data.history.onsetDate}` : ''}, ${data.history?.painLocation ? `부위: ${data.history.painLocation.join(', ')}` : ''}
- 이학적 검사 (PE): ${data.physicalExam?.inspection || ''} ${data.physicalExam?.palpation || ''} ${data.physicalExam?.rangeOfMotion || ''}
- 나이/성별: (추정 필요함, 일반 성인으로 가정)

JSON 형식으로 출력하세요:
{
  "suggestions": [
    {
      "name": "진단명 (한글)",
      "icd10Code": "KCD 코드 (예: M17.0)",
      "confidence": 0.0 ~ 1.0 (신뢰도),
      "reasoning": "추천 이유 간략 설명"
    }
  ]
}
`;

  try {
    const result = await generateMedicalAnalysis(prompt);
    return result.suggestions || [];
  } catch (error) {
    console.error("Diagnosis suggestion failed:", error);
    return [];
  }
}
