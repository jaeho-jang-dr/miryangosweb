/**
 * Tests for medical/xray-recommender.ts
 *
 * Tests the rule-based recommendation logic.
 * The AI fallback is mocked since it depends on external API.
 */

jest.mock('../medical/ai-client', () => ({
  generateMedicalAnalysis: jest.fn(),
}));

import { recommendXray } from '../medical/xray-recommender';
import { generateMedicalAnalysis } from '../medical/ai-client';

const mockedAI = generateMedicalAnalysis as jest.MockedFunction<typeof generateMedicalAnalysis>;

describe('medical/xray-recommender', () => {
  beforeEach(() => {
    mockedAI.mockReset();
  });

  describe('recommendXray - rule-based matching', () => {
    it('should recommend knee X-ray views for knee location', async () => {
      const result = await recommendXray('통증', '무릎');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('무릎');
      expect(result[0].views).toContain('Knee AP');
      expect(result[0].views).toContain('Knee Lateral');
      expect(result[0].confidence).toBe(0.9);
    });

    it('should recommend shoulder X-ray views for shoulder location', async () => {
      const result = await recommendXray('통증', '어깨');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('어깨');
      expect(result[0].views).toContain('Shoulder AP');
      expect(result[0].views).toContain('Scapular Y view');
    });

    it('should recommend lumbar X-ray views for lower back', async () => {
      const result = await recommendXray('통증', '허리');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('허리');
      expect(result[0].views).toContain('L-spine AP');
      expect(result[0].views).toContain('L-spine Lateral');
    });

    it('should recommend cervical X-ray views for neck', async () => {
      const result = await recommendXray('통증', '목');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('목');
      expect(result[0].views).toContain('C-spine AP');
      expect(result[0].views).toContain('C-spine Lateral');
      expect(result[0].views).toContain('C-spine Open mouth');
    });

    it('should recommend ankle X-ray views for ankle', async () => {
      const result = await recommendXray('통증', '발목');
      expect(result.length).toBeGreaterThan(0);
      // "발목" contains "목" so both neck and ankle protocols may match
      const ankleRec = result.find(r => r.bodyPart === '발목');
      expect(ankleRec).toBeDefined();
      expect(ankleRec!.views).toContain('Ankle AP');
      expect(ankleRec!.views).toContain('Ankle Mortise');
    });

    it('should match by symptoms as well as location', async () => {
      const result = await recommendXray('무릎이 아프다', '하지');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('무릎');
    });

    it('should return multiple body parts when multiple are mentioned', async () => {
      const result = await recommendXray('무릎과 어깨가 아파요', '');
      expect(result.length).toBeGreaterThanOrEqual(2);
      const bodyParts = result.map(r => r.bodyPart);
      expect(bodyParts).toContain('무릎');
      expect(bodyParts).toContain('어깨');
    });

    it('should include reason in recommendations', async () => {
      const result = await recommendXray('통증', '무릎');
      expect(result[0].reason).toBeTruthy();
      expect(result[0].reason.length).toBeGreaterThan(0);
    });

    it('should have confidence 0.9 for rule-based matches', async () => {
      const result = await recommendXray('통증', '허리');
      for (const rec of result) {
        expect(rec.confidence).toBe(0.9);
      }
    });

    it('should NOT call AI when rule-based match exists', async () => {
      await recommendXray('통증', '무릎');
      expect(mockedAI).not.toHaveBeenCalled();
    });
  });

  describe('recommendXray - AI fallback', () => {
    it('should call AI when no rule-based match exists', async () => {
      mockedAI.mockResolvedValue({
        recommendations: [
          { bodyPart: 'Pelvis', views: ['Pelvis AP'], reason: 'Suspected fracture' },
        ],
      });

      // Use terms that do not match any rule-based protocol key
      const result = await recommendXray('둔부 통증', '좌측 둔부');
      expect(mockedAI).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bodyPart).toBe('Pelvis');
      expect(result[0].confidence).toBe(0.7);
    });

    it('should return empty array when AI fails', async () => {
      mockedAI.mockRejectedValue(new Error('API error'));

      const result = await recommendXray('두통', '머리');
      expect(result).toEqual([]);
    });

    it('should return empty array when AI returns no recommendations', async () => {
      mockedAI.mockResolvedValue({ recommendations: null });

      const result = await recommendXray('두통', '머리');
      expect(result).toEqual([]);
    });
  });
});
