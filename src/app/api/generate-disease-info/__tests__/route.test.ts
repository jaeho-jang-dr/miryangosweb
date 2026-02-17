/**
 * @jest-environment node
 *
 * Tests for POST /api/generate-disease-info
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

// Mock Google Generative AI
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}));

import { NextResponse } from 'next/server';

// Helper to save and restore env vars
const originalEnv = process.env;

describe('Generate Disease Info API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST /api/generate-disease-info', () => {
    it('should return 500 when GEMINI_API_KEY is not configured', async () => {
      process.env.GEMINI_API_KEY = '';

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '당뇨병' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    });

    it('should return 400 when diseaseName is missing', async () => {
      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Disease name is missing' },
        { status: 400 }
      );
    });

    it('should return 400 when diseaseName is empty string', async () => {
      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Disease name is missing' },
        { status: 400 }
      );
    });

    it('should successfully generate disease info with valid response', async () => {
      const mockAIResponse = {
        knowledge: '<p>당뇨병에 대한 설명</p>',
        treatment: '<p>당뇨병 치료법</p>',
        guidelines: '<p>당뇨병 주의사항</p>',
        summary: '당뇨병 요약',
        prompts: [
          'Diabetes cartoon illustration',
          'Blood sugar monitoring cartoon',
          'Healthy eating for diabetes',
          'Exercise for diabetes management',
        ],
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockAIResponse),
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '당뇨병' }),
      });

      await POST(request);

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.diseaseInfo).toBeDefined();
      expect(callArgs.diseaseInfo.knowledge).toBe('<p>당뇨병에 대한 설명</p>');
      expect(callArgs.diseaseInfo.treatment).toBe('<p>당뇨병 치료법</p>');
      expect(callArgs.diseaseInfo.dosAndDonts).toBe('<p>당뇨병 주의사항</p>');
      expect(callArgs.markdownContent).toBe('당뇨병 요약');
      expect(callArgs.cartoonImageUrls).toBeDefined();
      expect(callArgs.cartoonImageUrls).toHaveLength(4);
    });

    it('should generate image URLs from prompts', async () => {
      const mockAIResponse = {
        knowledge: 'test',
        treatment: 'test',
        guidelines: 'test',
        summary: 'test',
        prompts: ['A cute cartoon doctor'],
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockAIResponse),
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: 'test disease' }),
      });

      await POST(request);

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.cartoonImageUrls[0]).toContain('image.pollinations.ai');
      expect(callArgs.cartoonImageUrls[0]).toContain('cartoon');
    });

    it('should handle AI response wrapped in markdown code blocks', async () => {
      const mockAIResponse = {
        knowledge: 'info',
        treatment: 'treatment',
        guidelines: 'guidelines',
        summary: 'summary',
        prompts: ['prompt1'],
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '```json\n' + JSON.stringify(mockAIResponse) + '\n```',
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '고혈압' }),
      });

      await POST(request);

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.diseaseInfo).toBeDefined();
      expect(callArgs.diseaseInfo.knowledge).toBe('info');
    });

    it('should use defaults when AI response is missing fields', async () => {
      const partialResponse = {
        knowledge: 'partial knowledge',
        // treatment, guidelines, summary, prompts are missing
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(partialResponse),
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '감기' }),
      });

      await POST(request);

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.diseaseInfo.knowledge).toBe('partial knowledge');
      expect(callArgs.diseaseInfo.treatment).toBe('내용 없음');
      expect(callArgs.diseaseInfo.dosAndDonts).toBe('내용 없음');
      expect(callArgs.markdownContent).toBe('요약 없음');
      expect(callArgs.cartoonImageUrls).toEqual([]);
    });

    it('should return 500 when AI response is not valid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This is not JSON at all, no braces anywhere',
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '두통' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server Error',
          message: expect.any(String),
        }),
        { status: 500 }
      );
    });

    it('should return 500 when AI response has invalid JSON content', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{ invalid json content }',
        },
      });

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '두통' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server Error',
        }),
        { status: 500 }
      );
    });

    it('should return 500 when AI API call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const request = new Request('http://localhost:3000/api/generate-disease-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: '골절' }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server Error',
          message: 'API quota exceeded',
        }),
        { status: 500 }
      );
    });
  });
});
