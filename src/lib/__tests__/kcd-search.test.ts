/**
 * Tests for kcd-search.ts (v1 KCD search module)
 */

jest.mock('@/data/kcd', () => ({
  KCD_DATA: [
    { code: 'M54.5', ko: '요통', en: 'Low back pain' },
    { code: 'M17.1', ko: '기타 원발성 무릎관절증', en: 'Other primary gonarthrosis' },
    { code: 'M75.1', ko: '회전근개 증후군', en: 'Rotator cuff syndrome' },
    { code: 'M77.1', ko: '외측상과염', en: 'Lateral epicondylitis' },
    { code: 'S93.4', ko: '발목의 염좌 및 긴장', en: 'Sprain and strain of ankle' },
    { code: 'G56.0', ko: '손목터널증후군', en: 'Carpal tunnel syndrome' },
  ],
}));

import { searchKCD, formatKCD } from '../kcd-search';

describe('kcd-search', () => {
  describe('searchKCD', () => {
    it('should return empty array for empty query', () => {
      expect(searchKCD('')).toEqual([]);
    });

    it('should search by code', () => {
      const results = searchKCD('M54');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('M54.5');
    });

    it('should search by full code', () => {
      const results = searchKCD('M17.1');
      expect(results).toHaveLength(1);
      expect(results[0].ko).toBe('기타 원발성 무릎관절증');
    });

    it('should search by Korean name', () => {
      const results = searchKCD('요통');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('M54.5');
    });

    it('should search by English name', () => {
      const results = searchKCD('rotator');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('M75.1');
    });

    it('should be case-insensitive for codes', () => {
      const upper = searchKCD('M54');
      const lower = searchKCD('m54');
      expect(upper).toEqual(lower);
    });

    it('should be case-insensitive for English names', () => {
      const results = searchKCD('CARPAL');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('G56.0');
    });

    it('should trim whitespace from query', () => {
      const results = searchKCD('  요통  ');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('M54.5');
    });

    it('should return multiple matches', () => {
      const results = searchKCD('M');
      expect(results.length).toBeGreaterThan(1);
    });

    it('should return empty for non-matching query', () => {
      const results = searchKCD('ZZZZZZ');
      expect(results).toEqual([]);
    });

    it('should match partial Korean name', () => {
      const results = searchKCD('회전');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('M75.1');
    });

    it('should match partial English name', () => {
      const results = searchKCD('sprain');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('S93.4');
    });
  });

  describe('formatKCD', () => {
    it('should format a KCD item as [code] ko', () => {
      const result = formatKCD({ code: 'M54.5', ko: '요통', en: 'Low back pain' });
      expect(result).toBe('[M54.5] 요통');
    });

    it('should handle codes without dots', () => {
      const result = formatKCD({ code: 'Z00', ko: '일반검사', en: 'General examination' });
      expect(result).toBe('[Z00] 일반검사');
    });
  });
});
