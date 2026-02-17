import { toFhirStatus, toClinicalStatus } from '../fhir/status-maps';
import type { ClinicalStatus } from '@/types/clinical';
import type { FhirEncounterStatus } from '@/types/fhir';

describe('fhir/status-maps', () => {
  describe('toFhirStatus', () => {
    const cases: [ClinicalStatus, FhirEncounterStatus][] = [
      ['reception', 'arrived'],
      ['consulting', 'in-progress'],
      ['testing', 'in-progress'],
      ['treatment', 'in-progress'],
      ['completed', 'finished'],
      ['paid', 'finished'],
    ];

    it.each(cases)(
      'should map clinical status "%s" to FHIR status "%s"',
      (clinical, expected) => {
        expect(toFhirStatus(clinical)).toBe(expected);
      },
    );

    it('should return "unknown" for unmapped clinical status', () => {
      const result = toFhirStatus('nonexistent' as ClinicalStatus);
      expect(result).toBe('unknown');
    });
  });

  describe('toClinicalStatus', () => {
    const cases: [FhirEncounterStatus, ClinicalStatus][] = [
      ['planned', 'reception'],
      ['arrived', 'reception'],
      ['triaged', 'reception'],
      ['in-progress', 'consulting'],
      ['onleave', 'consulting'],
      ['finished', 'completed'],
      ['cancelled', 'completed'],
      ['entered-in-error', 'completed'],
      ['unknown', 'reception'],
    ];

    it.each(cases)(
      'should map FHIR status "%s" to clinical status "%s"',
      (fhir, expected) => {
        expect(toClinicalStatus(fhir)).toBe(expected);
      },
    );

    it('should return "reception" for unmapped FHIR status', () => {
      const result = toClinicalStatus('nonexistent' as FhirEncounterStatus);
      expect(result).toBe('reception');
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain meaningful clinical statuses through conversion', () => {
      // reception -> arrived -> reception
      expect(toClinicalStatus(toFhirStatus('reception'))).toBe('reception');
      // completed -> finished -> completed
      expect(toClinicalStatus(toFhirStatus('completed'))).toBe('completed');
      // paid -> finished -> completed (not paid, because FHIR has no "paid")
      expect(toClinicalStatus(toFhirStatus('paid'))).toBe('completed');
    });
  });
});
