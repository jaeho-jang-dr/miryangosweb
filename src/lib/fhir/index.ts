// Converters
export { patientToFhir, fhirToPatient } from './converters/patient-converter';
export { visitToFhir, fhirToVisit } from './converters/encounter-converter';
export type { VisitFhirBundle } from './converters/encounter-converter';

// FHIR ↔ HIRA Bridge Converters
export {
  durResultToOperationOutcome,
  drugLookupToMedication,
  pharmacyToOrganization,
  extractBusinessHours,
} from './converters/hira-bridge-converter';

// Status maps
export { toFhirStatus, toClinicalStatus } from './status-maps';

// Bundle builder
export {
  buildTransactionBundle,
  buildSearchsetBundle,
  buildDocumentBundle,
  extractFromBundle,
} from './bundle-builder';

// Validator
export { validateResource } from './validator';
export type { ValidationResult } from './validator';

// Service
export {
  getPatientAsFhir,
  getVisitAsFhir,
  getPatientEncounters,
  exportPatientBundle,
  upsertPatientFromFhir,
  createVisitFromFhir,
} from './fhir-service';

// FHIR ↔ HIRA Bridge Service
export {
  validatePrescriptionDur,
  extractMedicationsFromRequests,
  lookupMedicationAsFhir,
  searchPharmacyOrganizations,
} from './hira-bridge';
