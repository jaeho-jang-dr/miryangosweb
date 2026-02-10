import { generateMedicalAnalysis } from './ai-client';
import type { InitialVisitChart } from './templates/initial-visit-template';

/**
 * Extracts structured medical information from an initial visit transcript.
 * @param transcript The full conversation transcript (utterances joined by newlines).
 * @returns PartialInitialVisitChart
 */
export async function extractInitialVisitInfo(
  transcript: string
): Promise<Partial<InitialVisitChart>> {
  const prompt = `
당신은 정형외과 초진 차트 작성 전문 AI입니다.
아래 "의사-환자 대화"를 분석하여 각 항목별로 정보를 분류·추출하세요.

## 핵심 규칙
- 대화에 **없는 내용은 절대 지어내지 마세요**. 해당 필드를 빈 문자열("")로 두세요.
- **"주소(complaint)"에는 환자의 핵심 증상만** 넣으세요 (예: "다리가 아픕니다", "무릎이 아파요").
  절대로 대화 전체를 넣지 마세요!
- 의사의 질문은 추출 대상이 아닙니다. **환자의 답변 내용만** 추출하세요.
- 대화에서 "아니요", "없어요" 같은 부정 답변도 중요합니다. 해당 필드에 "없음" 또는 "아니요"로 기록하세요.

## 추출 항목

1. **complaint** (주소): 환자가 호소하는 핵심 증상 한 줄. (예: "무릎이 아픕니다")
2. **painScore**: 통증 NRS 점수 (0-10). 언급 없으면 null.
3. **onset**: 발병 시기. "얼마나 됐습니까?" → "석달쯤" / "언제부터" → "3개월 전"
4. **trauma**: 외상력. "다쳤어요?" → "아니요" 이면 "없음". 넘어졌다면 "넘어져서 다침".
5. **surgery**: 수술력. "수술하신 적?" → "아니요" 이면 "없음". 있으면 구체적으로.
6. **location**: 통증 부위. "무릎", "허리", "어깨" 등 구체적 위치.
7. **deformitySwelling**: 변형/부종 여부. 언급 없으면 "".
8. **job**: 직업. "농사짓습니다" → "농업". "회사원" → "사무직".
9. **workDetails**: 구체적 업무 내용/자세. "무거운 거 드세요?" → "중량물 취급" 등.
10. **exercise**: 운동 습관. "운동하시나요?" → "아니요" 이면 "없음". 있으면 종류.
11. **physicalFinding**: 이학적 검사 소견. 대화에 언급된 경우만.
12. **investigation**: 검사 계획. "엑스레이 찍어봅시다" → "무릎 X-ray".
13. **treatment**: 치료 계획. 약물/주사/물리치료 등. 언급 없으면 "".

## 예시

입력 대화:
발화 1: 어디가 아파서 오셨습니까?
발화 2: 허리가 아픕니다.
발화 3: 언제부터 아프셨어요?
발화 4: 한 달 전부터요.
발화 5: 다친 적 있으세요?
발화 6: 아니요 특별히 다친 건 없습니다.
발화 7: 무슨 일을 하십니까?
발화 8: 사무직입니다. 하루종일 앉아있어요.
발화 9: 운동은 하시나요?
발화 10: 주말에 등산합니다.
발화 11: 허리 엑스레이 한번 찍어봅시다.

출력:
{
  "complaint": "허리가 아픕니다",
  "painScore": null,
  "onset": "한 달 전",
  "trauma": "없음",
  "surgery": "",
  "location": "허리",
  "deformitySwelling": "",
  "job": "사무직",
  "workDetails": "하루종일 앉아있는 업무",
  "exercise": "주말 등산",
  "physicalFinding": "",
  "investigation": "허리 X-ray",
  "treatment": ""
}

## 분석 대상 대화

${transcript}

위 대화를 분석하여 JSON을 출력하세요.
`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await generateMedicalAnalysis(prompt) as any;

    console.log('[InfoExtractor] AI 추출 결과:', JSON.stringify(data, null, 2));

    return {
      chiefComplaint: {
        complaint: data.complaint || '',
        painLevel: data.painScore ?? 0,
        onset: data.onset || ''
      },
      history: {
        onsetDate: data.onset || '',
        traumaHistory: data.trauma || '',
        surgeryHistory: data.surgery || '',
        painLocation: data.location ? [data.location] : [],
        deformityOrSwelling: data.deformitySwelling || ''
      },
      occupationalHistory: {
        occupation: data.job || '',
        workDetails: data.workDetails || '',
        exercises: data.exercise ? [data.exercise] : []
      },
      physicalExam: {
        inspection: data.physicalFinding || '',
        palpation: '',
        rangeOfMotion: ''
      },
      imagingPlan: {
        xrayViews: data.investigation ? [data.investigation] : [],
        reason: ''
      },
      diagnosis: {
        suspectedDiagnosis: [],
        confirmed: false
      }
    } as Partial<InitialVisitChart>;
}
