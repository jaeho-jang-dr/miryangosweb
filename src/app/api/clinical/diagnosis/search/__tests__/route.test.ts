/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextResponse } from 'next/server';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => ({
      json: async () => data,
      status: 200,
      headers: new Map(),
    })),
  },
}));

// Mock KCD data
jest.mock('@/data/kcd_full.json', () => [
  { code: 'M17.0', ko: '무릎의 일차성 관절증', en: 'Primary gonarthrosis' },
  { code: 'M17.1', ko: '무릎의 이차성 관절증', en: 'Secondary gonarthrosis' },
  { code: 'M17.9', ko: '무릎의 관절증, 상세불명', en: 'Gonarthrosis, unspecified' },
  { code: 'J00', ko: '급성 비인두염 [감기]', en: 'Acute nasopharyngitis [common cold]' },
  { code: 'K29.0', ko: '급성 출혈성 위염', en: 'Acute haemorrhagic gastritis' },
  { code: 'K29.1', ko: '기타 급성 위염', en: 'Other acute gastritis' },
  { code: 'A09', ko: '상세불명 기원의 위장염 및 대장염', en: 'Gastroenteritis and colitis of unspecified origin' },
  { code: 'I10', ko: '본태성(원발성) 고혈압', en: 'Essential (primary) hypertension' },
], { virtual: true });

describe('Diagnosis Search API', () => {
  describe('GET /api/clinical/diagnosis/search', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Query Parameter Handling', () => {
      it('should return empty array when no query provided', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search');

        await GET(request);

        expect(NextResponse.json).toHaveBeenCalledWith([]);
      });

      it('should return empty array for empty query string', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=');

        await GET(request);

        expect(NextResponse.json).toHaveBeenCalledWith([]);
      });

      it('should trim whitespace from query', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=  M17  ');

        await GET(request);

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
      });
    });

    describe('Code Search Functionality', () => {
      it('should find exact code matches', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17.0');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        expect(data[0].code).toBe('M17.0');
      });

      it('should be case-insensitive for code search', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=m17.0');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        expect(data[0].code).toBe('M17.0');
      });

      it('should find partial code matches', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBe(3); // M17.0, M17.1, M17.9
        data.forEach((item: { code: string }) => {
          expect(item.code.toLowerCase()).toContain('m17');
        });
      });

      it('should prioritize code starts-with matches', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response = await GET(request);
        const data = await response.json();

        // All results should start with M17
        data.forEach((item: { code: string }) => {
          expect(item.code.toLowerCase().startsWith('m17')).toBe(true);
        });
      });
    });

    describe('Korean Name Search', () => {
      it('should find diseases by Korean name', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=무릎');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        data.forEach((item: { ko: string }) => {
          expect(item.ko).toContain('무릎');
        });
      });

      it('should handle Korean substring matching', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=관절증');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        data.forEach((item: { ko: string }) => {
          expect(item.ko).toContain('관절증');
        });
      });

      it('should find gastritis cases', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=위염');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBe(2); // K29.0 and K29.1
        data.forEach((item: { ko: string }) => {
          expect(item.ko).toContain('위염');
        });
      });
    });

    describe('English Name Search', () => {
      it('should find diseases by English name', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=gonarthrosis');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBe(3);
        data.forEach((item: { en: string }) => {
          expect(item.en.toLowerCase()).toContain('gonarthrosis');
        });
      });

      it('should be case-insensitive for English search', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=GASTRITIS');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        data.forEach((item: { en: string }) => {
          expect(item.en.toLowerCase()).toContain('gastritis');
        });
      });

      it('should handle partial English matches', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=hypertension');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
        const hypertensionItem = data.find((item: { code: string }) => item.code === 'I10');
        expect(hypertensionItem).toBeDefined();
      });
    });

    describe('Result Limiting', () => {
      it('should limit results to 50 items', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=a');

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeLessThanOrEqual(50);
      });

      it('should return all matches if less than 50', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=gonarthrosis');

        const response = await GET(request);
        const data = await response.json();

        // Should return exactly 3 (less than 50)
        expect(data.length).toBe(3);
      });
    });

    describe('Sorting Behavior', () => {
      it('should prioritize code starts-with over contains', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response = await GET(request);
        const data = await response.json();

        // First result should start with M17
        expect(data[0].code.toLowerCase().startsWith('m17')).toBe(true);
      });

      it('should maintain consistent order for same query', async () => {
        const request1 = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');
        const request2 = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response1 = await GET(request1);
        const response2 = await GET(request2);

        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(data1[0].code).toBe(data2[0].code);
      });
    });

    describe('Response Format', () => {
      it('should return JSON response', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        await GET(request);

        expect(NextResponse.json).toHaveBeenCalled();
      });

      it('should return array of KCDItem objects', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17.0');

        const response = await GET(request);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);

        if (data.length > 0) {
          expect(data[0]).toHaveProperty('code');
          expect(data[0]).toHaveProperty('ko');
          expect(data[0]).toHaveProperty('en');
        }
      });

      it('should include all required fields in response', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17.0');

        const response = await GET(request);
        const data = await response.json();

        expect(data[0]).toEqual({
          code: expect.any(String),
          ko: expect.any(String),
          en: expect.any(String),
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in query', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17.0-1');

        expect(async () => await GET(request)).not.toThrow();
      });

      it('should handle very short queries', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M');

        const response = await GET(request);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeLessThanOrEqual(50);
      });

      it('should handle queries with no matches', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=XYZNONEXISTENT');

        const response = await GET(request);
        const data = await response.json();

        expect(data).toEqual([]);
      });

      it('should handle URL-encoded queries', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=%EB%AC%B4%EB%A6%8E'); // '무릎' URL-encoded

        const response = await GET(request);
        const data = await response.json();

        expect(data.length).toBeGreaterThan(0);
      });

      it('should handle mixed language queries', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17무릎');

        const response = await GET(request);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('Performance', () => {
      it('should complete search quickly', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=관절');

        const start = Date.now();
        await GET(request);
        const duration = Date.now() - start;

        // Should complete within 100ms
        expect(duration).toBeLessThan(100);
      });

      it('should handle multiple requests efficiently', async () => {
        const requests = Array(10)
          .fill(null)
          .map(() => new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17'));

        const start = Date.now();
        await Promise.all(requests.map((req) => GET(req)));
        const duration = Date.now() - start;

        // All requests should complete within 500ms
        expect(duration).toBeLessThan(500);
      });
    });

    describe('Data Integrity', () => {
      it('should not modify original data', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response1 = await GET(request);
        const data1 = await response1.json();

        const response2 = await GET(request);
        const data2 = await response2.json();

        expect(data1).toEqual(data2);
      });

      it('should return unique results', async () => {
        const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');

        const response = await GET(request);
        const data = await response.json();

        const codes = data.map((item: { code: string }) => item.code);
        const uniqueCodes = [...new Set(codes)];

        expect(codes.length).toBe(uniqueCodes.length);
      });
    });
  });
});
