export type {
  FhirMeta,
  FhirResource,
  FhirCoding,
  FhirCodeableConcept,
  FhirIdentifier,
  FhirReference,
  FhirPeriod,
  FhirHumanName,
  FhirAddress,
  FhirContactPoint,
  FhirAnnotation,
  FhirQuantity,
  FhirDosage,
  FhirNarrative,
} from './base';

export type {
  FhirPatient,
  FhirEncounterStatus,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirServiceRequest,
  FhirDocumentReference,
  FhirPractitioner,
  FhirOrganization,
  FhirAllergyIntolerance,
  FhirMedication,
  FhirIssueSeverity,
  FhirOperationOutcomeIssue,
  FhirOperationOutcome,
  FhirBundleType,
  FhirBundleEntry,
  FhirBundle,
} from './resources';

export {
  KR_CORE_PROFILES,
  KR_CODING_SYSTEMS,
} from './resources';
