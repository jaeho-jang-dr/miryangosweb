import { describe, it, expect } from 'vitest';

/**
 * Unit tests for lab-panels.ts
 *
 * Tests pure functions: detectPanels, getResultStatus, formatResultEntry
 * Also validates the LAB_PANELS data structure integrity.
 */

// --- Types (copied from lab-panels.ts) ---

interface LabItem {
  name: string;
  unit: string;
  refMin: number;
  refMax: number;
  refRange: string;
}

interface LabPanel {
  id: string;
  name: string;
  nameKo: string;
  keywords: string[];
  items: LabItem[];
}

// --- Data (copied from lab-panels.ts) ---

const LAB_PANELS: LabPanel[] = [
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

// --- Pure functions (copied from lab-panels.ts) ---

function detectPanels(testOrderText: string): LabPanel[] {
  if (!testOrderText) return [];
  const upper = testOrderText.toUpperCase();
  return LAB_PANELS.filter(panel =>
    panel.keywords.some(kw => upper.includes(kw.toUpperCase()))
  );
}

function getResultStatus(value: number, item: LabItem): 'normal' | 'high' | 'low' {
  if (value < item.refMin) return 'low';
  if (value > item.refMax) return 'high';
  return 'normal';
}

function formatResultEntry(itemName: string, value: number, item: LabItem): string {
  const status = getResultStatus(value, item);
  const statusLabel = status === 'normal' ? '정상' : status === 'high' ? '↑높음' : '↓낮음';
  return `${itemName}: ${value} ${item.unit} (${item.refRange}) [${statusLabel}]`;
}


// ===================== TESTS =====================

describe('LAB_PANELS data integrity', () => {
  it('should have 7 panels defined', () => {
    expect(LAB_PANELS).toHaveLength(7);
  });

  it('should have unique panel IDs', () => {
    const ids = LAB_PANELS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have non-empty keywords for each panel', () => {
    for (const panel of LAB_PANELS) {
      expect(panel.keywords.length).toBeGreaterThan(0);
    }
  });

  it('should have non-empty items for each panel', () => {
    for (const panel of LAB_PANELS) {
      expect(panel.items.length).toBeGreaterThan(0);
    }
  });

  it('should have refMin <= refMax for all items', () => {
    for (const panel of LAB_PANELS) {
      for (const item of panel.items) {
        expect(item.refMin).toBeLessThanOrEqual(item.refMax);
      }
    }
  });

  it('should have non-empty name and nameKo for each panel', () => {
    for (const panel of LAB_PANELS) {
      expect(panel.name.length).toBeGreaterThan(0);
      expect(panel.nameKo.length).toBeGreaterThan(0);
    }
  });

  it('should have non-empty unit and refRange for each item', () => {
    for (const panel of LAB_PANELS) {
      for (const item of panel.items) {
        expect(item.unit.length).toBeGreaterThan(0);
        expect(item.refRange.length).toBeGreaterThan(0);
      }
    }
  });
});


describe('detectPanels', () => {
  it('should return empty array for empty string', () => {
    expect(detectPanels('')).toEqual([]);
  });

  it('should return empty array for null/undefined-like input', () => {
    expect(detectPanels(null as unknown as string)).toEqual([]);
    expect(detectPanels(undefined as unknown as string)).toEqual([]);
  });

  it('should detect CBC panel by keyword "CBC"', () => {
    const result = detectPanels('CBC');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
  });

  it('should detect CBC panel case-insensitively', () => {
    const result = detectPanels('cbc');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
  });

  it('should detect CBC panel by Korean keyword', () => {
    const result = detectPanels('혈액검사');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
  });

  it('should detect CRP panel', () => {
    const result = detectPanels('CRP 염증수치 확인');
    expect(result.some(p => p.id === 'crp')).toBe(true);
  });

  it('should detect ESR panel', () => {
    const result = detectPanels('ESR 검사');
    expect(result.some(p => p.id === 'esr')).toBe(true);
  });

  it('should detect RF/RA panel by Korean keyword', () => {
    const result = detectPanels('류마티스인자 검사');
    expect(result.some(p => p.id === 'rf_ra')).toBe(true);
  });

  it('should detect Uric Acid panel by Korean keyword', () => {
    const result = detectPanels('통풍 검사');
    expect(result.some(p => p.id === 'uric_acid')).toBe(true);
  });

  it('should detect BMP panel', () => {
    const result = detectPanels('BMP 전해질');
    expect(result.some(p => p.id === 'bmp')).toBe(true);
  });

  it('should detect DEXA panel by keyword "골밀도"', () => {
    const result = detectPanels('골밀도검사');
    expect(result.some(p => p.id === 'dexa')).toBe(true);
  });

  it('should detect DEXA panel by English keyword "bone density"', () => {
    const result = detectPanels('bone density test');
    expect(result.some(p => p.id === 'dexa')).toBe(true);
  });

  it('should detect multiple panels from combined order text', () => {
    const result = detectPanels('CBC, CRP, ESR 검사 의뢰');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
    expect(result.some(p => p.id === 'crp')).toBe(true);
    expect(result.some(p => p.id === 'esr')).toBe(true);
  });

  it('should detect panels embedded in longer text', () => {
    const result = detectPanels('환자 혈액검사 및 요산 수치 확인 필요');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
    expect(result.some(p => p.id === 'uric_acid')).toBe(true);
  });

  it('should return empty array for unrelated text', () => {
    const result = detectPanels('양측 족부 촬영');
    expect(result).toEqual([]);
  });

  it('should handle mixed case text', () => {
    const result = detectPanels('Cbc, CrP, Esr');
    expect(result.some(p => p.id === 'cbc')).toBe(true);
    expect(result.some(p => p.id === 'crp')).toBe(true);
    expect(result.some(p => p.id === 'esr')).toBe(true);
  });
});


describe('getResultStatus', () => {
  const wbc: LabItem = { name: 'WBC', unit: '×10³/μL', refMin: 4.0, refMax: 10.0, refRange: '4.0-10.0' };

  it('should return "normal" for value within range', () => {
    expect(getResultStatus(7.0, wbc)).toBe('normal');
  });

  it('should return "normal" for value at refMin boundary', () => {
    expect(getResultStatus(4.0, wbc)).toBe('normal');
  });

  it('should return "normal" for value at refMax boundary', () => {
    expect(getResultStatus(10.0, wbc)).toBe('normal');
  });

  it('should return "low" for value below refMin', () => {
    expect(getResultStatus(3.9, wbc)).toBe('low');
  });

  it('should return "high" for value above refMax', () => {
    expect(getResultStatus(10.1, wbc)).toBe('high');
  });

  it('should return "low" for zero when refMin > 0', () => {
    expect(getResultStatus(0, wbc)).toBe('low');
  });

  it('should return "normal" for zero when refMin is 0', () => {
    const crp: LabItem = { name: 'CRP', unit: 'mg/dL', refMin: 0, refMax: 0.5, refRange: '0-0.5' };
    expect(getResultStatus(0, crp)).toBe('normal');
  });

  it('should handle negative values (e.g., T-score)', () => {
    const tscore: LabItem = { name: 'T-Score', unit: 'SD', refMin: -1.0, refMax: 999, refRange: '> -1.0' };
    expect(getResultStatus(-0.5, tscore)).toBe('normal');
    expect(getResultStatus(-1.0, tscore)).toBe('normal');
    expect(getResultStatus(-1.5, tscore)).toBe('low');
    expect(getResultStatus(-2.5, tscore)).toBe('low');
  });

  it('should work for various lab items', () => {
    const glucose: LabItem = { name: 'Glucose', unit: 'mg/dL', refMin: 70, refMax: 100, refRange: '70-100' };
    expect(getResultStatus(85, glucose)).toBe('normal');
    expect(getResultStatus(126, glucose)).toBe('high'); // diabetic range
    expect(getResultStatus(55, glucose)).toBe('low');  // hypoglycemia
  });
});


describe('formatResultEntry', () => {
  const wbc: LabItem = { name: 'WBC', unit: '×10³/μL', refMin: 4.0, refMax: 10.0, refRange: '4.0-10.0' };

  it('should format a normal result correctly', () => {
    const result = formatResultEntry('WBC', 7.5, wbc);
    expect(result).toBe('WBC: 7.5 ×10³/μL (4.0-10.0) [정상]');
  });

  it('should format a high result correctly', () => {
    const result = formatResultEntry('WBC', 15.0, wbc);
    expect(result).toBe('WBC: 15 ×10³/μL (4.0-10.0) [↑높음]');
  });

  it('should format a low result correctly', () => {
    const result = formatResultEntry('WBC', 2.0, wbc);
    expect(result).toBe('WBC: 2 ×10³/μL (4.0-10.0) [↓낮음]');
  });

  it('should include the item name, value, unit, refRange, and status', () => {
    const crp: LabItem = { name: 'CRP', unit: 'mg/dL', refMin: 0, refMax: 0.5, refRange: '0-0.5' };
    const result = formatResultEntry('CRP', 3.5, crp);
    expect(result).toContain('CRP');
    expect(result).toContain('3.5');
    expect(result).toContain('mg/dL');
    expect(result).toContain('0-0.5');
    expect(result).toContain('↑높음');
  });

  it('should use the provided itemName, not the item.name', () => {
    const result = formatResultEntry('Custom Name', 7.5, wbc);
    expect(result.startsWith('Custom Name:')).toBe(true);
  });

  it('should format boundary values correctly', () => {
    const resultAtMin = formatResultEntry('WBC', 4.0, wbc);
    expect(resultAtMin).toContain('[정상]');

    const resultAtMax = formatResultEntry('WBC', 10.0, wbc);
    expect(resultAtMax).toContain('[정상]');
  });
});
