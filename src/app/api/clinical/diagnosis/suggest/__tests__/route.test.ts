/**
 * @jest-environment node
 *
 * Tests for POST /api/clinical/diagnosis/suggest
 */

import { POST } from '../route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock the diagnosis context suggest library
jest.mock('@/lib/diagnosis-context-suggest', () => ({
  suggestDiagnosisByContext: jest.fn(),
}));

import { NextResponse } from 'next/server';
import { suggestDiagnosisByContext } from '@/lib/diagnosis-context-suggest';

describe('Diagnosis Suggest API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/clinical/diagnosis/suggest', () => {
    it('should return empty groups when all fields are empty', async () => {
      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '', pe: '', testOrder: '', testResult: '' }),
      });

      await POST(request);
      expect(NextResponse.json).toHaveBeenCalledWith({
        symptomBased: [],
        peBased: [],
        testBased: [],
      });
    });

    it('should return empty groups when all fields are whitespace-only', async () => {
      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '   ', pe: '  ', testOrder: ' ', testResult: '  ' }),
      });

      await POST(request);
      expect(NextResponse.json).toHaveBeenCalledWith({
        symptomBased: [],
        peBased: [],
        testBased: [],
      });
    });

    it('should return empty groups when body has no recognized fields', async () => {
      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);
      expect(NextResponse.json).toHaveBeenCalledWith({
        symptomBased: [],
        peBased: [],
        testBased: [],
      });
    });

    it('should call suggestDiagnosisByContext with provided fields', async () => {
      const mockSuggestions = {
        symptomBased: [{ code: 'M54.5', name: '요통', score: 0.9 }],
        peBased: [],
        testBased: [],
      };
      (suggestDiagnosisByContext as jest.Mock).mockReturnValue(mockSuggestions);

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '허리 통증', pe: '', testOrder: '', testResult: '' }),
      });

      await POST(request);

      expect(suggestDiagnosisByContext).toHaveBeenCalledWith({
        cc: '허리 통증',
        pe: '',
        testOrder: '',
        testResult: '',
      });
      expect(NextResponse.json).toHaveBeenCalledWith(mockSuggestions);
    });

    it('should pass all context fields to the suggest function', async () => {
      const mockSuggestions = {
        symptomBased: [{ code: 'M17.0', name: '무릎 관절증', score: 0.8 }],
        peBased: [{ code: 'M17.1', name: '일차성 무릎관절증', score: 0.7 }],
        testBased: [{ code: 'M17.9', name: '무릎 관절증 상세불명', score: 0.6 }],
      };
      (suggestDiagnosisByContext as jest.Mock).mockReturnValue(mockSuggestions);

      const body = {
        cc: '무릎 통증',
        pe: '무릎 부종',
        testOrder: 'X-ray',
        testResult: 'degenerative changes',
      };

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      await POST(request);

      expect(suggestDiagnosisByContext).toHaveBeenCalledWith(body);
    });

    it('should return results from suggestDiagnosisByContext', async () => {
      const mockResults = {
        symptomBased: [
          { code: 'M54.5', name: '요통', score: 0.95 },
          { code: 'M54.4', name: '요통과 좌골신경통', score: 0.85 },
        ],
        peBased: [],
        testBased: [],
      };
      (suggestDiagnosisByContext as jest.Mock).mockReturnValue(mockResults);

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '허리가 아파요' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.symptomBased).toHaveLength(2);
      expect(data.symptomBased[0].code).toBe('M54.5');
    });

    it('should handle errors and return 500 status', async () => {
      (suggestDiagnosisByContext as jest.Mock).mockImplementation(() => {
        throw new Error('Suggestion engine failure');
      });

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '두통' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to suggest' },
        { status: 500 }
      );
    });

    it('should only call suggestDiagnosisByContext when at least one field has content', async () => {
      // Only cc has content
      (suggestDiagnosisByContext as jest.Mock).mockReturnValue({
        symptomBased: [],
        peBased: [],
        testBased: [],
      });

      const request = new Request('http://localhost:3000/api/clinical/diagnosis/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc: '발목 통증', pe: '', testOrder: '', testResult: '' }),
      });

      await POST(request);
      expect(suggestDiagnosisByContext).toHaveBeenCalled();
    });
  });
});
