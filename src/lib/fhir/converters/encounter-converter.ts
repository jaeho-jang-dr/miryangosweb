/**
 * Visit → FHIR Resource Set Converter
 *
 * A single Visit maps to:
 *   1 Encounter + 0..n Condition + 0..n Observation +
 *   0..n MedicationRequest + 0..n ServiceRequest
 */

import type { Visit, MedicalOrder } from '@/types/clinical';
import type {
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirServiceRequest,
  FhirBundle,
  FhirResource,
} from '@/types/fhir';
import { KR_CORE_PROFILES, KR_CODING_SYSTEMS } from '@/types/fhir';
import { toFhirStatus, toClinicalStatus } from '../status-maps';

/** The result of converting a Visit to FHIR */
export interface VisitFhirBundle {
  encounter: FhirEncounter;
  conditions: FhirCondition[];
  observations: FhirObservation[];
  medicationRequests: FhirMedicationRequest[];
  serviceRequests: FhirServiceRequest[];
}

/** Regex to parse KCD diagnosis codes like "M75.1 회전근개 증후군" */
const KCD_REGEX = /^([A-Z]\d{2}(?:\.\d{1,2})?)[\s\-](.+)$/;

/**
 * Convert internal Visit → set of FHIR resources
 */
export function visitToFhir(visit: Visit): VisitFhirBundle {
  const patientRef = { reference: `Patient/${visit.patientId}`, display: visit.patientName };
  const encounterRef = { reference: `Encounter/${visit.id}` };

  // ─── Encounter ───────────────────────────────────────

  const encounter: FhirEncounter = {
    resourceType: 'Encounter',
    id: visit.id,
    meta: { profile: [KR_CORE_PROFILES.Encounter] },
    status: toFhirStatus(visit.status),
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    type: [
      {
        coding: [
          {
            system: 'urn:miryang-ortho:visit-type',
            code: visit.type,
            display: visit.type === 'new' ? '초진' : '재진',
          },
        ],
      },
    ],
    subject: patientRef,
    period: {
      start: toISOString(visit.date),
    },
  };

  if (visit.insuranceType) {
    encounter.type!.push({
      coding: [
        {
          system: 'urn:miryang-ortho:insurance-type',
          code: visit.insuranceType,
        },
      ],
    });
  }

  // ─── Conditions (from diagnosis) ─────────────────────

  const conditions: FhirCondition[] = [];
  if (visit.diagnosis) {
    // diagnosis can be multi-line or comma-separated
    const lines = visit.diagnosis.split(/[,\n]/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(KCD_REGEX);
      const condition: FhirCondition = {
        resourceType: 'Condition',
        id: `${visit.id}-dx-${i}`,
        meta: { profile: [KR_CORE_PROFILES.Condition] },
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
            },
          ],
        },
        code: match
          ? {
              coding: [
                {
                  system: KR_CODING_SYSTEMS.KCD8,
                  code: match[1],
                  display: match[2],
                },
              ],
              text: lines[i],
            }
          : { text: lines[i] },
        subject: patientRef,
        encounter: encounterRef,
        recordedDate: toISOString(visit.date),
      };
      conditions.push(condition);
    }
  }

  // ─── Observations ────────────────────────────────────

  const observations: FhirObservation[] = [];

  if (visit.chiefComplaint) {
    observations.push(makeObservation(visit, patientRef, encounterRef, 'chief-complaint', '주소', visit.chiefComplaint));
  }
  if (visit.physicalExam) {
    observations.push(makeObservation(visit, patientRef, encounterRef, 'physical-exam', '이학적 소견', visit.physicalExam));
  }
  if (visit.testResult) {
    observations.push(makeObservation(visit, patientRef, encounterRef, 'test-result', '검사 결과', visit.testResult));
  }

  // ─── MedicationRequests ──────────────────────────────

  const medicationRequests: FhirMedicationRequest[] = [];
  if (visit.prescription) {
    medicationRequests.push({
      resourceType: 'MedicationRequest',
      id: `${visit.id}-rx-0`,
      meta: { profile: [KR_CORE_PROFILES.MedicationRequest] },
      status: visit.status === 'completed' || visit.status === 'paid' ? 'completed' : 'active',
      intent: 'order',
      subject: patientRef,
      encounter: encounterRef,
      authoredOn: toISOString(visit.date),
      note: [{ text: visit.prescription }],
    });
  }

  // ─── ServiceRequests (testOrder + orders) ────────────

  const serviceRequests: FhirServiceRequest[] = [];

  if (visit.testOrder) {
    serviceRequests.push({
      resourceType: 'ServiceRequest',
      id: `${visit.id}-sr-test`,
      status: visit.testStatus === 'completed' ? 'completed' : 'active',
      intent: 'order',
      category: [{ text: '검사 오더' }],
      code: { text: visit.testOrder },
      subject: patientRef,
      encounter: encounterRef,
      authoredOn: toISOString(visit.date),
    });
  }

  if (visit.orders) {
    for (let i = 0; i < visit.orders.length; i++) {
      const order = visit.orders[i];
      serviceRequests.push(orderToServiceRequest(order, visit, patientRef, encounterRef, i));
    }
  }

  return { encounter, conditions, observations, medicationRequests, serviceRequests };
}

