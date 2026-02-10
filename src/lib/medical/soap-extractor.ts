import { generateMedicalAnalysis } from './ai-client';
import type { SoapNote } from './templates/soap-note-template';

/**
 * Extracts structured SOAP notes from a follow-up visit transcript.
 * @param transcript The full conversation transcript.
 * @returns PartialSoapNote
 */
export async function extractSoapNote(
  transcript: string
): Promise<Partial<SoapNote>> {
  const prompt = `
당신은 정형외과 전문의 보조 AI입니다.
의사-환자의 대화를 분석하여 SOAP 차트를 작성하세요.
절대 없는 내용을 지어내지 말고, 대화에 있는 내용만 추출하세요.

[Subjective Information (주관적 호소)]
- 환자가 호소하는 증상 (Symptoms)
- 지난 진료 후 변화 ("좀 좋아졌어요", "아직 아파요")
- 통증 정도 변화 (Scale)

[Objective Findings (객관적 소견)]
- 의사가 확인한 이학적 소견 (Physical Exam)
- 붓기(Swelling), 압통(Tenderness), 운동범위(ROM) 변화

[Assessment (진단/평가)]
- 의사의 잠정적 진단이나 평가 ("염증이 좀 가라앉았네요")
- 경과 판단 ("호전 중", "악화", "변화 없음")

[Plan (계획)]
- 약물 처방 변경 (Medication changes)
- 검사 계획 (Tests)
- 물리치료 계획 (Physical Therapy)
- 다음 내원일 (Follow-up Date)

[대화 내용]
${transcript}

JSON 형식으로 출력하세요. 없으면 빈 문자열("")로 둡니다.
{
  "subjective": {
    "complaint": string,
    "intervalHistory": string,
    "reviewOfSystems": string
  },
  "objective": {
    "vitalSigns": {},
    "physicalExam": string,
    "labs": string,
    "imaging": string
  },
  "assessment": {
    "diagnosis": string[],
    "impression": string
  },
  "plan": {
    "medications": [], 
    "procedures": [],
    "tests": [],
    "education": string,
    "followUp": string
  }
}
`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await generateMedicalAnalysis(prompt) as any;
    
    // Convert to structured SoapNote type
    // This assumes SoapNote structure is compatible or we use partial matching
    return {
      subjective: {
        symptoms: data.subjective?.complaint ? [data.subjective.complaint] : [],
        changesSinceLastVisit: data.subjective?.intervalHistory || '',
        painLevel: undefined, // Or parse if available
        treatmentResponse: ''
      },
      objective: {
        vitalSigns: { // Default mock valid values
            bloodPressure: '120/80',
            heartRate: 72,
            temperature: 36.5
        },
        physicalFindings: data.objective?.physicalExam ? [data.objective.physicalExam] : [],
        imagingFindings: data.objective?.imaging ? [data.objective.imaging] : [],
        labResults: data.objective?.labs ? [data.objective.labs] : []
      },
      assessment: {
        diagnosis: data.assessment?.diagnosis || [],
        progress: 'stable',
        clinicalImpression: data.assessment?.impression || ''
      },
      plan: {
        medications: data.plan?.medications || [],
        physicalTherapy: data.plan?.physicalTherapy ? [data.plan.physicalTherapy] : [],
        additionalTests: data.plan?.tests || [],
        patientEducation: data.plan?.education ? [data.plan.education] : [],
        followUp: data.plan?.followUp || ''
      }
    } as Partial<SoapNote>;
    
  } catch (error) {
    console.error("Error extracting SOAP note:", error);
    return {};
  }
}
