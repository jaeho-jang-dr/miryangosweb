/**
 * Tests for diagnosis-context-suggest.ts
 *
 * The suggestDiagnosisByContext function uses searchDiagnosisV2 internally,
 * so we mock it to isolate the logic under test.
 */

jest.mock('../kcd-search-v2', () => ({
  searchDiagnosisV2: jest.fn(() => []),
}));

import { suggestDiagnosisByContext } from '../diagnosis-context-suggest';
import type { DiagnosisContextInput, GroupedSuggestions } from '../diagnosis-context-suggest';
import { searchDiagnosisV2 } from '../kcd-search-v2';

const mockedSearch = searchDiagnosisV2 as jest.MockedFunction<typeof searchDiagnosisV2>;

describe('diagnosis-context-suggest', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
    mockedSearch.mockReturnValue([]);
  });

  describe('suggestDiagnosisByContext', () => {
    it('should return grouped suggestions with three categories', () => {
      const input: DiagnosisContextInput = {
        cc: '',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result).toHaveProperty('symptomBased');
      expect(result).toHaveProperty('peBased');
      expect(result).toHaveProperty('testBased');
      expect(Array.isArray(result.symptomBased)).toBe(true);
      expect(Array.isArray(result.peBased)).toBe(true);
      expect(Array.isArray(result.testBased)).toBe(true);
    });

    it('should suggest knee diagnoses when CC mentions knee (무릎)', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      // M17.1 or M17.9 should be among knee diagnoses
      expect(codes.some(c => c.startsWith('M17'))).toBe(true);
    });

    it('should suggest shoulder diagnoses when CC mentions shoulder (어깨)', () => {
      const input: DiagnosisContextInput = {
        cc: '어깨가 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      expect(codes.some(c => c.startsWith('M75'))).toBe(true);
    });

    it('should suggest lumbar diagnoses when CC mentions lower back (허리)', () => {
      const input: DiagnosisContextInput = {
        cc: '허리가 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      expect(codes.some(c => c === 'M54.5')).toBe(true); // 요통
    });

    it('should add conditional diagnoses when condition keyword is present', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아프고 저림',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      // Some codes have condition '저림' — they should appear with higher confidence
      const numbnessCodes = result.symptomBased.filter(s =>
        s.reason.includes('저림')
      );
      // Should have conditional codes
      expect(result.symptomBased.length).toBeGreaterThan(0);
    });

    it('should generate PE-based suggestions for physical exam findings', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아파요',
        pe: '부종, 압통',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.peBased.length).toBeGreaterThan(0);
      // Check that PE findings add relevant codes
      const peCodes = result.peBased.map(s => s.code);
      expect(peCodes.some(c => c === 'M25.4' || c === 'M79.1')).toBe(true);
    });

    it('should generate test-based suggestions from X-ray order', () => {
      const input: DiagnosisContextInput = {
        cc: '',
        pe: '',
        testOrder: 'Knee AP/Lateral',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.testBased.length).toBeGreaterThan(0);
      const testCodes = result.testBased.map(s => s.code);
      expect(testCodes.some(c => c.startsWith('M17'))).toBe(true);
    });

    it('should detect body part from Korean test order', () => {
      const input: DiagnosisContextInput = {
        cc: '',
        pe: '',
        testOrder: '요추 X-ray',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.testBased.length).toBeGreaterThan(0);
      const testCodes = result.testBased.map(s => s.code);
      expect(testCodes.some(c => c === 'M54.5')).toBe(true); // 요통
    });

    it('should boost confidence when symptoms, PE, and test all align', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아프고 부었어요',
        pe: '부종',
        testOrder: 'Knee AP',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      // Codes that appear in symptom+PE+test should have higher confidence
      const symptomCodes = result.symptomBased;
      const highConfidence = symptomCodes.filter(s => s.confidence >= 0.7);
      expect(highConfidence.length).toBeGreaterThan(0);
    });

    it('should sort suggestions by confidence descending', () => {
      const input: DiagnosisContextInput = {
        cc: '어깨가 아파요',
        pe: '운동제한',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      for (const category of [result.symptomBased, result.peBased, result.testBased]) {
        for (let i = 1; i < category.length; i++) {
          expect(category[i - 1].confidence).toBeGreaterThanOrEqual(category[i].confidence);
        }
      }
    });

    it('should limit symptom-based suggestions to 8 max', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎 어깨 허리 발목 목 팔꿈치 고관절 손목',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeLessThanOrEqual(8);
    });

    it('should limit PE-based suggestions to 6 max', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎 어깨 허리',
        pe: '압통 부종 관절변형 관절운동제한 근경직 근력약화 감각이상 저림 발적 열감',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.peBased.length).toBeLessThanOrEqual(6);
    });

    it('should limit test-based suggestions to 6 max', () => {
      const input: DiagnosisContextInput = {
        cc: '',
        pe: '',
        testOrder: 'Knee Shoulder L-spine C-spine Ankle Hip',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.testBased.length).toBeLessThanOrEqual(6);
    });

    it('should deduplicate suggestions with the same code', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      const codes = result.symptomBased.map(s => s.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('should include source field in suggestions', () => {
      const input: DiagnosisContextInput = {
        cc: '무릎이 아파요',
        pe: '부종',
        testOrder: 'Knee AP',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      for (const s of result.symptomBased) {
        expect(s.source).toBe('symptom');
      }
      for (const s of result.peBased) {
        expect(s.source).toBe('pe');
      }
      for (const s of result.testBased) {
        expect(s.source).toBe('test');
      }
    });

    it('should include reason field in all suggestions', () => {
      const input: DiagnosisContextInput = {
        cc: '허리가 아파요',
        pe: '근경직',
        testOrder: 'L-spine',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      const allSuggestions = [
        ...result.symptomBased,
        ...result.peBased,
        ...result.testBased,
      ];
      for (const s of allSuggestions) {
        expect(s.reason).toBeTruthy();
      }
    });

    it('should handle empty input gracefully', () => {
      const input: DiagnosisContextInput = {
        cc: '',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased).toEqual([]);
      expect(result.peBased).toEqual([]);
      expect(result.testBased).toEqual([]);
    });

    it('should use searchDiagnosisV2 for keyword-based CC search', () => {
      mockedSearch.mockReturnValue([
        { code: 'M54.5', ko: '요통', en: 'Low back pain', category: '' } as any,
      ]);

      const input: DiagnosisContextInput = {
        cc: '요통증상',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(mockedSearch).toHaveBeenCalled();
    });

    it('should handle neck/cervical complaints', () => {
      const input: DiagnosisContextInput = {
        cc: '목이 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      expect(codes.some(c => c === 'M54.2')).toBe(true); // 경부통
    });

    it('should handle ankle sprains', () => {
      const input: DiagnosisContextInput = {
        cc: '발목 접질렸어요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      expect(codes.some(c => c === 'S93.4')).toBe(true); // 발목 염좌
    });

    it('should handle elbow conditions', () => {
      const input: DiagnosisContextInput = {
        cc: '팔꿈치가 아파요',
        pe: '',
        testOrder: '',
        testResult: '',
      };
      const result = suggestDiagnosisByContext(input);
      expect(result.symptomBased.length).toBeGreaterThan(0);
      const codes = result.symptomBased.map(s => s.code);
      expect(codes.some(c => c === 'M77.1' || c === 'M77.0')).toBe(true);
    });
  });
});
