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

// Mock kcd-search-v2
jest.mock('@/lib/kcd-search-v2', () => ({
  searchDiagnosisV2: jest.fn(),
}));

import { searchDiagnosisV2 } from '@/lib/kcd-search-v2';

describe('Diagnosis Search API', () => {
  describe('GET /api/clinical/diagnosis/search', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

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

    it('should call searchDiagnosisV2 with query', async () => {
      const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=test');
      (searchDiagnosisV2 as jest.Mock).mockReturnValue([]);

      await GET(request);

      expect(searchDiagnosisV2).toHaveBeenCalledWith('test');
    });

    it('should return results from searchDiagnosisV2', async () => {
      const mockResults = [
        { code: 'M17.0', ko: '무릎의 일차성 관절증', en: 'Primary gonarthrosis', category: 'Orthopedics' }
      ];
      (searchDiagnosisV2 as jest.Mock).mockReturnValue(mockResults);

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=M17');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toEqual(mockResults);
    });

    it('should handle errors gracefully', async () => {
      (searchDiagnosisV2 as jest.Mock).mockImplementation(() => {
        throw new Error('Search failed');
      });

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=error');
      const response = await GET(request);

      // Since we are mocking NextResponse, we need to check how the error response is constructed in route.ts
      // In route.ts: return NextResponse.json({ error: "Failed to search" }, { status: 500 });
      // The mock returns the object passed to json() + status property.

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Failed to search" }, { status: 500 });
    });

    it('should include category in response', async () => {
      const mockResults = [
        { code: 'M54.5', ko: '요통', en: 'Low back pain', category: 'Orthopedics' }
      ];
      (searchDiagnosisV2 as jest.Mock).mockReturnValue(mockResults);

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/search?q=요통');
      const response = await GET(request);
      const data = await response.json();

      expect(data[0]).toHaveProperty('category');
      expect(data[0].category).toBe('Orthopedics');
    });
  });
});
