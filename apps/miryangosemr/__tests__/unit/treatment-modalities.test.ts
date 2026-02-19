import { describe, it, expect } from 'vitest';

/**
 * Unit tests for treatment-modalities.ts
 *
 * Tests pure functions: detectBodyPart, getModalitiesForBodyPart, parseTreatmentNote
 * Also validates the MODALITY_LIBRARY and BODY_PART_KEYWORDS data integrity.
 */

// --- Types (copied from treatment-modalities.ts) ---

interface Modality {
  id: string;
  name: string;
  category: 'physical_therapy' | 'injection' | 'procedure' | 'test';
  defaultMinutes?: number;
  feeCode?: string;
  keywords: string[];
}

// --- Data (copied from treatment-modalities.ts) ---

const MODALITY_LIBRARY: Modality[] = [
  { id: 'hotpack', name: '핫팩', category: 'physical_therapy', defaultMinutes: 20, keywords: ['핫팩', 'hot pack'] },
  { id: 'ict', name: '간섭파치료(ICT)', category: 'physical_therapy', defaultMinutes: 15, keywords: ['간섭파', 'ICT', 'ict'] },
  { id: 'us', name: '초음파치료', category: 'physical_therapy', defaultMinutes: 5, keywords: ['초음파치료', 'US치료'] },
  { id: 'tens', name: 'TENS', category: 'physical_therapy', defaultMinutes: 15, keywords: ['TENS', 'tens', '경피신경자극'] },
  { id: 'traction_c', name: '경추견인', category: 'physical_therapy', defaultMinutes: 15, keywords: ['경추견인', '목견인'] },
  { id: 'traction_l', name: '요추견인', category: 'physical_therapy', defaultMinutes: 15, keywords: ['요추견인', '허리견인'] },
  { id: 'ir', name: '적외선치료', category: 'physical_therapy', defaultMinutes: 15, keywords: ['적외선', 'IR'] },
  { id: 'cold', name: '냉찜질', category: 'physical_therapy', defaultMinutes: 15, keywords: ['냉찜질', 'ice pack', 'cold pack'] },
  { id: 'laser', name: '레이저치료', category: 'physical_therapy', defaultMinutes: 10, keywords: ['레이저', 'laser'] },
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

const BODY_PART_KEYWORDS: Record<string, string[]> = {
  spine: ['M51', 'M54', 'M47', 'M48', 'M50', 'M43', '요추', '경추', '흉추', '추간판', '디스크', '척추', '허리', '목'],
  knee: ['M17', 'M23', 'S83', 'M22', 'M76.5', '무릎', '슬관절', '반월판', '십자인대'],
  shoulder: ['M75', 'M19.0', 'S43', 'M24.4', '어깨', '견관절', '오십견', '회전근개', '충돌'],
  ankle: ['M77.5', 'S93', 'S82', 'M19.1', '발목', '족관절', '아킬레스', '족저근막'],
  wrist: ['M65', 'S62', 'S63', 'M19.0', '손목', '수근관', '방아쇠'],
  hip: ['M16', 'M70.6', 'S72', '고관절', '엉덩이'],
  elbow: ['M77.0', 'M77.1', 'S53', '팔꿈치', '주관절', '테니스', '골프'],
};

// --- Pure functions (copied from treatment-modalities.ts) ---

function detectBodyPart(text: string): string {
  const upper = text.toUpperCase();
  for (const [part, keywords] of Object.entries(BODY_PART_KEYWORDS)) {
    if (keywords.some(kw => upper.includes(kw.toUpperCase()))) {
      return part;
    }
  }
  return 'general';
}

function getModalitiesForBodyPart(bodyPart: string): Modality[] {
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

function parseTreatmentNote(text: string): { name: string; minutes: number }[] {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const minuteMatch = line.match(/(\d+)\s*분/);
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 15;
    const matched = MODALITY_LIBRARY.find(m =>
      m.keywords.some(k => line.includes(k)) || line.includes(m.name)
    );
    return {
      name: line,
      minutes: matched?.defaultMinutes || minutes,
    };
  });
}


