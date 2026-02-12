/**
 * Bidirectional status mapping: ClinicalStatus ↔ FhirEncounterStatus
 */

import type { ClinicalStatus } from '@/types/clinical';
import type { FhirEncounterStatus } from '@/types/fhir';

const clinicalToFhir: Record<ClinicalStatus, FhirEncounterStatus> = {
  reception: 'arrived',
  consulting: 'in-progress',
  testing: 'in-progress',
  treatment: 'in-progress',
  completed: 'finished',
  paid: 'finished',
};

const fhirToClinical: Record<string, ClinicalStatus> = {
  planned: 'reception',
  arrived: 'reception',
  triaged: 'reception',
  'in-progress': 'consulting',
  onleave: 'consulting',
  finished: 'completed',
  cancelled: 'completed',
  'entered-in-error': 'completed',
  unknown: 'reception',
};

export function toFhirStatus(status: ClinicalStatus): FhirEncounterStatus {
  return clinicalToFhir[status] ?? 'unknown';
}

export function toClinicalStatus(status: FhirEncounterStatus): ClinicalStatus {
  return fhirToClinical[status] ?? 'reception';
}
