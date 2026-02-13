/**
 * Treatment Modality Library
 * 구조화된 치료 모달리티 정의 — 부위별 추천, 기본시간, 카테고리 등
 */

export interface Modality {
    id: string;
    name: string;
    category: 'physical_therapy' | 'injection' | 'procedure' | 'test';
    defaultMinutes?: number;
    feeCode?: string;  // 수가코드 (향후 확장)
    keywords: string[];
}

export const MODALITY_LIBRARY: Modality[] = [
    // 물리치료
    { id: 'hotpack', name: '핫팩', category: 'physical_therapy', defaultMinutes: 20, keywords: ['핫팩', 'hot pack'] },
    { id: 'ict', name: '간섭파치료(ICT)', category: 'physical_therapy', defaultMinutes: 15, keywords: ['간섭파', 'ICT', 'ict'] },
    { id: 'us', name: '초음파치료', category: 'physical_therapy', defaultMinutes: 5, keywords: ['초음파치료', 'US치료'] },
    { id: 'tens', name: 'TENS', category: 'physical_therapy', defaultMinutes: 15, keywords: ['TENS', 'tens', '경피신경자극'] },
    { id: 'traction_c', name: '경추견인', category: 'physical_therapy', defaultMinutes: 15, keywords: ['경추견인', '목견인'] },
    { id: 'traction_l', name: '요추견인', category: 'physical_therapy', defaultMinutes: 15, keywords: ['요추견인', '허리견인'] },
    { id: 'ir', name: '적외선치료', category: 'physical_therapy', defaultMinutes: 15, keywords: ['적외선', 'IR'] },
    { id: 'cold', name: '냉찜질', category: 'physical_therapy', defaultMinutes: 15, keywords: ['냉찜질', 'ice pack', 'cold pack'] },
    { id: 'laser', name: '레이저치료', category: 'physical_therapy', defaultMinutes: 10, keywords: ['레이저', 'laser'] },
    // 도수/주사
    { id: 'manual', name: '도수치료', category: 'procedure', defaultMinutes: 30, keywords: ['도수치료', 'manual therapy'] },
    { id: 'epidural', name: '경막외주사(Block)', category: 'injection', defaultMinutes: 10, keywords: ['경막외', 'block', 'Block'] },
    { id: 'trigger', name: '트리거포인트 주사', category: 'injection', defaultMinutes: 5, keywords: ['트리거', 'trigger'] },
    { id: 'nerve_block', name: '신경차단술', category: 'injection', defaultMinutes: 15, keywords: ['신경차단', 'nerve block'] },
    { id: 'prp', name: 'PRP 주사', category: 'injection', defaultMinutes: 15, keywords: ['PRP', 'prp'] },
    { id: 'intra_articular', name: '관절강 내 주사', category: 'injection', defaultMinutes: 10, keywords: ['관절강', 'intra-articular'] },
    { id: 'hyaluronic', name: '히알루론산 주사', category: 'injection', defaultMinutes: 10, keywords: ['히알루론', 'hyaluronic'] },
    { id: 'eswt', name: '체외충격파(ESWT)', category: 'procedure', defaultMinutes: 15, keywords: ['충격파', 'ESWT', 'eswt'] },
    { id: 'subacromial', name: '견봉하 주사', category: 'injection', defaultMinutes: 10, keywords: ['견봉하', 'subacromial'] },
];

export const BODY_PART_KEYWORDS: Record<string, string[]> = {
    spine: ['M51', 'M54', 'M47', 'M48', 'M50', 'M43', '요추', '경추', '흉추', '추간판', '디스크', '척추', '허리', '목'],
    knee: ['M17', 'M23', 'S83', 'M22', 'M76.5', '무릎', '슬관절', '반월판', '십자인대'],
    shoulder: ['M75', 'M19.0', 'S43', 'M24.4', '어깨', '견관절', '오십견', '회전근개', '충돌'],
    ankle: ['M77.5', 'S93', 'S82', 'M19.1', '발목', '족관절', '아킬레스', '족저근막'],
    wrist: ['M65', 'S62', 'S63', 'M19.0', '손목', '수근관', '방아쇠'],
    hip: ['M16', 'M70.6', 'S72', '고관절', '엉덩이'],
    elbow: ['M77.0', 'M77.1', 'S53', '팔꿈치', '주관절', '테니스', '골프'],
};

/**
 * Detect body part from visit data text
 */
export function detectBodyPart(text: string): string {
    const upper = text.toUpperCase();
    for (const [part, keywords] of Object.entries(BODY_PART_KEYWORDS)) {
        if (keywords.some(kw => upper.includes(kw.toUpperCase()))) {
            return part;
        }
    }
    return 'general';
}

/**
 * Get recommended modalities for a body part
 */
export function getModalitiesForBodyPart(bodyPart: string): Modality[] {
    const ptModalities = MODALITY_LIBRARY.filter(m => m.category === 'physical_therapy');
    const injModalities = MODALITY_LIBRARY.filter(m => m.category === 'injection' || m.category === 'procedure');

    switch (bodyPart) {
        case 'spine':
            return [
                ...ptModalities.filter(m => ['hotpack', 'ict', 'us', 'tens', 'traction_c', 'traction_l', 'ir'].includes(m.id)),
                ...injModalities.filter(m => ['manual', 'epidural', 'trigger', 'nerve_block', 'prp'].includes(m.id)),
            ];
        case 'knee':
            return [
                ...ptModalities.filter(m => ['hotpack', 'ict', 'us', 'tens', 'cold', 'ir'].includes(m.id)),
                ...injModalities.filter(m => ['intra_articular', 'hyaluronic', 'prp', 'trigger', 'manual'].includes(m.id)),
            ];
        case 'shoulder':
            return [
                ...ptModalities.filter(m => ['hotpack', 'us', 'ict', 'tens', 'ir', 'laser'].includes(m.id)),
                ...injModalities.filter(m => ['subacromial', 'intra_articular', 'prp', 'trigger', 'manual', 'eswt'].includes(m.id)),
            ];
        default:
            return [
                ...ptModalities.filter(m => ['hotpack', 'ict', 'us', 'tens', 'ir'].includes(m.id)),
                ...injModalities.filter(m => ['trigger', 'intra_articular', 'prp', 'manual', 'eswt'].includes(m.id)),
            ];
    }
}

/**
 * Parse treatment note text into individual modalities with duration
 */
export function parseTreatmentNote(text: string): { name: string; minutes: number }[] {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
        const minuteMatch = line.match(/(\d+)\s*분/);
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 15;
        // Try matching to known modality
        const matched = MODALITY_LIBRARY.find(m =>
            m.keywords.some(k => line.includes(k)) || line.includes(m.name)
        );
        return {
            name: line,
            minutes: matched?.defaultMinutes || minutes,
        };
    });
}
