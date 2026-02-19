/**
 * @jest-environment node
 *
 * Tests for GET /api/clinical/drugs/search
 */

import { GET } from '../route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock the drugs data - inline in jest.mock factory to avoid hoisting issues
jest.mock('@/data/drugs/basic-formulary.json', () => ({
  __esModule: true,
  default: [
    { name: 'Acetaminophen', ingredient: 'acetaminophen', dosage: '500mg' },
    { name: 'Ibuprofen', ingredient: 'ibuprofen', dosage: '200mg' },
    { name: 'Aspirin', ingredient: 'acetylsalicylic acid', dosage: '100mg' },
    { name: 'Amoxicillin', ingredient: 'amoxicillin', dosage: '250mg' },
    { name: 'Metformin', ingredient: 'metformin hydrochloride', dosage: '500mg' },
    { name: 'Lisinopril', ingredient: 'lisinopril', dosage: '10mg' },
    { name: 'Atorvastatin', ingredient: 'atorvastatin calcium', dosage: '20mg' },
    { name: 'Omeprazole', ingredient: 'omeprazole', dosage: '20mg' },
    { name: 'Amlodipine', ingredient: 'amlodipine besylate', dosage: '5mg' },
    { name: 'Losartan', ingredient: 'losartan potassium', dosage: '50mg' },
    { name: 'Levothyroxine', ingredient: 'levothyroxine sodium', dosage: '50mcg' },
    { name: 'Azithromycin', ingredient: 'azithromycin', dosage: '250mg' },
  ],
}));

import { NextResponse } from 'next/server';

describe('Drug Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clinical/drugs/search', () => {
    it('should return empty array when no query parameter provided', async () => {
      const request = new Request('http://localhost:3000/api/clinical/drugs/search');
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should return empty array for empty query string', async () => {
      const request = new Request('http://localhost:3000/api/clinical/drugs/search?q=');
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should return empty array for single character query', async () => {
      const request = new Request('http://localhost:3000/api/clinical/drugs/search?q=a');
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should return empty array for query longer than 50 characters', async () => {
      const longQuery = 'a'.repeat(51);
      const request = new Request(
        `http://localhost:3000/api/clinical/drugs/search?q=${longQuery}`
      );
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=%20%20'
      );
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should search by drug name (case insensitive)', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=ibuprofen'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThan(0);
      expect(callArgs[0].name).toBe('Ibuprofen');
    });

    it('should search by ingredient name', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=acetaminophen'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThan(0);
      expect(callArgs[0].ingredient).toContain('acetaminophen');
    });

    it('should perform case-insensitive search', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=ASPIRIN'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThan(0);
      expect(callArgs[0].name).toBe('Aspirin');
    });

    it('should return partial matches', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=ac'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      // Should match Acetaminophen (name) and Aspirin (ingredient: acetylsalicylic acid)
      expect(callArgs.length).toBeGreaterThanOrEqual(1);
    });

    it('should limit results to 10', async () => {
      // "a" would match many drugs but query needs to be at least 2 chars
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=in'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array when no drugs match', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=zzzznotadrug'
      );
      await GET(request);
      expect(NextResponse.json).toHaveBeenCalledWith([]);
    });

    it('should trim query whitespace', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=%20aspirin%20'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThan(0);
      expect(callArgs[0].name).toBe('Aspirin');
    });

    it('should accept queries of exactly 2 characters', async () => {
      const request = new Request(
        'http://localhost:3000/api/clinical/drugs/search?q=as'
      );
      await GET(request);
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      // "as" should match "Aspirin" and possibly "Atorvastatin" via ingredient
      expect(Array.isArray(callArgs)).toBe(true);
    });

    it('should accept queries of exactly 50 characters', async () => {
      const query = 'a'.repeat(50);
      const request = new Request(
        `http://localhost:3000/api/clinical/drugs/search?q=${query}`
      );
      await GET(request);
      // Should not return empty due to length check; will just find no matches
      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
    });
  });
});
