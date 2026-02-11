/**
 * Context-based KCD-8 Diagnosis Suggestion Engine
 *
 * 증상(CC), 이학검사(PE), 검사결과(Test)를 종합 분석하여
 * 관련 KCD-8 진단코드를 추천합니다.
 */

import { searchDiagnosisV2, KCDCode } from './kcd-search-v2';

// ─── Types ───────────────────────────────────────────────
export interface DiagnosisContextInput {
    cc: string;          // 주소/증상
    pe: string;          // 이학검사 소견
    testOrder: string;   // 검사 오더 (X-ray 등)
    testResult: string;  // 검사 결과
}

export interface ContextSuggestion {
    code: string;
    ko: string;
    en: string;
    confidence: number;  // 0~1
    source: 'symptom' | 'pe' | 'test';
    reason: string;
}

export interface GroupedSuggestions {
    symptomBased: ContextSuggestion[];
    peBased: ContextSuggestion[];
    testBased: ContextSuggestion[];
}

// ─── Body Part Detection ─────────────────────────────────
interface BodyPartMapping {
    id: string;
    keywords: string[];
    kcdCodes: { code: string; ko: string; en: string; condition?: string }[];
}

const BODY_PART_DIAGNOSIS_MAP: BodyPartMapping[] = [
    {
        id: 'neck',
        keywords: ['목', '경추', '뒷목', '경부'],
        kcdCodes: [
            { code: 'M54.2', ko: '경부통', en: 'Cervicalgia' },
            { code: 'M50.1', ko: '경추간판장애(신경뿌리병증 동반)', en: 'Cervical disc disorder with radiculopathy', condition: '저림' },
            { code: 'M50.2', ko: '기타 경추간판전위', en: 'Other cervical disc displacement' },
            { code: 'M47.8', ko: '기타 척추증', en: 'Other spondylosis', condition: '퇴행' },
            { code: 'M48.0', ko: '척추관 협착증', en: 'Spinal stenosis', condition: '협착' },
        ]
    },
    {
        id: 'shoulder',
        keywords: ['어깨', '견관절', '견갑'],
        kcdCodes: [
            { code: 'M75.1', ko: '회전근개 증후군', en: 'Rotator cuff syndrome' },
            { code: 'M75.0', ko: '유착성 관절낭염(오십견)', en: 'Adhesive capsulitis of shoulder', condition: '운동제한' },
            { code: 'M75.4', ko: '어깨의 충격증후군', en: 'Impingement syndrome of shoulder' },
            { code: 'M75.3', ko: '어깨의 석회성 건염', en: 'Calcific tendinitis of shoulder', condition: '석회' },
            { code: 'S43.4', ko: '어깨관절의 염좌 및 긴장', en: 'Sprain and strain of shoulder joint', condition: '외상' },
        ]
    },
    {
        id: 'elbow',
        keywords: ['팔꿈치', '엘보', '주관절'],
        kcdCodes: [
            { code: 'M77.1', ko: '외측상과염(테니스엘보)', en: 'Lateral epicondylitis' },
            { code: 'M77.0', ko: '내측상과염(골퍼엘보)', en: 'Medial epicondylitis' },
            { code: 'G56.2', ko: '척골신경병변(주관터널증후군)', en: 'Lesion of ulnar nerve', condition: '저림' },
        ]
    },
    {
        id: 'wrist',
        keywords: ['손목', '수근'],
        kcdCodes: [
            { code: 'M65.4', ko: '요골 붓돌기의 건초염(드퀘르벵)', en: "De Quervain's tenosynovitis" },
            { code: 'G56.0', ko: '손목터널증후군', en: 'Carpal tunnel syndrome', condition: '저림' },
            { code: 'S63.5', ko: '손목의 염좌 및 긴장', en: 'Sprain and strain of wrist', condition: '외상' },
            { code: 'M19.0', ko: '원발성 관절증(손목)', en: 'Primary arthrosis of wrist' },
        ]
    },
    {
        id: 'hand',
        keywords: ['손', '손가락', '수부'],
        kcdCodes: [
            { code: 'M65.3', ko: '방아쇠 손가락', en: 'Trigger finger' },
            { code: 'G56.0', ko: '손목터널증후군', en: 'Carpal tunnel syndrome', condition: '저림' },
            { code: 'M19.0', ko: '원발성 관절증(수부)', en: 'Primary arthrosis of hand' },
            { code: 'M72.0', ko: '듀퓌트렌 구축', en: "Dupuytren's contracture", condition: '변형' },
        ]
    },
    {
        id: 'thoracic',
        keywords: ['등', '흉추', '등허리'],
        kcdCodes: [
            { code: 'M54.6', ko: '흉추부 통증', en: 'Pain in thoracic spine' },
            { code: 'M54.1', ko: '신경뿌리병증', en: 'Radiculopathy' },
        ]
    },
    {
        id: 'lumbar',
        keywords: ['허리', '요추', '요통', '요부', '삐끗'],
        kcdCodes: [
            { code: 'M54.5', ko: '요통', en: 'Low back pain' },
            { code: 'M51.1', ko: '요추 추간판장애(신경뿌리병증 동반)', en: 'Lumbar disc disorder with radiculopathy', condition: '저림' },
            { code: 'M51.2', ko: '기타 명시된 추간판전위', en: 'Other specified intervertebral disc displacement' },
            { code: 'M54.4', ko: '좌골신경통을 동반한 요통', en: 'Lumbago with sciatica', condition: '저림' },
            { code: 'M48.0', ko: '척추관 협착증', en: 'Spinal stenosis', condition: '협착' },
            { code: 'M47.8', ko: '기타 척추증', en: 'Other spondylosis', condition: '퇴행' },
            { code: 'M43.1', ko: '척추전방전위증', en: 'Spondylolisthesis' },
            { code: 'S33.5', ko: '요추의 염좌 및 긴장', en: 'Sprain and strain of lumbar spine', condition: '급성' },
        ]
    },
    {
        id: 'hip',
        keywords: ['고관절', '엉덩이', '골반', '사타구니'],
        kcdCodes: [
            { code: 'M16.1', ko: '기타 원발성 고관절증', en: 'Other primary coxarthrosis' },
            { code: 'M16.9', ko: '상세불명의 고관절증', en: 'Coxarthrosis, unspecified' },
            { code: 'M70.6', ko: '대전자 점액낭염', en: 'Trochanteric bursitis' },
            { code: 'M25.5', ko: '관절통(고관절)', en: 'Pain in joint (hip)' },
        ]
    },
    {
        id: 'knee',
        keywords: ['무릎', '슬관절', '슬개'],
        kcdCodes: [
            { code: 'M17.1', ko: '기타 원발성 무릎관절증', en: 'Other primary gonarthrosis' },
            { code: 'M17.9', ko: '상세불명의 무릎관절증', en: 'Gonarthrosis, unspecified' },
            { code: 'M23.3', ko: '기타 반월판 장애', en: 'Other meniscus derangements', condition: '반월판' },
            { code: 'M22.4', ko: '슬개대퇴증후군', en: 'Chondromalacia patellae', condition: '연골' },
            { code: 'M70.5', ko: '기타 무릎 점액낭염', en: 'Other bursitis of knee', condition: '부종' },
            { code: 'S83.5', ko: '무릎의 염좌 및 긴장', en: 'Sprain and strain of knee', condition: '외상' },
            { code: 'M76.5', ko: '무릎힘줄건염', en: 'Patellar tendinitis' },
        ]
    },
    {
        id: 'ankle',
        keywords: ['발목', '족관절', '접질'],
        kcdCodes: [
            { code: 'S93.4', ko: '발목의 염좌 및 긴장', en: 'Sprain and strain of ankle' },
            { code: 'M19.0', ko: '원발성 관절증(발목)', en: 'Primary arthrosis of ankle' },
            { code: 'M77.5', ko: '기타 발의 엔테소병증', en: 'Other enthesopathy of foot' },
            { code: 'M72.2', ko: '족저근막섬유종증', en: 'Plantar fascial fibromatosis', condition: '발바닥' },
        ]
    },
    {
        id: 'foot',
        keywords: ['발', '족부', '발바닥', '발뒤꿈치', '아킬레스'],
        kcdCodes: [
            { code: 'M72.2', ko: '족저근막염', en: 'Plantar fasciitis' },
            { code: 'M77.5', ko: '기타 발의 엔테소병증', en: 'Other enthesopathy of foot' },
            { code: 'M76.6', ko: '아킬레스건염', en: 'Achilles tendinitis', condition: '아킬레스' },
        ]
    },
];

