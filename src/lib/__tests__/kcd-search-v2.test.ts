/**
 * @jest-environment node
 */

import { searchDiagnosisV2, KCDCode } from '../kcd-search-v2';

describe('KCD Search V2', () => {
  describe('searchDiagnosisV2 - Basic Functionality', () => {
    it('should return empty array for empty query', () => {
      const results = searchDiagnosisV2('');
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace query', () => {
      const results = searchDiagnosisV2('   ');
      expect(results).toEqual([]);
    });

    it('should handle null or undefined gracefully', () => {
      // @ts-expect-error - testing runtime behavior
      expect(searchDiagnosisV2(null)).toEqual([]);
      // @ts-expect-error - testing runtime behavior
      expect(searchDiagnosisV2(undefined)).toEqual([]);
    });

    it('should limit results to 20 items', () => {
      // Search for common term likely to have many results
      const results = searchDiagnosisV2('염증');
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should return results as array of KCDCode objects', () => {
      const results = searchDiagnosisV2('M17');
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('code');
        expect(results[0]).toHaveProperty('ko');
        expect(results[0]).toHaveProperty('en');
      }
    });
  });

  describe('searchDiagnosisV2 - Code Matching', () => {
    it('should return exact code match as first result', () => {
      const results = searchDiagnosisV2('M17.0');
      expect(results.length).toBeGreaterThan(0);

      const exactMatch = results.find(r => r.code.toLowerCase() === 'm17.0');
      expect(exactMatch).toBeDefined();
      // Exact match should be the only result when exact code is found
      if (exactMatch) {
        expect(results[0].code).toBe(exactMatch.code);
      }
    });

    it('should find codes by partial match', () => {
      const results = searchDiagnosisV2('M17');
      expect(results.length).toBeGreaterThan(0);

      // All results should contain M17 in their code
      results.forEach(result => {
        expect(result.code.toLowerCase()).toContain('m17');
      });
    });

    it('should be case-insensitive for code search', () => {
      const lowerResults = searchDiagnosisV2('m17');
      const upperResults = searchDiagnosisV2('M17');

      expect(lowerResults.length).toEqual(upperResults.length);
      expect(lowerResults[0]?.code).toEqual(upperResults[0]?.code);
    });
  });

  describe('searchDiagnosisV2 - Korean Name Matching', () => {
    it('should find diseases by Korean name', () => {
      const results = searchDiagnosisV2('무릎');
      expect(results.length).toBeGreaterThan(0);

      // At least one result should contain the Korean term
      const hasMatch = results.some(r => r.ko.includes('무릎'));
      expect(hasMatch).toBe(true);
    });

    it('should handle Korean substring matching', () => {
      const results = searchDiagnosisV2('관절');
      expect(results.length).toBeGreaterThan(0);

      results.forEach(result => {
        expect(result.ko).toContain('관절');
      });
    });

    it('should be case-sensitive for Korean (natural behavior)', () => {
      const results = searchDiagnosisV2('관절염');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchDiagnosisV2 - English Name Matching', () => {
    it('should find diseases by English name', () => {
      const results = searchDiagnosisV2('knee');
      expect(results.length).toBeGreaterThan(0);

      const hasMatch = results.some(r =>
        r.en && r.en.toLowerCase().includes('knee')
      );
      expect(hasMatch).toBe(true);
    });

    it('should be case-insensitive for English search', () => {
      const lowerResults = searchDiagnosisV2('arthritis');
      const upperResults = searchDiagnosisV2('ARTHRITIS');

      expect(lowerResults.length).toEqual(upperResults.length);
    });
  });

  describe('searchDiagnosisV2 - Keyword/Symptom Matching', () => {
    it('should find diseases by symptoms in Top 50 data', () => {
      // This depends on the Top 50 data having symptom keywords
      // Testing generic behavior
      const results = searchDiagnosisV2('통증');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should match keywords when provided', () => {
      const results = searchDiagnosisV2('발열');
      expect(results.length).toBeGreaterThan(0);

      // Results should include items with matching keywords or names
      const hasMatch = results.some(r =>
        r.ko.includes('발열') ||
        (r.keywords && r.keywords.some(k => k.includes('발열')))
      );
      expect(hasMatch).toBe(true);
    });
  });

  describe('searchDiagnosisV2 - Index Building', () => {
    it('should build index only once', () => {
      // First search builds index
      const start1 = Date.now();
      searchDiagnosisV2('M17');
      const time1 = Date.now() - start1;

      // Second search should be faster (index already built)
      const start2 = Date.now();
      searchDiagnosisV2('M17');
      const time2 = Date.now() - start2;

      // Second search should generally be faster
      // Note: This is a heuristic test and may be flaky
      // Main goal is to verify no errors on repeated calls
      expect(time2).toBeLessThanOrEqual(time1 + 10);
    });

    it('should handle multiple concurrent searches', () => {
      const queries = ['M17', 'knee', '관절', 'arthritis'];
      const results = queries.map(q => searchDiagnosisV2(q));

      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('searchDiagnosisV2 - Data Integration', () => {
    it('should include Orthopedics category for M codes', () => {
      const results = searchDiagnosisV2('M17');
      expect(results.length).toBeGreaterThan(0);

      const orthoItem = results.find(r => r.category === 'Orthopedics');
      expect(orthoItem).toBeDefined();
    });

    it('should merge Top 50 and Ortho data correctly', () => {
      // Search for a code that might exist in both datasets
      const results = searchDiagnosisV2('M');
      expect(results.length).toBeGreaterThan(0);

      // Verify data structure integrity
      results.forEach(result => {
        expect(result.code).toBeTruthy();
        expect(result.ko).toBeTruthy();
        // en might be empty for Top 50 items
      });
    });
  });

  describe('searchDiagnosisV2 - Edge Cases', () => {
    it('should handle special characters in query', () => {
      expect(() => searchDiagnosisV2('M17.0-1')).not.toThrow();
      expect(() => searchDiagnosisV2('관절염 (무릎)')).not.toThrow();
    });

    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(1000);
      const results = searchDiagnosisV2(longQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle queries with leading/trailing spaces', () => {
      const results1 = searchDiagnosisV2('  M17  ');
      const results2 = searchDiagnosisV2('M17');

      expect(results1.length).toEqual(results2.length);
    });

    it('should return consistent results for same query', () => {
      const query = 'M17';
      const results1 = searchDiagnosisV2(query);
      const results2 = searchDiagnosisV2(query);

      expect(results1.length).toEqual(results2.length);
      expect(results1[0]?.code).toEqual(results2[0]?.code);
    });
  });

  describe('searchDiagnosisV2 - Performance', () => {
    it('should complete search within reasonable time', () => {
      const start = Date.now();
      searchDiagnosisV2('M17');
      const duration = Date.now() - start;

      // Should complete within 100ms for typical searches
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid successive searches', () => {
      const queries = Array(10).fill('M17');

      expect(() => {
        queries.forEach(q => searchDiagnosisV2(q));
      }).not.toThrow();
    });
  });
});
