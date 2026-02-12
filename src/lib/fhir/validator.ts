/**
 * FHIR Resource Validator — lightweight structural validation
 *
 * Validates required fields per resource type without external schema packages.
 */

import type { FhirResource } from '@/types/fhir';
import type {
  FhirPatient,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
} from '@/types/fhir';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a FHIR resource based on its resourceType.
 */
export function validateResource(resource: FhirResource): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!resource.resourceType) {
    result.errors.push('Missing resourceType');
    result.valid = false;
    return result;
  }

  switch (resource.resourceType) {
    case 'Patient':
      validatePatient(resource as FhirPatient, result);
      break;
    case 'Encounter':
      validateEncounter(resource as FhirEncounter, result);
      break;
    case 'Condition':
      validateCondition(resource as FhirCondition, result);
      break;
    case 'Observation':
      validateObservation(resource as FhirObservation, result);
      break;
    case 'MedicationRequest':
      validateMedicationRequest(resource as FhirMedicationRequest, result);
      break;
    default:
      // No specific validation for other types
      break;
  }

  result.valid = result.errors.length === 0;
  return result;
}

function validatePatient(patient: FhirPatient, result: ValidationResult): void {
  const hasName = patient.name && patient.name.length > 0 &&
    patient.name.some((n) => n.text || n.family || (n.given && n.given.length > 0));
  const hasIdentifier = patient.identifier && patient.identifier.length > 0 &&
    patient.identifier.some((id) => id.value);

  if (!hasName && !hasIdentifier) {
    result.errors.push('Patient must have at least one name or identifier');
  }

  if (!patient.gender) {
    result.warnings.push('Patient.gender is recommended');
  }

  if (!patient.birthDate) {
    result.warnings.push('Patient.birthDate is recommended');
  }
}

function validateEncounter(encounter: FhirEncounter, result: ValidationResult): void {
  if (!encounter.status) {
    result.errors.push('Encounter.status is required');
  }

  if (!encounter.class) {
    result.errors.push('Encounter.class is required');
  }

  if (!encounter.subject?.reference) {
    result.errors.push('Encounter.subject is required');
  }

  if (!encounter.period?.start) {
    result.warnings.push('Encounter.period.start is recommended');
  }
}

function validateCondition(condition: FhirCondition, result: ValidationResult): void {
  if (!condition.subject?.reference) {
    result.errors.push('Condition.subject is required');
  }

  if (!condition.code?.coding?.length && !condition.code?.text) {
    result.errors.push('Condition.code is required');
  }

  if (!condition.clinicalStatus) {
    result.warnings.push('Condition.clinicalStatus is recommended');
  }
}

function validateObservation(observation: FhirObservation, result: ValidationResult): void {
  if (!observation.status) {
    result.errors.push('Observation.status is required');
  }

  if (!observation.code?.coding?.length && !observation.code?.text) {
    result.errors.push('Observation.code is required');
  }

  if (!observation.subject?.reference) {
    result.warnings.push('Observation.subject is recommended');
  }
}

function validateMedicationRequest(mr: FhirMedicationRequest, result: ValidationResult): void {
  if (!mr.status) {
    result.errors.push('MedicationRequest.status is required');
  }

  if (!mr.intent) {
    result.errors.push('MedicationRequest.intent is required');
  }

  if (!mr.subject?.reference) {
    result.errors.push('MedicationRequest.subject is required');
  }
}
