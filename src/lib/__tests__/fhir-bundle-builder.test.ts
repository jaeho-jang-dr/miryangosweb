import {
  buildTransactionBundle,
  buildSearchsetBundle,
  buildDocumentBundle,
  extractFromBundle,
} from '../fhir/bundle-builder';
import type { FhirResource, FhirBundle, FhirPatient, FhirEncounter } from '@/types/fhir';

describe('fhir/bundle-builder', () => {
  const mockPatient: FhirPatient = {
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ text: '홍길동' }],
  };

  const mockEncounter: FhirEncounter = {
    resourceType: 'Encounter',
    id: 'encounter-1',
    status: 'in-progress',
    class: { code: 'AMB' },
    subject: { reference: 'Patient/patient-1' },
  };

  const mockResourceWithoutId: FhirResource = {
    resourceType: 'Observation',
  };

  describe('buildTransactionBundle', () => {
    it('should create a transaction bundle with correct type', () => {
      const bundle = buildTransactionBundle([mockPatient]);
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('transaction');
    });

    it('should include a timestamp', () => {
      const bundle = buildTransactionBundle([mockPatient]);
      expect(bundle.timestamp).toBeDefined();
      expect(() => new Date(bundle.timestamp!)).not.toThrow();
    });

    it('should create PUT entries for resources with IDs', () => {
      const bundle = buildTransactionBundle([mockPatient]);
      expect(bundle.entry).toHaveLength(1);
      expect(bundle.entry![0].request?.method).toBe('PUT');
      expect(bundle.entry![0].request?.url).toBe('Patient/patient-1');
    });

    it('should create POST entries for resources without IDs', () => {
      const bundle = buildTransactionBundle([mockResourceWithoutId]);
      expect(bundle.entry![0].request?.method).toBe('POST');
      expect(bundle.entry![0].request?.url).toBe('Observation');
    });

    it('should include fullUrl for resources with IDs', () => {
      const bundle = buildTransactionBundle([mockPatient]);
      expect(bundle.entry![0].fullUrl).toBe('urn:uuid:Patient/patient-1');
    });

    it('should not include fullUrl for resources without IDs', () => {
      const bundle = buildTransactionBundle([mockResourceWithoutId]);
      expect(bundle.entry![0].fullUrl).toBeUndefined();
    });

    it('should handle multiple resources', () => {
      const bundle = buildTransactionBundle([mockPatient, mockEncounter]);
      expect(bundle.entry).toHaveLength(2);
      expect(bundle.entry![0].resource.resourceType).toBe('Patient');
      expect(bundle.entry![1].resource.resourceType).toBe('Encounter');
    });

    it('should handle empty resource array', () => {
      const bundle = buildTransactionBundle([]);
      expect(bundle.entry).toHaveLength(0);
      expect(bundle.type).toBe('transaction');
    });
  });

  describe('buildSearchsetBundle', () => {
    it('should create a searchset bundle', () => {
      const bundle = buildSearchsetBundle([mockPatient]);
      expect(bundle.type).toBe('searchset');
    });

    it('should include total as number of resources by default', () => {
      const bundle = buildSearchsetBundle([mockPatient, mockEncounter]);
      expect(bundle.total).toBe(2);
    });

    it('should use provided total over array length', () => {
      const bundle = buildSearchsetBundle([mockPatient], 10);
      expect(bundle.total).toBe(10);
    });

    it('should include fullUrl for resources with IDs', () => {
      const bundle = buildSearchsetBundle([mockPatient]);
      expect(bundle.entry![0].fullUrl).toBe('Patient/patient-1');
    });

    it('should not include request entries (unlike transaction)', () => {
      const bundle = buildSearchsetBundle([mockPatient]);
      expect(bundle.entry![0].request).toBeUndefined();
    });

    it('should handle empty resources', () => {
      const bundle = buildSearchsetBundle([]);
      expect(bundle.entry).toHaveLength(0);
      expect(bundle.total).toBe(0);
    });
  });

  describe('buildDocumentBundle', () => {
    it('should create a document bundle', () => {
      const bundle = buildDocumentBundle([mockPatient, mockEncounter]);
      expect(bundle.type).toBe('document');
    });

    it('should set total to number of resources', () => {
      const bundle = buildDocumentBundle([mockPatient, mockEncounter]);
      expect(bundle.total).toBe(2);
    });

    it('should include timestamp', () => {
      const bundle = buildDocumentBundle([mockPatient]);
      expect(bundle.timestamp).toBeDefined();
    });

    it('should include all resources as entries', () => {
      const resources: FhirResource[] = [mockPatient, mockEncounter];
      const bundle = buildDocumentBundle(resources);
      expect(bundle.entry).toHaveLength(2);
      expect(bundle.entry![0].resource).toBe(mockPatient);
      expect(bundle.entry![1].resource).toBe(mockEncounter);
    });
  });

  describe('extractFromBundle', () => {
    let bundle: FhirBundle;

    beforeEach(() => {
      bundle = buildSearchsetBundle([
        mockPatient,
        mockEncounter,
        { resourceType: 'Condition', id: 'c1', subject: { reference: 'Patient/1' }, code: { text: 'test' } } as FhirResource,
        { resourceType: 'Condition', id: 'c2', subject: { reference: 'Patient/1' }, code: { text: 'test2' } } as FhirResource,
      ]);
    });

    it('should extract resources of a specific type', () => {
      const patients = extractFromBundle<FhirPatient>(bundle, 'Patient');
      expect(patients).toHaveLength(1);
      expect(patients[0].resourceType).toBe('Patient');
      expect(patients[0].id).toBe('patient-1');
    });

    it('should extract multiple resources of the same type', () => {
      const conditions = extractFromBundle(bundle, 'Condition');
      expect(conditions).toHaveLength(2);
    });

    it('should return empty array when type is not found', () => {
      const observations = extractFromBundle(bundle, 'Observation');
      expect(observations).toHaveLength(0);
    });

    it('should return empty array for bundle without entries', () => {
      const emptyBundle: FhirBundle = {
        resourceType: 'Bundle',
        type: 'searchset',
      };
      const result = extractFromBundle(emptyBundle, 'Patient');
      expect(result).toHaveLength(0);
    });

    it('should extract encounters correctly', () => {
      const encounters = extractFromBundle<FhirEncounter>(bundle, 'Encounter');
      expect(encounters).toHaveLength(1);
      expect(encounters[0].status).toBe('in-progress');
    });
  });
});
