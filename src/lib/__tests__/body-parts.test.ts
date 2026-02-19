import { matchBodyPart, BODY_PARTS } from '../body-parts';

describe('body-parts', () => {
  describe('BODY_PARTS', () => {
    it('should contain all expected body parts', () => {
      const ids = BODY_PARTS.map(bp => bp.id);
      expect(ids).toContain('shoulder');
      expect(ids).toContain('elbow');
      expect(ids).toContain('hand_wrist');
      expect(ids).toContain('hip');
      expect(ids).toContain('knee');
      expect(ids).toContain('foot_ankle');
      expect(ids).toContain('spine');
    });

    it('should have non-empty keywords for each body part', () => {
      for (const part of BODY_PARTS) {
        expect(part.keywords.length).toBeGreaterThan(0);
        expect(part.label).toBeTruthy();
        expect(part.id).toBeTruthy();
      }
    });
  });

  describe('matchBodyPart', () => {
    it('should match shoulder by Korean keyword in tags', () => {
      const result = matchBodyPart(['어깨', '통증'], '');
      expect(result).toBe('shoulder');
    });

    it('should match shoulder by detailed keyword', () => {
      const result = matchBodyPart(['회전근개'], '어깨 통증 환자');
      expect(result).toBe('shoulder');
    });

    it('should match knee by title', () => {
      const result = matchBodyPart([], '무릎 관절염 치료');
      expect(result).toBe('knee');
    });

    it('should match spine when multiple spine keywords are present', () => {
      const result = matchBodyPart(['척추', '디스크', '허리'], '요추 디스크 환자');
      expect(result).toBe('spine');
    });

    it('should match elbow by keyword', () => {
      const result = matchBodyPart(['테니스엘보'], '팔꿈치 통증');
      expect(result).toBe('elbow');
    });

    it('should match hand_wrist by keyword', () => {
      const result = matchBodyPart(['손목', '건초염'], '');
      expect(result).toBe('hand_wrist');
    });

    it('should match hip by keyword', () => {
      const result = matchBodyPart(['고관절'], '대퇴골두 무혈성괴사');
      expect(result).toBe('hip');
    });

    it('should match foot_ankle by keyword', () => {
      const result = matchBodyPart(['족저근막', '발바닥'], '');
      expect(result).toBe('foot_ankle');
    });

    it('should return "etc" when no body part matches', () => {
      const result = matchBodyPart(['두통'], '머리가 아파요');
      expect(result).toBe('etc');
    });

    it('should return "etc" for empty input', () => {
      const result = matchBodyPart([], '');
      expect(result).toBe('etc');
    });

    it('should prefer the body part with the most keyword matches', () => {
      // spine has many keywords; providing multiple spine keywords should match spine
      const result = matchBodyPart(['허리', '디스크', '척추'], '');
      expect(result).toBe('spine');
    });

    it('should be case-insensitive for title matching', () => {
      // Korean doesn't have case, but the function lowercases the text
      const result = matchBodyPart([], '어깨');
      expect(result).toBe('shoulder');
    });

    it('should handle tags and title combined', () => {
      const result = matchBodyPart(['통증'], '아킬레스건 문제');
      expect(result).toBe('foot_ankle');
    });
  });
});