// ─── PE Finding → Diagnosis Refinement ───────────────────
interface PEFindingMapping {
    finding: string;     // 이학검사 소견 (한글 label)
    keywords: string[];  // 매칭 키워드
    boostConditions: string[];  // 이 소견이 있을 때 가산점 줄 condition
    additionalCodes: { code: string; ko: string; en: string; bodyParts?: string[] }[];
}

const PE_FINDING_DIAGNOSIS_MAP: PEFindingMapping[] = [
    {
        finding: '압통',
        keywords: ['압통', 'tenderness'],
        boostConditions: [],
        additionalCodes: [
            { code: 'M79.1', ko: '근육통', en: 'Myalgia' },
            { code: 'M79.6', ko: '사지의 통증', en: 'Pain in limb' },
        ]
    },
    {
        finding: '부종',
        keywords: ['부종', 'swelling'],
        boostConditions: ['부종'],
        additionalCodes: [
            { code: 'M25.4', ko: '관절삼출', en: 'Effusion of joint' },
            { code: 'M79.8', ko: '기타 명시된 연조직장애', en: 'Other specified soft tissue disorders' },
        ]
    },
    {
        finding: '관절변형',
        keywords: ['관절변형', 'deformity', '변형'],
        boostConditions: ['변형'],
        additionalCodes: [
            { code: 'M21.1', ko: '외반 변형(NEC)', en: 'Valgus deformity, NEC' },
            { code: 'M21.0', ko: '내반 변형(NEC)', en: 'Varus deformity, NEC' },
        ]
    },
    {
        finding: '관절운동제한',
        keywords: ['관절운동제한', 'ROM limitation', '운동제한', '굳어'],
        boostConditions: ['운동제한'],
        additionalCodes: [
            { code: 'M25.6', ko: '관절의 강직', en: 'Stiffness of joint' },
        ]
    },
    {
        finding: '근경직',
        keywords: ['근경직', 'muscle spasm', '경직'],
        boostConditions: [],
        additionalCodes: [
            { code: 'M62.4', ko: '근육 구축', en: 'Contracture of muscle' },
            { code: 'M62.8', ko: '기타 명시된 근육장애', en: 'Other specified disorders of muscle' },
        ]
    },
    {
        finding: '근력약화',
        keywords: ['근력약화', 'muscle weakness', '약화'],
        boostConditions: [],
        additionalCodes: [
            { code: 'M62.5', ko: '근육 소모 및 위축(NEC)', en: 'Muscle wasting and atrophy, NEC' },
        ]
    },
    {
        finding: '감각이상',
        keywords: ['감각이상', 'sensory change', '감각'],
        boostConditions: ['저림'],
        additionalCodes: [
            { code: 'G62.9', ko: '상세불명의 다발신경병증', en: 'Polyneuropathy, unspecified' },
        ]
    },
    {
        finding: '저림',
        keywords: ['저림', 'numbness'],
        boostConditions: ['저림'],
        additionalCodes: [
            { code: 'G62.9', ko: '상세불명의 다발신경병증', en: 'Polyneuropathy, unspecified' },
            { code: 'R20.2', ko: '피부감각이상', en: 'Paresthesia of skin' },
        ]
    },
    {
        finding: '발적',
        keywords: ['발적', 'redness'],
        boostConditions: [],
        additionalCodes: [
            { code: 'M13.9', ko: '상세불명의 관절염', en: 'Arthritis, unspecified' },
        ]
    },
    {
        finding: '열감',
        keywords: ['열감', 'warmth'],
        boostConditions: [],
        additionalCodes: [
            { code: 'M13.9', ko: '상세불명의 관절염', en: 'Arthritis, unspecified' },
        ]
    },
    {
        finding: '보행이상',
        keywords: ['보행이상', 'gait abnormality', '보행'],
        boostConditions: [],
        additionalCodes: [
            { code: 'R26.8', ko: '기타 및 상세불명의 보행 및 이동의 이상', en: 'Other and unspecified abnormalities of gait and mobility' },
        ]
    },
];

