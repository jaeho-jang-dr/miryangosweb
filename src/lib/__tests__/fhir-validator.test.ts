import { validateResource } from '../fhir/validator';
import type {
  FhirPatient,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirResource,
} from '@/types/fhir';

describe('fhir/validator', () => {
  describe('validateResource - general', () => {
    it('should fail when resourceType is missing', () => {
      const resource = {} as FhirResource;
      const result = validateResource(resource);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing resourceType');
    });

    it('should pass for unknown resource types with no specific validation', () => {
      const resource: FhirResource = { resourceType: 'Practitioner' };
      const result = validateResource(resource);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateResource - Patient', () => {
    it('should pass for patient with name', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: '홍길동' }],
        gender: 'male',
        birthDate: '1990-01-01',
      };
      const result = validateResource(patient);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for patient with identifier but no name', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        identifier: [{ value: 'P001' }],
      };
      const result = validateResource(patient);
      expect(result.valid).toBe(true);
    });

    it('should fail for patient without name and without identifier', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
      };
      const result = validateResource(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient must have at least one name or identifier');
    });

    it('should warn when gender is missing', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: '홍길동' }],
      };
      const result = validateResource(patient);
      expect(result.warnings).toContain('Patient.gender is recommended');
    });

    it('should warn when birthDate is missing', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: '홍길동' }],
        gender: 'male',
      };
      const result = validateResource(patient);
      expect(result.warnings).toContain('Patient.birthDate is recommended');
    });

    it('should not warn when gender and birthDate are present', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: '홍길동' }],
        gender: 'male',
        birthDate: '1990-01-01',
      };
      const result = validateResource(patient);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail for patient with empty name array and empty identifier array', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [],
        identifier: [],
      };
      const result = validateResource(patient);
      expect(result.valid).toBe(false);
    });

    it('should pass for patient with given name', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        name: [{ given: ['길동'], family: '홍' }],
        gender: 'male',
        birthDate: '1990-01-01',
      };
      const result = validateResource(patient);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateResource - Encounter', () => {
    it('should pass for valid encounter', () => {
      const encounter: FhirEncounter = {
        resourceType: 'Encounter',
        status: 'in-progress',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/123' },
        period: { start: '2025-01-01' },
      };
      const result = validateResource(encounter);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when encounter status is missing', () => {
      const encounter = {
        resourceType: 'Encounter',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/123' },
      } as FhirEncounter;
      const result = validateResource(encounter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Encounter.status is required');
    });

    it('should fail when encounter class is missing', () => {
      const encounter = {
        resourceType: 'Encounter',
        status: 'in-progress',
        subject: { reference: 'Patient/123' },
      } as FhirEncounter;
      const result = validateResource(encounter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Encounter.class is required');
    });

    it('should fail when encounter subject is missing', () => {
      const encounter = {
        resourceType: 'Encounter',
        status: 'in-progress',
        class: { code: 'AMB' },
      } as FhirEncounter;
      const result = validateResource(encounter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Encounter.subject is required');
    });

    it('should warn when encounter period.start is missing', () => {
      const encounter: FhirEncounter = {
        resourceType: 'Encounter',
        status: 'finished',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/123' },
      };
      const result = validateResource(encounter);
      expect(result.warnings).toContain('Encounter.period.start is recommended');
    });
  });

  describe('validateResource - Condition', () => {
    it('should pass for valid condition', () => {
      const condition: FhirCondition = {
        resourceType: 'Condition',
        subject: { reference: 'Patient/123' },
        code: { coding: [{ code: 'M75.1', display: '회전근개 증후군' }] },
        clinicalStatus: { coding: [{ code: 'active' }] },
      };
      const result = validateResource(condition);
      expect(result.valid).toBe(true);
    });

    it('should fail when condition subject is missing', () => {
      const condition = {
        resourceType: 'Condition',
        code: { text: 'Rotator cuff syndrome' },
      } as FhirCondition;
      const result = validateResource(condition);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Condition.subject is required');
    });

    it('should fail when condition code is missing', () => {
      const condition = {
        resourceType: 'Condition',
        subject: { reference: 'Patient/123' },
        code: { coding: [] },
      } as FhirCondition;
      const result = validateResource(condition);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Condition.code is required');
    });

    it('should pass when condition code has text but no coding', () => {
      const condition: FhirCondition = {
        resourceType: 'Condition',
        subject: { reference: 'Patient/123' },
        code: { text: '요통' },
      };
      const result = validateResource(condition);
      expect(result.valid).toBe(true);
    });

    it('should warn when clinicalStatus is missing', () => {
      const condition: FhirCondition = {
        resourceType: 'Condition',
        subject: { reference: 'Patient/123' },
        code: { text: '요통' },
      };
      const result = validateResource(condition);
      expect(result.warnings).toContain('Condition.clinicalStatus is recommended');
    });
  });

  describe('validateResource - Observation', () => {
    it('should pass for valid observation', () => {
      const observation: FhirObservation = {
        resourceType: 'Observation',
        status: 'final',
        code: { coding: [{ code: 'chief-complaint' }] },
        subject: { reference: 'Patient/123' },
      };
      const result = validateResource(observation);
      expect(result.valid).toBe(true);
    });

    it('should fail when observation status is missing', () => {
      const observation = {
        resourceType: 'Observation',
        code: { text: 'test' },
      } as FhirObservation;
      const result = validateResource(observation);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Observation.status is required');
    });

    it('should fail when observation code is missing', () => {
      const observation = {
        resourceType: 'Observation',
        status: 'final',
        code: {},
      } as FhirObservation;
      const result = validateResource(observation);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Observation.code is required');
    });

    it('should warn when observation subject is missing', () => {
      const observation: FhirObservation = {
        resourceType: 'Observation',
        status: 'final',
        code: { text: 'test' },
      };
      const result = validateResource(observation);
      expect(result.warnings).toContain('Observation.subject is recommended');
    });
  });

  describe('validateResource - MedicationRequest', () => {
    it('should pass for valid medication request', () => {
      const mr: FhirMedicationRequest = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        subject: { reference: 'Patient/123' },
      };
      const result = validateResource(mr);
      expect(result.valid).toBe(true);
    });

    it('should fail when status is missing', () => {
      const mr = {
        resourceType: 'MedicationRequest',
        intent: 'order',
        subject: { reference: 'Patient/123' },
      } as FhirMedicationRequest;
      const result = validateResource(mr);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MedicationRequest.status is required');
    });

    it('should fail when intent is missing', () => {
      const mr = {
        resourceType: 'MedicationRequest',
        status: 'active',
        subject: { reference: 'Patient/123' },
      } as FhirMedicationRequest;
      const result = validateResource(mr);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MedicationRequest.intent is required');
    });

    it('should fail when subject is missing', () => {
      const mr = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
      } as FhirMedicationRequest;
      const result = validateResource(mr);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MedicationRequest.subject is required');
    });

    it('should report multiple errors at once', () => {
      const mr = {
        resourceType: 'MedicationRequest',
      } as FhirMedicationRequest;
      const result = validateResource(mr);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
