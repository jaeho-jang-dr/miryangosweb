import { generateMedicalAnalysis } from './ai-client';
import type { InitialVisitChart } from './templates/initial-visit-template';

/**
 * Extracts structured medical information from an initial visit transcript.
 * @param transcript The full conversation transcript.
 * @returns PartialInitialVisitChart
 */
export async function extractInitialVisitInfo(
  transcript: string
): Promise<Partial<InitialVisitChart>> {
  const prompt = `
당신은 정형외과 전문의 보조 AI입니다.
의사-환자의 대화를 분석하여 초진 차트(Initial Visit Chart)를 작성하세요.
절대 없는 내용을 지어내지 말고, 대화에 있는 내용만 추출하세요.

[추출할 정보]
1. Chief Complaint (주소)
   - 환자가 가장 불편하다고 말하는 증상
   - 통증 정도 (NRS 0-10)가 언급되면 포함

2. History (병력)
   - 발병 시기 (Onset): "언제부터 아팠나요?"
   - 외상력 (Trauma): "다친 적 있나요?"
   - 수술력 (Surgery): "수술하신 적 있나요?"
   - 통증 부위 (Location): "어디가 아프세요?"
   
3. Occupational / Social History (직업력/사회력)
   - 직업
   - 운동 습관 (취미)
   - 주로 취하는 자세

4. Physical Exam (이학적 검사)
   - 시진 소견 (Inspection)
   - 촉진 소견 (Tenderness)
   - 관절 가동 범위 (ROM)
   
5. Plan (계획)
   - 약물 처방
   - 물리치료
   - 검사 계획 (X-ray 등)

[대화 내용]
${transcript}

JSON 형식으로 출력하세요. 필드가 없으면 빈 문자열("")로 두세요.
{
  "chiefComplaint": {
    "complaint": string,
    "painScore": number | null
  },
  "history": {
    "onset": string,
    "trauma": string,
    "surgery": string,
    "location": string
  },
  "socialHistory": {
    "occupation": string,
    "exercise habits": string
  },
  "physicalExam": {
    "inspection": string,
    "palpation": string,
    "rom": string
  },
  "plan": {
    "medication": string,
    "physicalTherapy": string,
    "investigation": string
  }
}
`;

  try {
    const data = await generateMedicalAnalysis(prompt);
    
    // Map AI response to partial InitialVisitChart structure
    // Note: The structure here is simplified for extraction. 
    // You might need more robust mapping for production.
    return {
      chiefComplaint: {
        complaint: data.chiefComplaint?.complaint || '',
        painLevel: data.chiefComplaint?.painScore || 0,
        onset: data.history?.onset || ''
      },
      history: {
        onsetDate: data.history?.onset || '',
        traumaHistory: data.history?.trauma || '',
        surgeryHistory: data.history?.surgery || '',
        painLocation: data.history?.location ? [data.history.location] : [],
        deformityOrSwelling: ''
      },
      occupationalHistory: {
        occupation: data.socialHistory?.occupation || '',
        exercises: data.socialHistory?.['exercise habits'] ? [data.socialHistory['exercise habits']] : []
      },
      physicalExam: {
        inspection: data.physicalExam?.inspection || '',
        palpation: data.physicalExam?.palpation || '',
        rangeOfMotion: data.physicalExam?.rom || ''
      },
      imagingPlan: {
        xrayViews: data.plan?.investigation ? [data.plan.investigation] : [],
        reason: ''
      },
      diagnosis: {
        suspectedDiagnosis: [],
        confirmed: false
      }
    } as Partial<InitialVisitChart>; 
  } catch (error) {
    console.error("Error extracting initial visit info:", error);
    return {};
  }
}