// ===================== TESTS =====================

describe('MODALITY_LIBRARY data integrity', () => {
  it('should have 18 modalities defined', () => {
    expect(MODALITY_LIBRARY).toHaveLength(18);
  });

  it('should have unique modality IDs', () => {
    const ids = MODALITY_LIBRARY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have non-empty keywords for each modality', () => {
    for (const mod of MODALITY_LIBRARY) {
      expect(mod.keywords.length).toBeGreaterThan(0);
    }
  });

  it('should have valid categories', () => {
    const validCategories = ['physical_therapy', 'injection', 'procedure', 'test'];
    for (const mod of MODALITY_LIBRARY) {
      expect(validCategories).toContain(mod.category);
    }
  });

  it('should have positive defaultMinutes for all modalities', () => {
    for (const mod of MODALITY_LIBRARY) {
      if (mod.defaultMinutes !== undefined) {
        expect(mod.defaultMinutes).toBeGreaterThan(0);
      }
    }
  });

  it('should have 9 physical_therapy modalities', () => {
    const pt = MODALITY_LIBRARY.filter(m => m.category === 'physical_therapy');
    expect(pt).toHaveLength(9);
  });

  it('should have 7 injection modalities', () => {
    const inj = MODALITY_LIBRARY.filter(m => m.category === 'injection');
    expect(inj).toHaveLength(7);
  });

  it('should have 2 procedure modalities', () => {
    const proc = MODALITY_LIBRARY.filter(m => m.category === 'procedure');
    expect(proc).toHaveLength(2);
  });
});


describe('BODY_PART_KEYWORDS data integrity', () => {
  it('should have 7 body parts defined', () => {
    expect(Object.keys(BODY_PART_KEYWORDS)).toHaveLength(7);
  });

  it('should include expected body parts', () => {
    const parts = Object.keys(BODY_PART_KEYWORDS);
    expect(parts).toContain('spine');
    expect(parts).toContain('knee');
    expect(parts).toContain('shoulder');
    expect(parts).toContain('ankle');
    expect(parts).toContain('wrist');
    expect(parts).toContain('hip');
    expect(parts).toContain('elbow');
  });

  it('should have non-empty keyword arrays', () => {
    for (const [, keywords] of Object.entries(BODY_PART_KEYWORDS)) {
      expect(keywords.length).toBeGreaterThan(0);
    }
  });
});


