import { generateMedicalAnalysis } from './ai-client';

export interface XrayRecommendation {
  bodyPart: string;
  views: string[];
  reason: string;
  confidence: number;
}

const XRAY_PROTOCOLS: Record<string, { views: string[], reason: string }> = {
  '무릎': {
    views: ['Knee AP', 'Knee Lateral', 'Merchant view', 'Rosenberg view'],
    reason: '골관절염(OA) 및 슬개대퇴관절(PF joint) 평가'
  },
  '어깨': {
    views: ['Shoulder AP', 'Shoulder Lateral', 'Scapular Y view'],
    reason: '회전근개 질환 및 충돌 증후군 평가'
  },
  '허리': {
    views: ['L-spine AP', 'L-spine Lateral'],
    reason: '요추부 척추증 및 디스크 질환 선별'
  },
  '목': {
    views: ['C-spine AP', 'C-spine Lateral', 'C-spine Open mouth'],
    reason: '경추부 디스크 및 불안정성 평가'
  },
  '발목': {
    views: ['Ankle AP', 'Ankle Lateral', 'Ankle Mortise'],
    reason: '발목 염좌 및 골절 여부 확인'
  }
};

/**
 * Recommends X-ray views based on symptoms and location.
 */
export async function recommendXray(
  symptoms: string,
  location: string
): Promise<XrayRecommendation[]> {
  
  // 1. Rule-based check — 다발 부위 모두 매칭 (첫 번째만이 아닌 전체)
  const ruleMatches: XrayRecommendation[] = [];
  for (const [key, protocol] of Object.entries(XRAY_PROTOCOLS)) {
    if (location.includes(key) || symptoms.includes(key)) {
      ruleMatches.push({
        bodyPart: key,
        views: protocol.views,
        reason: protocol.reason,
        confidence: 0.9
      });
    }
  }
  if (ruleMatches.length > 0) {
    return ruleMatches;
  }

  // 2. AI Fallback
  const prompt = `
환자의 증상과 통증 부위를 바탕으로 필요한 정형외과 X-ray 검사를 추천해 주세요.

[환자 정보]
- 증상: ${symptoms}
- 통증 부위: ${location}

다음 JSON 절대로 형식을 지켜주세요:
{
  "recommendations": [
    {
      "bodyPart": "부위 (예: Wrist)",
      "views": ["View1", "View2"],
      "reason": "검사 이유"
    }
  ]
}
`;

  try {
    const data = await generateMedicalAnalysis(prompt);
    return data.recommendations?.map((rec: any) => ({
      ...rec,
      confidence: 0.7 // AI confidence is lower than explicit rule
    })) || [];
  } catch (error) {
    console.error("X-ray recommendation failed:", error);
    return [];
  }
}
