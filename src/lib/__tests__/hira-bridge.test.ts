/**
 * Tests for fhir/hira-bridge.ts — extractMedicationsFromRequests function
 *
 * Only testing pure functions that do not require external API calls.
 * The async functions (validatePrescriptionDur, lookupMedicationAsFhir,
 * searchPharmacyOrganizations) are service-layer functions that call
 * external HIRA APIs and are better tested as integration tests.
 */

jest.mock('@/lib/hira/emr-integration', () => ({
  performBatchDurCheck: jest.fn(),
  lookupDrugForEmr: jest.fn(),
  findNearbyPharmacies: jest.fn(),
}));

jest.mock('../fhir/converters/hira-bridge-converter', () => ({
  durResultToOperationOutcome: jest.fn(),
  drugLookupToMedication: jest.fn(),
  pharmacyToOrganization: jest.fn(),
  extractBusinessHours: jest.fn(() => []),
}));

jest.mock('../fhir/bundle-builder', () => ({
  buildSearchsetBundle: jest.fn(() => ({
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [],
  })),
}));

import { extractMedicationsFromRequests } from '../fhir/hira-bridge';
import type { FhirMedicationRequest } from '@/types/fhir';

describe('fhir/hira-bridge', () => {
  describe('extractMedicationsFromRequests', () => {
    it('should extract medication name from medicationCodeableConcept.text', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: { text: '아세트아미노펜' },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('아세트아미노펜');
    });

    it('should extract name from coding display when text is missing', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: {
            coding: [{ display: '이부프로펜', code: 'ING002' }],
          },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('이부프로펜');
      expect(result[0].code).toBe('ING002');
    });

    it('should extract name from coding code when display is also missing', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: {
            coding: [{ code: 'ING003' }],
          },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ING003');
    });

    it('should skip requests without medicationCodeableConcept', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple requests', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: { text: '아세트아미노펜' },
        },
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: { text: '이부프로펜' },
        },
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          // no medicationCodeableConcept — should be skipped
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(2);
    });

    it('should include code when it differs from name', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: {
            text: '록소프로펜',
            coding: [{ code: 'ING_LOXO', display: '록소프로펜' }],
          },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('록소프로펜');
      expect(result[0].code).toBe('ING_LOXO');
    });

    it('should not include code when it equals name', () => {
      const requests: FhirMedicationRequest[] = [
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: 'Patient/1' },
          medicationCodeableConcept: {
            coding: [{ code: '록소프로펜' }],
          },
        },
      ];
      const result = extractMedicationsFromRequests(requests);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('록소프로펜');
      expect(result[0].code).toBeUndefined();
    });

    it('should return empty array for empty input', () => {
      const result = extractMedicationsFromRequests([]);
      expect(result).toEqual([]);
    });
  });
});