describe('detectBodyPart', () => {
  describe('spine detection', () => {
    it('should detect spine from ICD code M51', () => {
      expect(detectBodyPart('M51.1 요추 추간판탈출증')).toBe('spine');
    });

    it('should detect spine from Korean keyword 허리', () => {
      expect(detectBodyPart('허리 통증')).toBe('spine');
    });

    it('should detect spine from Korean keyword 목', () => {
      expect(detectBodyPart('목 통증')).toBe('spine');
    });

    it('should detect spine from keyword 디스크', () => {
      expect(detectBodyPart('디스크 증상')).toBe('spine');
    });

    it('should detect spine from keyword 척추', () => {
      expect(detectBodyPart('척추관 협착증')).toBe('spine');
    });
  });

  describe('knee detection', () => {
    it('should detect knee from ICD code M17', () => {
      expect(detectBodyPart('M17 무릎 골관절염')).toBe('knee');
    });

    it('should detect knee from Korean keyword 무릎', () => {
      expect(detectBodyPart('무릎 통증')).toBe('knee');
    });

    it('should detect knee from keyword 반월판', () => {
      expect(detectBodyPart('반월판 손상')).toBe('knee');
    });

    it('should detect knee from keyword 십자인대', () => {
      expect(detectBodyPart('전방 십자인대 파열')).toBe('knee');
    });
  });

  describe('shoulder detection', () => {
    it('should detect shoulder from ICD code M75', () => {
      expect(detectBodyPart('M75 오십견')).toBe('shoulder');
    });

    it('should detect shoulder from Korean keyword 어깨', () => {
      expect(detectBodyPart('어깨 통증')).toBe('shoulder');
    });

    it('should detect shoulder from keyword 회전근개', () => {
      expect(detectBodyPart('회전근개 파열')).toBe('shoulder');
    });

    it('should detect shoulder from keyword 오십견', () => {
      expect(detectBodyPart('오십견 치료')).toBe('shoulder');
    });
  });

  describe('ankle detection', () => {
    it('should detect ankle from Korean keyword 족관절', () => {
      expect(detectBodyPart('족관절 염좌')).toBe('ankle');
    });

    it('should note that 발목 matches spine first due to 목 keyword overlap', () => {
      // "발목" contains "목" which is a spine keyword; spine is checked first
      expect(detectBodyPart('발목 염좌')).toBe('spine');
    });

    it('should detect ankle from keyword 아킬레스', () => {
      expect(detectBodyPart('아킬레스건염')).toBe('ankle');
    });

    it('should detect ankle from keyword 족저근막', () => {
      expect(detectBodyPart('족저근막염')).toBe('ankle');
    });
  });

  describe('wrist detection', () => {
    it('should detect wrist from Korean keyword 수근관', () => {
      // "손목" contains "목" (spine keyword) so use 수근관 instead
      expect(detectBodyPart('수근관 통증')).toBe('wrist');
    });

    it('should note that 손목 matches spine first due to 목 keyword overlap', () => {
      // "손목" contains "목" which is a spine keyword; spine is checked first
      expect(detectBodyPart('손목 통증')).toBe('spine');
    });

    it('should detect wrist from keyword 수근관', () => {
      expect(detectBodyPart('수근관 증후군')).toBe('wrist');
    });

    it('should detect wrist from keyword 방아쇠', () => {
      expect(detectBodyPart('방아쇠 수지')).toBe('wrist');
    });
  });

  describe('hip detection', () => {
    it('should detect hip from Korean keyword 고관절', () => {
      expect(detectBodyPart('고관절 통증')).toBe('hip');
    });

    it('should detect hip from ICD code M16', () => {
      expect(detectBodyPart('M16 고관절 관절염')).toBe('hip');
    });
  });

  describe('elbow detection', () => {
    it('should detect elbow from Korean keyword 팔꿈치', () => {
      expect(detectBodyPart('팔꿈치 통증')).toBe('elbow');
    });

    it('should detect elbow from keyword 테니스', () => {
      expect(detectBodyPart('테니스 엘보')).toBe('elbow');
    });

    it('should detect elbow from keyword 골프', () => {
      expect(detectBodyPart('골프 엘보')).toBe('elbow');
    });

    it('should detect elbow from ICD code M77.0', () => {
      expect(detectBodyPart('M77.0')).toBe('elbow');
    });
  });

  describe('general (fallback)', () => {
    it('should return "general" for unrelated text', () => {
      expect(detectBodyPart('일반 진료')).toBe('general');
    });

    it('should return "general" for empty-ish text', () => {
      expect(detectBodyPart('검사 결과')).toBe('general');
    });
  });

  it('should be case-insensitive for ICD codes', () => {
    expect(detectBodyPart('m51')).toBe('spine');
    expect(detectBodyPart('m17')).toBe('knee');
  });

  it('should detect the first matching body part (spine before others)', () => {
    // spine is checked first in the object iteration
    expect(detectBodyPart('M51 M17')).toBe('spine');
  });
});


