/**
 * FHIR R4 Base Types — Inline definitions (no external npm packages)
 *
 * References:
 *   https://www.hl7.org/fhir/R4/datatypes.html
 *   https://www.hl7.org/fhir/R4/resource.html
 */

// ─── Meta & Resource ─────────────────────────────────────

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string; // instant
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
}

// ─── Coding & CodeableConcept ────────────────────────────

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

// ─── Identifier & Reference ─────────────────────────────

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value?: string;
  period?: FhirPeriod;
}

export interface FhirReference {
  reference?: string; // e.g. "Patient/123"
  type?: string;
  display?: string;
}

// ─── Period & Timing ─────────────────────────────────────

export interface FhirPeriod {
  start?: string; // dateTime
  end?: string;   // dateTime
}

// ─── Human Name ──────────────────────────────────────────

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

// ─── Address ─────────────────────────────────────────────

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

// ─── Contact Point ───────────────────────────────────────

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

// ─── Annotation & Quantity ───────────────────────────────

export interface FhirAnnotation {
  authorReference?: FhirReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

// ─── Dosage ──────────────────────────────────────────────

export interface FhirDosage {
  sequence?: number;
  text?: string;
  patientInstruction?: string;
  route?: FhirCodeableConcept;
  doseAndRate?: {
    type?: FhirCodeableConcept;
    doseQuantity?: FhirQuantity;
  }[];
}

// ─── Narrative ───────────────────────────────────────────

export interface FhirNarrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string; // xhtml
}
