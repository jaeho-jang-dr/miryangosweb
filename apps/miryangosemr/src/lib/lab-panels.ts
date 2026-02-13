/**
 * Lab Test Panel Definitions
 * 검사 패널 정의 — 항목별 참조범위 포함
 */

export interface LabItem {
    name: string;
    unit: string;
    refMin: number;
    refMax: number;
    refRange: string; // Display string e.g. "4.0-10.0"
}

export interface LabPanel {
    id: string;
    name: string;
    nameKo: string;
    keywords: string[];
    items: LabItem[];
}

export const LAB_PANELS: LabPanel[] = [
    {
        id: 'cbc',
        name: 'CBC',
        nameKo: '일반혈액검사',
        keywords: ['CBC', 'cbc', '혈액검사', '일반혈액', 'blood count'],
        items: [
            { name: 'WBC', unit: '×10³/μL', refMin: 4.0, refMax: 10.0, refRange: '4.0-10.0' },
            { name: 'RBC', unit: '×10⁶/μL', refMin: 4.0, refMax: 5.5, refRange: '4.0-5.5' },
            { name: 'Hb', unit: 'g/dL', refMin: 12.0, refMax: 17.0, refRange: '12.0-17.0' },
            { name: 'Hct', unit: '%', refMin: 36.0, refMax: 50.0, refRange: '36.0-50.0' },
            { name: 'PLT', unit: '×10³/μL', refMin: 150, refMax: 400, refRange: '150-400' },
        ],
    },
    {
        id: 'crp',
        name: 'CRP',
        nameKo: 'C-반응성 단백',
        keywords: ['CRP', 'crp', 'C-반응성', '염증수치'],
        items: [
            { name: 'CRP', unit: 'mg/dL', refMin: 0, refMax: 0.5, refRange: '0-0.5' },
        ],
    },
    {
        id: 'esr',
        name: 'ESR',
        nameKo: '적혈구 침강속도',
        keywords: ['ESR', 'esr', '침강속도'],
        items: [
            { name: 'ESR', unit: 'mm/hr', refMin: 0, refMax: 20, refRange: '0-20' },
        ],
    },
    {
        id: 'rf_ra',
        name: 'RF/RA Set',
        nameKo: '류마티스인자 세트',
        keywords: ['RF', 'RA', '류마티스', 'rheumatoid', 'rf', 'ra'],
        items: [
            { name: 'RF (Rheumatoid Factor)', unit: 'IU/mL', refMin: 0, refMax: 14, refRange: '0-14' },
            { name: 'Anti-CCP', unit: 'U/mL', refMin: 0, refMax: 5, refRange: '0-5' },
        ],
    },
    {
        id: 'uric_acid',
        name: 'Uric Acid',
        nameKo: '요산',
        keywords: ['Uric', 'uric', '요산', '통풍'],
        items: [
            { name: 'Uric Acid', unit: 'mg/dL', refMin: 3.0, refMax: 7.0, refRange: '3.0-7.0' },
        ],
    },
    {
        id: 'bmp',
        name: 'BMP',
        nameKo: '기본대사패널',
        keywords: ['BMP', 'bmp', '대사패널', '전해질'],
        items: [
            { name: 'Glucose', unit: 'mg/dL', refMin: 70, refMax: 100, refRange: '70-100' },
            { name: 'BUN', unit: 'mg/dL', refMin: 7, refMax: 20, refRange: '7-20' },
            { name: 'Creatinine', unit: 'mg/dL', refMin: 0.6, refMax: 1.2, refRange: '0.6-1.2' },
            { name: 'Na', unit: 'mEq/L', refMin: 136, refMax: 145, refRange: '136-145' },
            { name: 'K', unit: 'mEq/L', refMin: 3.5, refMax: 5.0, refRange: '3.5-5.0' },
            { name: 'Ca', unit: 'mg/dL', refMin: 8.5, refMax: 10.5, refRange: '8.5-10.5' },
        ],
    },
    {
        id: 'dexa',
        name: 'DEXA',
        nameKo: '골밀도검사',
        keywords: ['DEXA', 'dexa', '골밀도', 'BMD', 'bone density'],
        items: [
            { name: 'T-Score (L-Spine)', unit: 'SD', refMin: -1.0, refMax: 999, refRange: '> -1.0' },
            { name: 'T-Score (Femur)', unit: 'SD', refMin: -1.0, refMax: 999, refRange: '> -1.0' },
        ],
    },
];

/**
 * Detect matching lab panels from test order text
 */
export function detectPanels(testOrderText: string): LabPanel[] {
    if (!testOrderText) return [];
    const upper = testOrderText.toUpperCase();
    return LAB_PANELS.filter(panel =>
        panel.keywords.some(kw => upper.includes(kw.toUpperCase()))
    );
}

/**
 * Determine result status based on reference range
 */
export function getResultStatus(value: number, item: LabItem): 'normal' | 'high' | 'low' {
    if (value < item.refMin) return 'low';
    if (value > item.refMax) return 'high';
    return 'normal';
}

/**
 * Format a single result entry
 */
export function formatResultEntry(itemName: string, value: number, item: LabItem): string {
    const status = getResultStatus(value, item);
    const statusLabel = status === 'normal' ? '정상' : status === 'high' ? '↑높음' : '↓낮음';
    return `${itemName}: ${value} ${item.unit} (${item.refRange}) [${statusLabel}]`;
}