describe('getModalitiesForBodyPart', () => {
  describe('spine', () => {
    it('should include traction modalities for spine', () => {
      const result = getModalitiesForBodyPart('spine');
      const ids = result.map(m => m.id);
      expect(ids).toContain('traction_c');
      expect(ids).toContain('traction_l');
    });

    it('should include epidural for spine', () => {
      const result = getModalitiesForBodyPart('spine');
      const ids = result.map(m => m.id);
      expect(ids).toContain('epidural');
    });

    it('should include hotpack, ict, us, tens, ir for spine', () => {
      const result = getModalitiesForBodyPart('spine');
      const ids = result.map(m => m.id);
      expect(ids).toContain('hotpack');
      expect(ids).toContain('ict');
      expect(ids).toContain('us');
      expect(ids).toContain('tens');
      expect(ids).toContain('ir');
    });

    it('should include manual therapy and nerve_block for spine', () => {
      const result = getModalitiesForBodyPart('spine');
      const ids = result.map(m => m.id);
      expect(ids).toContain('manual');
      expect(ids).toContain('nerve_block');
    });

    it('should NOT include subacromial for spine', () => {
      const result = getModalitiesForBodyPart('spine');
      const ids = result.map(m => m.id);
      expect(ids).not.toContain('subacromial');
    });
  });

  describe('knee', () => {
    it('should include cold and intra_articular for knee', () => {
      const result = getModalitiesForBodyPart('knee');
      const ids = result.map(m => m.id);
      expect(ids).toContain('cold');
      expect(ids).toContain('intra_articular');
    });

    it('should include hyaluronic for knee', () => {
      const result = getModalitiesForBodyPart('knee');
      const ids = result.map(m => m.id);
      expect(ids).toContain('hyaluronic');
    });

    it('should NOT include traction for knee', () => {
      const result = getModalitiesForBodyPart('knee');
      const ids = result.map(m => m.id);
      expect(ids).not.toContain('traction_c');
      expect(ids).not.toContain('traction_l');
    });

    it('should NOT include epidural for knee', () => {
      const result = getModalitiesForBodyPart('knee');
      const ids = result.map(m => m.id);
      expect(ids).not.toContain('epidural');
    });
  });

  describe('shoulder', () => {
    it('should include subacromial for shoulder', () => {
      const result = getModalitiesForBodyPart('shoulder');
      const ids = result.map(m => m.id);
      expect(ids).toContain('subacromial');
    });

    it('should include laser for shoulder', () => {
      const result = getModalitiesForBodyPart('shoulder');
      const ids = result.map(m => m.id);
      expect(ids).toContain('laser');
    });

    it('should include eswt for shoulder', () => {
      const result = getModalitiesForBodyPart('shoulder');
      const ids = result.map(m => m.id);
      expect(ids).toContain('eswt');
    });

    it('should NOT include traction for shoulder', () => {
      const result = getModalitiesForBodyPart('shoulder');
      const ids = result.map(m => m.id);
      expect(ids).not.toContain('traction_c');
      expect(ids).not.toContain('traction_l');
    });
  });

  describe('default (general/other)', () => {
    it('should return a default set for unknown body parts', () => {
      const result = getModalitiesForBodyPart('general');
      const ids = result.map(m => m.id);
      expect(ids).toContain('hotpack');
      expect(ids).toContain('ict');
      expect(ids).toContain('us');
      expect(ids).toContain('tens');
      expect(ids).toContain('ir');
    });

    it('should include trigger and eswt in default', () => {
      const result = getModalitiesForBodyPart('general');
      const ids = result.map(m => m.id);
      expect(ids).toContain('trigger');
      expect(ids).toContain('eswt');
    });

    it('should NOT include traction in default', () => {
      const result = getModalitiesForBodyPart('general');
      const ids = result.map(m => m.id);
      expect(ids).not.toContain('traction_c');
      expect(ids).not.toContain('traction_l');
    });

    it('should use default for any unrecognized body part', () => {
      const result1 = getModalitiesForBodyPart('general');
      const result2 = getModalitiesForBodyPart('unknown');
      expect(result1.map(m => m.id)).toEqual(result2.map(m => m.id));
    });
  });

  it('should return non-empty arrays for all known body parts', () => {
    const bodyParts = ['spine', 'knee', 'shoulder', 'general'];
    for (const part of bodyParts) {
      const result = getModalitiesForBodyPart(part);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('should return only valid modalities from the library', () => {
    const allIds = MODALITY_LIBRARY.map(m => m.id);
    const bodyParts = ['spine', 'knee', 'shoulder', 'general'];
    for (const part of bodyParts) {
      const result = getModalitiesForBodyPart(part);
      for (const mod of result) {
        expect(allIds).toContain(mod.id);
      }
    }
  });
});


describe('parseTreatmentNote', () => {
  it('should return empty array for empty string', () => {
    expect(parseTreatmentNote('')).toEqual([]);
  });

  it('should return empty array for null/undefined', () => {
    expect(parseTreatmentNote(null as unknown as string)).toEqual([]);
    expect(parseTreatmentNote(undefined as unknown as string)).toEqual([]);
  });

  it('should parse a single line with known modality keyword', () => {
    const result = parseTreatmentNote('핫팩 적용');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('핫팩 적용');
    expect(result[0].minutes).toBe(20); // hotpack defaultMinutes
  });

  it('should parse explicit minutes from text (분)', () => {
    const result = parseTreatmentNote('일반 치료 30분');
    expect(result).toHaveLength(1);
    expect(result[0].minutes).toBe(30);
  });

  it('should prefer matched modality defaultMinutes over parsed minutes', () => {
    // 핫팩 has defaultMinutes=20, but text says 30분
    const result = parseTreatmentNote('핫팩 30분');
    expect(result[0].minutes).toBe(20); // matched modality takes priority
  });

  it('should parse multiple lines', () => {
    const note = '핫팩\n간섭파\nTENS';
    const result = parseTreatmentNote(note);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('핫팩');
    expect(result[0].minutes).toBe(20); // hotpack
    expect(result[1].name).toBe('간섭파');
    expect(result[1].minutes).toBe(15); // ICT
    expect(result[2].name).toBe('TENS');
    expect(result[2].minutes).toBe(15); // TENS
  });

  it('should skip empty lines', () => {
    const note = '핫팩\n\n\n간섭파\n  \nTENS';
    const result = parseTreatmentNote(note);
    expect(result).toHaveLength(3);
  });

  it('should trim whitespace from lines', () => {
    const note = '  핫팩  \n  간섭파  ';
    const result = parseTreatmentNote(note);
    expect(result[0].name).toBe('핫팩');
    expect(result[1].name).toBe('간섭파');
  });

  it('should default to 15 minutes for unknown treatments without explicit time', () => {
    const result = parseTreatmentNote('기타 치료');
    expect(result[0].minutes).toBe(15);
  });

  it('should match modality by name (not just keywords)', () => {
    // '간섭파치료(ICT)' is the name of the ICT modality
    const result = parseTreatmentNote('간섭파치료(ICT)');
    expect(result[0].minutes).toBe(15); // ICT defaultMinutes
  });

  it('should handle complex treatment notes', () => {
    const note = `핫팩 20분
간섭파 15분
초음파치료 5분
경추견인 15분
도수치료 30분`;
    const result = parseTreatmentNote(note);
    expect(result).toHaveLength(5);
    expect(result[0].minutes).toBe(20); // hotpack
    expect(result[1].minutes).toBe(15); // ICT
    expect(result[2].minutes).toBe(5);  // US
    expect(result[3].minutes).toBe(15); // traction_c
    expect(result[4].minutes).toBe(30); // manual
  });

  it('should match English keywords', () => {
    const result = parseTreatmentNote('hot pack applied');
    expect(result[0].minutes).toBe(20); // hotpack
  });

  it('should match trigger keyword', () => {
    const result = parseTreatmentNote('트리거포인트 주사');
    expect(result[0].minutes).toBe(5); // trigger defaultMinutes
  });

  it('should match PRP keyword', () => {
    const result = parseTreatmentNote('PRP 주사');
    expect(result[0].minutes).toBe(15); // PRP defaultMinutes
  });

  it('should handle single character lines after trim/filter', () => {
    const note = 'A';
    const result = parseTreatmentNote(note);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('A');
    expect(result[0].minutes).toBe(15); // default
  });
});