// ─── X-ray/Test → Body Part Mapping ─────────────────────
const TEST_BODY_PART_MAP: { pattern: RegExp; bodyPartId: string }[] = [
    { pattern: /c-?spine|cervical|경추/i, bodyPartId: 'neck' },
    { pattern: /shoulder|견관절|어깨/i, bodyPartId: 'shoulder' },
    { pattern: /elbow|주관절|팔꿈치/i, bodyPartId: 'elbow' },
    { pattern: /wrist|손목|수근/i, bodyPartId: 'wrist' },
    { pattern: /hand|수부|손/i, bodyPartId: 'hand' },
    { pattern: /t-?spine|thoracic|흉추/i, bodyPartId: 'thoracic' },
    { pattern: /l-?spine|lumbar|요추|허리/i, bodyPartId: 'lumbar' },
    { pattern: /hip|고관절|골반/i, bodyPartId: 'hip' },
    { pattern: /knee|슬관절|무릎/i, bodyPartId: 'knee' },
    { pattern: /ankle|족관절|발목/i, bodyPartId: 'ankle' },
    { pattern: /foot|족부|발/i, bodyPartId: 'foot' },
];

// ─── Main Suggestion Function ────────────────────────────
export function suggestDiagnosisByContext(input: DiagnosisContextInput): GroupedSuggestions {
    const { cc, pe, testOrder, testResult } = input;
    const allText = `${cc} ${pe} ${testOrder} ${testResult}`.toLowerCase();

    // 1. 증상 기반: CC 텍스트에서 부위 감지 → 관련 진단 추천
    const symptomBased: ContextSuggestion[] = [];
    const detectedBodyParts = new Set<string>();

    for (const mapping of BODY_PART_DIAGNOSIS_MAP) {
        const matched = mapping.keywords.some(k => cc.includes(k));
        if (matched) {
            detectedBodyParts.add(mapping.id);
            for (const dx of mapping.kcdCodes) {
                // 조건부 코드는 해당 조건이 있을 때만 추가
                if (dx.condition) {
                    if (allText.includes(dx.condition)) {
                        symptomBased.push({
                            code: dx.code, ko: dx.ko, en: dx.en,
                            confidence: 0.8,
                            source: 'symptom',
                            reason: `증상 "${mapping.keywords.find(k => cc.includes(k))}" + "${dx.condition}" 기반`
                        });
                    }
                } else {
                    symptomBased.push({
                        code: dx.code, ko: dx.ko, en: dx.en,
                        confidence: 0.7,
                        source: 'symptom',
                        reason: `증상 부위 "${mapping.keywords.find(k => cc.includes(k))}" 기반`
                    });
                }
            }
        }
    }

    // Top 50 증상 키워드 매칭 (기존 searchDiagnosisV2 활용)
    if (cc.trim()) {
        const ccWords = cc.split(/[\s,]+/).filter(w => w.length >= 2);
        for (const word of ccWords.slice(0, 5)) { // 최대 5개 키워드
            const results = searchDiagnosisV2(word);
            for (const r of results.slice(0, 3)) {
                if (!symptomBased.some(s => s.code === r.code)) {
                    symptomBased.push({
                        code: r.code, ko: r.ko, en: r.en,
                        confidence: 0.5,
                        source: 'symptom',
                        reason: `증상 키워드 "${word}" 매칭`
                    });
                }
            }
        }
    }

    // 2. 이학검사 기반: PE 소견 + 감지된 부위 → 정밀 진단
    const peBased: ContextSuggestion[] = [];
    const peText = pe.toLowerCase();

    for (const peMapping of PE_FINDING_DIAGNOSIS_MAP) {
        const matched = peMapping.keywords.some(k => peText.includes(k));
        if (!matched) continue;

        // PE 소견 자체의 추가 진단 코드
        for (const dx of peMapping.additionalCodes) {
            if (!peBased.some(s => s.code === dx.code)) {
                peBased.push({
                    code: dx.code, ko: dx.ko, en: dx.en,
                    confidence: 0.6,
                    source: 'pe',
                    reason: `이학검사 "${peMapping.finding}" 소견`
                });
            }
        }

        // PE 소견이 부위와 결합 시 → 기존 부위별 코드에서 condition 매칭으로 가산
        for (const bodyPartId of detectedBodyParts) {
            const bodyMapping = BODY_PART_DIAGNOSIS_MAP.find(b => b.id === bodyPartId);
            if (!bodyMapping) continue;

            for (const dx of bodyMapping.kcdCodes) {
                if (dx.condition && peMapping.boostConditions.some(bc => dx.condition?.includes(bc))) {
                    // 이미 symptomBased에 있으면 confidence 업
                    const existing = symptomBased.find(s => s.code === dx.code);
                    if (existing) {
                        existing.confidence = Math.min(existing.confidence + 0.15, 0.95);
                        existing.reason += ` + 이학검사 "${peMapping.finding}"`;
                    } else if (!peBased.some(s => s.code === dx.code)) {
                        peBased.push({
                            code: dx.code, ko: dx.ko, en: dx.en,
                            confidence: 0.75,
                            source: 'pe',
                            reason: `부위 "${bodyPartId}" + 이학검사 "${peMapping.finding}"`
                        });
                    }
                }
            }
        }
    }

    // 3. 검사 결과 기반: X-ray 오더/결과에서 부위 추출 → 진단 추천
    const testBased: ContextSuggestion[] = [];
    const testText = `${testOrder} ${testResult}`;

    for (const testMap of TEST_BODY_PART_MAP) {
        if (testMap.pattern.test(testText)) {
            const bodyMapping = BODY_PART_DIAGNOSIS_MAP.find(b => b.id === testMap.bodyPartId);
            if (!bodyMapping) continue;

            for (const dx of bodyMapping.kcdCodes) {
                if (dx.condition && !allText.includes(dx.condition)) continue;

                const alreadyInSymptom = symptomBased.some(s => s.code === dx.code);
                const alreadyInPe = peBased.some(s => s.code === dx.code);
                const alreadyInTest = testBased.some(s => s.code === dx.code);

                if (alreadyInSymptom || alreadyInPe) {
                    // confidence 가산
                    const existing = [...symptomBased, ...peBased].find(s => s.code === dx.code);
                    if (existing) {
                        existing.confidence = Math.min(existing.confidence + 0.1, 0.95);
                        existing.reason += ` + 검사 "${testMap.bodyPartId}"`;
                    }
                } else if (!alreadyInTest) {
                    testBased.push({
                        code: dx.code, ko: dx.ko, en: dx.en,
                        confidence: 0.65,
                        source: 'test',
                        reason: `검사 부위 "${testMap.bodyPartId}" 기반`
                    });
                }
            }
        }
    }

    // 정렬: confidence 내림차순
    const sortByConfidence = (a: ContextSuggestion, b: ContextSuggestion) => b.confidence - a.confidence;

    return {
        symptomBased: deduplicateSuggestions(symptomBased).sort(sortByConfidence).slice(0, 8),
        peBased: deduplicateSuggestions(peBased).sort(sortByConfidence).slice(0, 6),
        testBased: deduplicateSuggestions(testBased).sort(sortByConfidence).slice(0, 6),
    };
}

function deduplicateSuggestions(suggestions: ContextSuggestion[]): ContextSuggestion[] {
    const seen = new Map<string, ContextSuggestion>();
    for (const s of suggestions) {
        const existing = seen.get(s.code);
        if (!existing || s.confidence > existing.confidence) {
            seen.set(s.code, s);
        }
    }
    return Array.from(seen.values());
}
