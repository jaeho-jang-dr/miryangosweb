/**
 * FHIR R4 Resource Types + KR Core Profile constants
 *
 * References:
 *   https://www.hl7.org/fhir/R4/
 *   https://kr-core.org/
 */

import type {
  FhirResource,
  FhirMeta,
  FhirIdentifier,
  FhirHumanName,
  FhirAddress,
  FhirContactPoint,
  FhirCodeableConcept,
  FhirCoding,
  FhirReference,
  FhirPeriod,
  FhirAnnotation,
  FhirQuantity,
  FhirDosage,
  FhirNarrative,
} from './base';

// ─── KR Core Constants ───────────────────────────────────

export const KR_CORE_PROFILES = {
  Patient: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-patient',
  Encounter: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-encounter',
  Condition: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-condition',
  Observation: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-observation',
  MedicationRequest: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-medicationrequest',
  Practitioner: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-practitioner',
  Organization: 'http://www.hl7korea.or.kr/fhir/krcore/StructureDefinition/krcore-organization',
} as const;

export const KR_CODING_SYSTEMS = {
  KCD8: 'http://www.hl7korea.or.kr/CodeSystem/kcd-8',
  EDI: 'http://www.hl7korea.or.kr/CodeSystem/edi-medication',
  RRN: 'http://www.hl7korea.or.kr/NamingSystem/rrn',
  HIRA: 'http://www.hl7korea.or.kr/NamingSystem/hira-institution',
} as const;

// ─── Patient ─────────────────────────────────────────────

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string; // YYYY-MM-DD
  address?: FhirAddress[];
  text?: FhirNarrative;
}

// ─── Encounter ───────────────────────────────────────────

export type FhirEncounterStatus =
  | 'planned'
  | 'arrived'
  | 'triaged'
  | 'in-progress'
  | 'onleave'
  | 'finished'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status: FhirEncounterStatus;
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  diagnosis?: {
    condition: FhirReference;
    use?: FhirCodeableConcept;
    rank?: number;
  }[];
  text?: FhirNarrative;
}

// ─── Condition ───────────────────────────────────────────

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  recordedDate?: string;
  note?: FhirAnnotation[];
}

// ─── Observation ─────────────────────────────────────────

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueString?: string;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  note?: FhirAnnotation[];
}

// ─── MedicationRequest ───────────────────────────────────

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  medicationCodeableConcept?: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  dosageInstruction?: FhirDosage[];
  note?: FhirAnnotation[];
}

// ─── ServiceRequest ──────────────────────────────────────

export interface FhirServiceRequest extends FhirResource {
  resourceType: 'ServiceRequest';
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  note?: FhirAnnotation[];
}

// ─── DocumentReference ───────────────────────────────────

export interface FhirDocumentReference extends FhirResource {
  resourceType: 'DocumentReference';
  status: 'current' | 'superseded' | 'entered-in-error';
  type?: FhirCodeableConcept;
  subject?: FhirReference;
  date?: string;
  author?: FhirReference[];
  content: {
    attachment: {
      contentType?: string;
      url?: string;
      data?: string; // base64
      title?: string;
    };
  }[];
}

// ─── Practitioner ────────────────────────────────────────

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  qualification?: {
    code: FhirCodeableConcept;
    period?: FhirPeriod;
    issuer?: FhirReference;
  }[];
}

// ─── Organization ────────────────────────────────────────

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  active?: boolean;
  type?: FhirCodeableConcept[];
  name?: string;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
}

// ─── AllergyIntolerance ──────────────────────────────────

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  code?: FhirCodeableConcept;
  patient: FhirReference;
  note?: FhirAnnotation[];
}

// ─── Medication ─────────────────────────────────────────

export interface FhirMedication extends FhirResource {
  resourceType: 'Medication';
  code?: FhirCodeableConcept;
  status?: 'active' | 'inactive' | 'entered-in-error';
  form?: FhirCodeableConcept;
  ingredient?: {
    itemCodeableConcept?: FhirCodeableConcept;
    isActive?: boolean;
    strength?: {
      numerator?: FhirQuantity;
      denominator?: FhirQuantity;
    };
  }[];
}

// ─── OperationOutcome ───────────────────────────────────

export type FhirIssueSeverity = 'fatal' | 'error' | 'warning' | 'information';

export interface FhirOperationOutcomeIssue {
  severity: FhirIssueSeverity;
  code: string;           // e.g. 'business-rule', 'informational'
  details?: FhirCodeableConcept;
  diagnostics?: string;
  expression?: string[];  // FHIRPath expressions
}

export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue: FhirOperationOutcomeIssue[];
}

// ─── Bundle ──────────────────────────────────────────────

export type FhirBundleType =
  | 'document'
  | 'message'
  | 'transaction'
  | 'transaction-response'
  | 'batch'
  | 'batch-response'
  | 'history'
  | 'searchset'
  | 'collection';

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
  request?: {
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
  };
  response?: {
    status: string;
    location?: string;
  };
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: FhirBundleType;
  total?: number;
  entry?: FhirBundleEntry[];
  timestamp?: string;
}
