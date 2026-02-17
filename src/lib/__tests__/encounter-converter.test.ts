import { visitToFhir, fhirToVisit } from '../fhir/converters/encounter-converter';
import type { Visit } from '@/types/clinical';
import type { FhirEncounter, FhirCondition, FhirObservation, FhirMedicationRequest } from '@/types/fhir';

// Mock firebase/firestore Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}));

describe('fhir/converters/encounter-converter', () => {
  const mockVisit: Visit = {
    id: 'visit-001',
    patientId: 'patient-001',
    patientName: '홍길동',
    date: { seconds: 1700000000, nanoseconds: 0, toDate: () => new Date(1700000000 * 1000) } as any,
    status: 'consulting',
    type: 'new',
    insuranceType: 'nhis',
    chiefComplaint: '무릎이 아파요',
    physicalExam: '압통(+), 부종(+)',
    testOrder: 'Knee AP/Lateral',
    testStatus: 'ordered',
    testResult: 'OA grade 2',
    diagnosis: 'M17.1 기타 원발성 무릎관절증\nM75.1 회전근개 증후군',
    prescription: '세레콕시브 200mg 1일 2회',
    orders: [
      { type: 'medication', name: '세레콕시브', status: 'ordered' } as any,
      { type: 'procedure', name: '무릎 주사', status: 'completed' } as any,
    ],
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  };

  describe('visitToFhir', () => {
    it('should create an encounter resource', () => {
      const result = visitToFhir(mockVisit);
      expect(result.encounter.resourceType).toBe('Encounter');
      expect(result.encounter.id).toBe('visit-001');
    });

    it('should map visit status to FHIR status', () => {
      const result = visitToFhir(mockVisit);
      expect(result.encounter.status).toBe('in-progress');
    });

    it('should set ambulatory class', () => {
      const result = visitToFhir(mockVisit);
      expect(result.encounter.class.code).toBe('AMB');
    });

    it('should set subject reference', () => {
      const result = visitToFhir(mockVisit);
      expect(result.encounter.subject?.reference).toBe('Patient/patient-001');
      expect(result.encounter.subject?.display).toBe('홍길동');
    });

    it('should map visit type (new/return)', () => {
      const result = visitToFhir(mockVisit);
      const typeCode = result.encounter.type?.[0]?.coding?.[0]?.code;
      expect(typeCode).toBe('new');
    });

    it('should include insurance type', () => {
      const result = visitToFhir(mockVisit);
      const insuranceType = result.encounter.type?.[1]?.coding?.[0]?.code;
      expect(insuranceType).toBe('nhis');
    });

    it('should set period start from visit date', () => {
      const result = visitToFhir(mockVisit);
      expect(result.encounter.period?.start).toBeDefined();
    });

    it('should create conditions from diagnosis lines', () => {
      const result = visitToFhir(mockVisit);
      expect(result.conditions).toHaveLength(2);
    });

    it('should parse KCD codes in conditions', () => {
      const result = visitToFhir(mockVisit);
      const firstCondition = result.conditions[0];
      expect(firstCondition.code?.coding?.[0]?.code).toBe('M17.1');
      expect(firstCondition.code?.coding?.[0]?.display).toBe('기타 원발성 무릎관절증');
    });

    it('should create condition IDs based on visit ID', () => {
      const result = visitToFhir(mockVisit);
      expect(result.conditions[0].id).toBe('visit-001-dx-0');
      expect(result.conditions[1].id).toBe('visit-001-dx-1');
    });

    it('should set condition subject and encounter references', () => {
      const result = visitToFhir(mockVisit);
      expect(result.conditions[0].subject?.reference).toBe('Patient/patient-001');
      expect(result.conditions[0].encounter?.reference).toBe('Encounter/visit-001');
    });

    it('should create observations from chief complaint', () => {
      const result = visitToFhir(mockVisit);
      const ccObs = result.observations.find(
        o => o.code?.coding?.[0]?.code === 'chief-complaint'
      );
      expect(ccObs).toBeDefined();
      expect(ccObs!.valueString).toBe('무릎이 아파요');
    });

    it('should create observations from physical exam', () => {
      const result = visitToFhir(mockVisit);
      const peObs = result.observations.find(
        o => o.code?.coding?.[0]?.code === 'physical-exam'
      );
      expect(peObs).toBeDefined();
      expect(peObs!.valueString).toBe('압통(+), 부종(+)');
    });

    it('should create observations from test result', () => {
      const result = visitToFhir(mockVisit);
      const testObs = result.observations.find(
        o => o.code?.coding?.[0]?.code === 'test-result'
      );
      expect(testObs).toBeDefined();
      expect(testObs!.valueString).toBe('OA grade 2');
    });

    it('should create medication request from prescription', () => {
      const result = visitToFhir(mockVisit);
      expect(result.medicationRequests).toHaveLength(1);
      expect(result.medicationRequests[0].note?.[0]?.text).toBe('세레콕시브 200mg 1일 2회');
      expect(result.medicationRequests[0].intent).toBe('order');
    });

    it('should create service requests from test order', () => {
      const result = visitToFhir(mockVisit);
      const testSR = result.serviceRequests.find(
        sr => sr.category?.[0]?.text === '검사 오더'
      );
      expect(testSR).toBeDefined();
      expect(testSR!.code?.text).toBe('Knee AP/Lateral');
    });

    it('should create service requests from orders array', () => {
      const result = visitToFhir(mockVisit);
      // 1 test order + 2 orders = 3 service requests
      expect(result.serviceRequests).toHaveLength(3);
    });

    it('should map order status correctly', () => {
      const result = visitToFhir(mockVisit);
      const completedSR = result.serviceRequests.find(
        sr => sr.code?.text === '무릎 주사'
      );
      expect(completedSR?.status).toBe('completed');
    });

    it('should handle visit without diagnosis', () => {
      const visitNoDx: Visit = { ...mockVisit, diagnosis: undefined };
      const result = visitToFhir(visitNoDx);
      expect(result.conditions).toHaveLength(0);
    });

    it('should handle visit without chief complaint', () => {
      const visitNoCC: Visit = { ...mockVisit, chiefComplaint: undefined };
      const result = visitToFhir(visitNoCC);
      const ccObs = result.observations.find(
        o => o.code?.coding?.[0]?.code === 'chief-complaint'
      );
      expect(ccObs).toBeUndefined();
    });

    it('should handle visit without prescription', () => {
      const visitNoRx: Visit = { ...mockVisit, prescription: undefined };
      const result = visitToFhir(visitNoRx);
      expect(result.medicationRequests).toHaveLength(0);
    });

    it('should handle visit without orders', () => {
      const visitNoOrders: Visit = {
        ...mockVisit,
        orders: undefined,
        testOrder: undefined,
      };
      const result = visitToFhir(visitNoOrders);
      expect(result.serviceRequests).toHaveLength(0);
    });

    it('should handle non-KCD format diagnosis text', () => {
      const visitPlainDx: Visit = {
        ...mockVisit,
        diagnosis: '허리가 아파요',
      };
      const result = visitToFhir(visitPlainDx);
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].code?.text).toBe('허리가 아파요');
      expect(result.conditions[0].code?.coding).toBeUndefined();
    });
  });

  describe('fhirToVisit', () => {
    const mockEncounter: FhirEncounter = {
      resourceType: 'Encounter',
      id: 'visit-001',
      status: 'in-progress',
      class: { code: 'AMB' },
      subject: { reference: 'Patient/patient-001', display: '홍길동' },
      type: [{ coding: [{ code: 'new' }] }],
      period: { start: '2025-01-01T09:00:00Z' },
    };

    const mockConditions: FhirCondition[] = [
      {
        resourceType: 'Condition',
        code: { coding: [{ code: 'M17.1', display: '기타 원발성 무릎관절증' }] },
        subject: { reference: 'Patient/patient-001' },
      },
    ];

    const mockObservations: FhirObservation[] = [
      {
        resourceType: 'Observation',
        status: 'final',
        code: { coding: [{ code: 'chief-complaint', display: '주소' }] },
        valueString: '무릎이 아파요',
      },
      {
        resourceType: 'Observation',
        status: 'final',
        code: { coding: [{ code: 'physical-exam', display: '이학적 소견' }] },
        valueString: '압통(+)',
      },
      {
        resourceType: 'Observation',
        status: 'final',
        code: { coding: [{ code: 'test-result', display: '검사 결과' }] },
        valueString: 'OA grade 2',
      },
    ];

    const mockMedRequests: FhirMedicationRequest[] = [
      {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        subject: { reference: 'Patient/patient-001' },
        note: [{ text: '세레콕시브 200mg' }],
      },
    ];

    it('should extract visit ID from encounter', () => {
      const visit = fhirToVisit(mockEncounter);
      expect(visit.id).toBe('visit-001');
    });

    it('should extract patient ID from subject reference', () => {
      const visit = fhirToVisit(mockEncounter);
      expect(visit.patientId).toBe('patient-001');
    });

    it('should extract patient name from subject display', () => {
      const visit = fhirToVisit(mockEncounter);
      expect(visit.patientName).toBe('홍길동');
    });

    it('should map FHIR status to clinical status', () => {
      const visit = fhirToVisit(mockEncounter);
      expect(visit.status).toBe('consulting');
    });

    it('should extract visit type', () => {
      const visit = fhirToVisit(mockEncounter);
      expect(visit.type).toBe('new');
    });

    it('should extract period start as dateISO', () => {
      const visit = fhirToVisit(mockEncounter);
      expect((visit as any).dateISO).toBe('2025-01-01T09:00:00Z');
    });

    it('should extract diagnosis from conditions', () => {
      const visit = fhirToVisit(mockEncounter, mockConditions);
      expect(visit.diagnosis).toBe('M17.1 기타 원발성 무릎관절증');
    });

    it('should extract chief complaint from observations', () => {
      const visit = fhirToVisit(mockEncounter, [], mockObservations);
      expect(visit.chiefComplaint).toBe('무릎이 아파요');
    });

    it('should extract physical exam from observations', () => {
      const visit = fhirToVisit(mockEncounter, [], mockObservations);
      expect(visit.physicalExam).toBe('압통(+)');
    });

    it('should extract test result from observations', () => {
      const visit = fhirToVisit(mockEncounter, [], mockObservations);
      expect(visit.testResult).toBe('OA grade 2');
    });

    it('should extract prescription from medication requests', () => {
      const visit = fhirToVisit(mockEncounter, [], [], mockMedRequests);
      expect(visit.prescription).toBe('세레콕시브 200mg');
    });

    it('should handle encounter with no optional data', () => {
      const minimalEncounter: FhirEncounter = {
        resourceType: 'Encounter',
        status: 'arrived',
        class: { code: 'AMB' },
      };
      const visit = fhirToVisit(minimalEncounter);
      expect(visit.status).toBe('reception');
      expect(visit.diagnosis).toBeUndefined();
      expect(visit.chiefComplaint).toBeUndefined();
    });

    it('should handle condition with text-only code', () => {
      const textConditions: FhirCondition[] = [
        {
          resourceType: 'Condition',
          code: { text: '허리 통증' },
          subject: { reference: 'Patient/1' },
        },
      ];
      const visit = fhirToVisit(mockEncounter, textConditions);
      expect(visit.diagnosis).toBe('허리 통증');
    });

    it('should join multiple conditions with newlines', () => {
      const multiConditions: FhirCondition[] = [
        {
          resourceType: 'Condition',
          code: { coding: [{ code: 'M17.1', display: '무릎관절증' }] },
          subject: { reference: 'Patient/1' },
        },
        {
          resourceType: 'Condition',
          code: { coding: [{ code: 'M75.1', display: '회전근개' }] },
          subject: { reference: 'Patient/1' },
        },
      ];
      const visit = fhirToVisit(mockEncounter, multiConditions);
      expect(visit.diagnosis).toContain('M17.1 무릎관절증');
      expect(visit.diagnosis).toContain('M75.1 회전근개');
    });

    it('should skip observations without valueString', () => {
      const obsNoValue: FhirObservation[] = [
        {
          resourceType: 'Observation',
          status: 'final',
          code: { coding: [{ code: 'chief-complaint' }] },
        },
      ];
      const visit = fhirToVisit(mockEncounter, [], obsNoValue);
      expect(visit.chiefComplaint).toBeUndefined();
    });
  });
});
