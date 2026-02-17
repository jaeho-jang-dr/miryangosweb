import { patientToFhir, fhirToPatient } from '../fhir/converters/patient-converter';
import type { Patient } from '@/types/clinical';
import type { FhirPatient } from '@/types/fhir';

// Mock the Timestamp from firebase/firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}));

describe('fhir/converters/patient-converter', () => {
  const mockPatient: Patient = {
    id: 'patient-001',
    name: '홍길동',
    rrn: '900101-1234567',
    gender: 'male',
    birthDate: '1990-01-01',
    phone: '010-1234-5678',
    address: '경남 밀양시 중앙로 451번지',
    rrnMasked: '900101-1******',
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  };

  describe('patientToFhir', () => {
    it('should set resourceType to Patient', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.resourceType).toBe('Patient');
    });

    it('should map patient ID', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.id).toBe('patient-001');
    });

    it('should set active to true', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.active).toBe(true);
    });

    it('should map name correctly', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.name).toHaveLength(1);
      expect(fhir.name![0].use).toBe('official');
      expect(fhir.name![0].text).toBe('홍길동');
    });

    it('should map gender', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.gender).toBe('male');
    });

    it('should map birthDate', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.birthDate).toBe('1990-01-01');
    });

    it('should include patient ID as usual identifier', () => {
      const fhir = patientToFhir(mockPatient);
      const usualId = fhir.identifier?.find(id => id.use === 'usual');
      expect(usualId).toBeDefined();
      expect(usualId!.system).toBe('urn:miryang-ortho:patient-id');
      expect(usualId!.value).toBe('patient-001');
    });

    it('should include masked RRN as secondary identifier', () => {
      const fhir = patientToFhir(mockPatient);
      const maskedId = fhir.identifier?.find(id => id.use === 'secondary');
      expect(maskedId).toBeDefined();
      expect(maskedId!.system).toBe('urn:miryang-ortho:rrn-masked');
      expect(maskedId!.value).toBe('900101-1******');
    });

    it('should NOT include plain RRN in FHIR output (privacy)', () => {
      const fhir = patientToFhir(mockPatient);
      const serialized = JSON.stringify(fhir);
      expect(serialized).not.toContain('900101-1234567');
    });

    it('should map phone as mobile telecom', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.telecom).toHaveLength(1);
      expect(fhir.telecom![0].system).toBe('phone');
      expect(fhir.telecom![0].value).toBe('010-1234-5678');
      expect(fhir.telecom![0].use).toBe('mobile');
    });

    it('should map address as home address', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.address).toHaveLength(1);
      expect(fhir.address![0].use).toBe('home');
      expect(fhir.address![0].text).toBe('경남 밀양시 중앙로 451번지');
    });

    it('should include meta with KR Core profile', () => {
      const fhir = patientToFhir(mockPatient);
      expect(fhir.meta?.profile).toBeDefined();
      expect(fhir.meta!.profile!.length).toBeGreaterThan(0);
    });

    it('should handle patient without phone', () => {
      const patientNoPhone: Patient = {
        ...mockPatient,
        phone: '',
      };
      const fhir = patientToFhir(patientNoPhone);
      expect(fhir.telecom).toBeUndefined();
    });

    it('should handle patient without address', () => {
      const patientNoAddr: Patient = {
        ...mockPatient,
        address: undefined,
      };
      const fhir = patientToFhir(patientNoAddr);
      expect(fhir.address).toBeUndefined();
    });

    it('should handle patient without masked RRN', () => {
      const patientNoMask: Patient = {
        ...mockPatient,
        rrnMasked: undefined,
      };
      const fhir = patientToFhir(patientNoMask);
      const secondaryId = fhir.identifier?.find(id => id.use === 'secondary');
      expect(secondaryId).toBeUndefined();
    });
  });

  describe('fhirToPatient', () => {
    const mockFhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: 'patient-001',
      name: [{ use: 'official', text: '홍길동' }],
      gender: 'male',
      birthDate: '1990-01-01',
      telecom: [{ system: 'phone', value: '010-1234-5678', use: 'mobile' }],
      address: [{ use: 'home', text: '경남 밀양시 중앙로 451번지' }],
      identifier: [
        { use: 'usual', system: 'urn:miryang-ortho:patient-id', value: 'patient-001' },
        { use: 'secondary', system: 'urn:miryang-ortho:rrn-masked', value: '900101-1******' },
      ],
    };

    it('should extract patient ID', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.id).toBe('patient-001');
    });

    it('should extract name from official name', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.name).toBe('홍길동');
    });

    it('should extract name from given+family when text is missing', () => {
      const fhir: FhirPatient = {
        resourceType: 'Patient',
        name: [{ use: 'official', family: '홍', given: ['길동'] }],
      };
      const patient = fhirToPatient(fhir);
      expect(patient.name).toBe('홍길동');
    });

    it('should fall back to first name when no official name', () => {
      const fhir: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: '이순신' }],
      };
      const patient = fhirToPatient(fhir);
      expect(patient.name).toBe('이순신');
    });

    it('should extract gender', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.gender).toBe('male');
    });

    it('should not set gender for non-binary values', () => {
      const fhir: FhirPatient = {
        resourceType: 'Patient',
        name: [{ text: 'Test' }],
        gender: 'other' as any,
      };
      const patient = fhirToPatient(fhir);
      expect(patient.gender).toBeUndefined();
    });

    it('should extract birthDate', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.birthDate).toBe('1990-01-01');
    });

    it('should extract phone from telecom', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.phone).toBe('010-1234-5678');
    });

    it('should extract address from address text', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.address).toBe('경남 밀양시 중앙로 451번지');
    });

    it('should extract masked RRN from secondary identifier', () => {
      const patient = fhirToPatient(mockFhirPatient);
      expect(patient.rrnMasked).toBe('900101-1******');
    });

    it('should handle FHIR patient with no optional fields', () => {
      const fhir: FhirPatient = {
        resourceType: 'Patient',
      };
      const patient = fhirToPatient(fhir);
      expect(patient.name).toBeUndefined();
      expect(patient.gender).toBeUndefined();
      expect(patient.phone).toBeUndefined();
      expect(patient.address).toBeUndefined();
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve key fields through patient->fhir->patient', () => {
      const fhir = patientToFhir(mockPatient);
      const roundTripped = fhirToPatient(fhir);

      expect(roundTripped.id).toBe(mockPatient.id);
      expect(roundTripped.name).toBe(mockPatient.name);
      expect(roundTripped.gender).toBe(mockPatient.gender);
      expect(roundTripped.birthDate).toBe(mockPatient.birthDate);
      expect(roundTripped.phone).toBe(mockPatient.phone);
      expect(roundTripped.address).toBe(mockPatient.address);
      expect(roundTripped.rrnMasked).toBe(mockPatient.rrnMasked);
    });
  });
});