/**
 * Convert FHIR resources back to a partial Visit
 */
export function fhirToVisit(
  encounter: FhirEncounter,
  conditions?: FhirCondition[],
  observations?: FhirObservation[],
  medicationRequests?: FhirMedicationRequest[],
): Partial<Visit> {
  const visit: Partial<Visit> = {};

  if (encounter.id) visit.id = encounter.id;

  // Patient reference
  const patientId = encounter.subject?.reference?.replace('Patient/', '');
  if (patientId) visit.patientId = patientId;
  if (encounter.subject?.display) visit.patientName = encounter.subject.display;

  // Status
  visit.status = toClinicalStatus(encounter.status);

  // Type
  const visitType = encounter.type?.[0]?.coding?.[0]?.code;
  if (visitType === 'new' || visitType === 'return') {
    visit.type = visitType;
  }

  // Period → date
  if (encounter.period?.start) {
    // We store as Timestamp in Firestore; this returns as string for partial
    (visit as Record<string, unknown>).dateISO = encounter.period.start;
  }

  // Diagnosis from conditions
  if (conditions?.length) {
    visit.diagnosis = conditions
      .map((c) => {
        const coding = c.code?.coding?.[0];
        if (coding?.code && coding?.display) {
          return `${coding.code} ${coding.display}`;
        }
        return c.code?.text ?? '';
      })
      .filter(Boolean)
      .join('\n');
  }

  // Observations
  for (const obs of observations ?? []) {
    const code = obs.code?.coding?.[0]?.code;
    const value = obs.valueString;
    if (!value) continue;
    if (code === 'chief-complaint') visit.chiefComplaint = value;
    else if (code === 'physical-exam') visit.physicalExam = value;
    else if (code === 'test-result') visit.testResult = value;
  }

  // Prescription from MedicationRequest notes
  if (medicationRequests?.length) {
    visit.prescription = medicationRequests
      .map((mr) => mr.note?.[0]?.text)
      .filter(Boolean)
      .join('\n');
  }

  return visit;
}

// ─── Helpers ─────────────────────────────────────────────

function toISOString(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

function makeObservation(
  visit: Visit,
  patientRef: { reference: string; display: string },
  encounterRef: { reference: string },
  code: string,
  display: string,
  value: string,
): FhirObservation {
  return {
    resourceType: 'Observation',
    id: `${visit.id}-obs-${code}`,
    meta: { profile: [KR_CORE_PROFILES.Observation] },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'exam',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'urn:miryang-ortho:observation-type',
          code,
          display,
        },
      ],
    },
    subject: patientRef,
    encounter: encounterRef,
    effectiveDateTime: toISOString(visit.date),
    valueString: value,
  };
}

function orderToServiceRequest(
  order: MedicalOrder,
  visit: Visit,
  patientRef: { reference: string; display: string },
  encounterRef: { reference: string },
  index: number,
): FhirServiceRequest {
  const statusMap: Record<string, 'active' | 'completed' | 'revoked'> = {
    ordered: 'active',
    completed: 'completed',
    cancelled: 'revoked',
  };

  return {
    resourceType: 'ServiceRequest',
    id: `${visit.id}-sr-${index}`,
    status: statusMap[order.status] ?? 'active',
    intent: 'order',
    category: [{ text: order.type }],
    code: { text: order.name },
    subject: patientRef,
    encounter: encounterRef,
    authoredOn: toISOString(visit.date),
  };
}
