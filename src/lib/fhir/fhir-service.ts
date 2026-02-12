/**
 * FHIR Service Layer — Firestore ↔ FHIR conversion with audit logging
 *
 * Provides high-level operations for reading/writing clinical data
 * through FHIR-compliant interfaces.
 */

import { initAdmin, adminDb } from '@/lib/firebase-admin';
import { writeAuditLog } from '@/lib/audit-logger';
import { patientToFhir, fhirToPatient } from './converters/patient-converter';
import { visitToFhir, fhirToVisit } from './converters/encounter-converter';
import { buildSearchsetBundle, buildDocumentBundle, extractFromBundle } from './bundle-builder';
import { validateResource } from './validator';
import type { Patient, Visit } from '@/types/clinical';
import type {
  FhirPatient,
  FhirBundle,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirResource,
} from '@/types/fhir';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Get a single patient as FHIR Patient resource.
 */
export async function getPatientAsFhir(patientId: string): Promise<FhirPatient> {
  initAdmin();
  const db = adminDb();

  const doc = await db.collection('patients').doc(patientId).get();
  if (!doc.exists) {
    throw new Error(`Patient not found: ${patientId}`);
  }

  const patient = { id: doc.id, ...doc.data() } as Patient;
  return patientToFhir(patient);
}

/**
 * Get a single visit as a FHIR Bundle (Encounter + related resources).
 */
export async function getVisitAsFhir(visitId: string): Promise<FhirBundle> {
  initAdmin();
  const db = adminDb();

  const doc = await db.collection('visits').doc(visitId).get();
  if (!doc.exists) {
    throw new Error(`Visit not found: ${visitId}`);
  }

  const visit = { id: doc.id, ...doc.data() } as Visit;
  const bundle = visitToFhir(visit);

  const resources: FhirResource[] = [
    bundle.encounter,
    ...bundle.conditions,
    ...bundle.observations,
    ...bundle.medicationRequests,
    ...bundle.serviceRequests,
  ];

  return buildSearchsetBundle(resources);
}

/**
 * Get all encounters for a patient as a searchset Bundle.
 */
export async function getPatientEncounters(patientId: string): Promise<FhirBundle> {
  initAdmin();
  const db = adminDb();

  const snapshot = await db
    .collection('visits')
    .where('patientId', '==', patientId)
    .orderBy('date', 'desc')
    .get();

  const allResources: FhirResource[] = [];

  for (const doc of snapshot.docs) {
    const visit = { id: doc.id, ...doc.data() } as Visit;
    const bundle = visitToFhir(visit);
    allResources.push(
      bundle.encounter,
      ...bundle.conditions,
      ...bundle.observations,
      ...bundle.medicationRequests,
      ...bundle.serviceRequests,
    );
  }

  return buildSearchsetBundle(allResources, snapshot.size);
}

/**
 * Export complete patient record as a FHIR document Bundle ($everything).
 */
export async function exportPatientBundle(patientId: string): Promise<FhirBundle> {
  initAdmin();
  const db = adminDb();

  // Get patient
  const patientDoc = await db.collection('patients').doc(patientId).get();
  if (!patientDoc.exists) {
    throw new Error(`Patient not found: ${patientId}`);
  }

  const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
  const fhirPatient = patientToFhir(patient);

  // Get all visits
  const visitSnapshot = await db
    .collection('visits')
    .where('patientId', '==', patientId)
    .orderBy('date', 'desc')
    .get();

  const allResources: FhirResource[] = [fhirPatient];

  for (const doc of visitSnapshot.docs) {
    const visit = { id: doc.id, ...doc.data() } as Visit;
    const bundle = visitToFhir(visit);
    allResources.push(
      bundle.encounter,
      ...bundle.conditions,
      ...bundle.observations,
      ...bundle.medicationRequests,
      ...bundle.serviceRequests,
    );
  }

  await writeAuditLog({
    action: 'export',
    collection: 'patients',
    documentId: patientId,
    description: `FHIR $everything 내보내기: ${visitSnapshot.size}건 방문 포함`,
    metadata: { resourceCount: allResources.length },
  });

  return buildDocumentBundle(allResources);
}

/**
 * Create or update a patient from FHIR Patient resource.
 * Returns the patient ID.
 */
export async function upsertPatientFromFhir(
  fhirPatient: FhirPatient,
  userId?: string,
): Promise<string> {
  initAdmin();
  const db = adminDb();

  const validation = validateResource(fhirPatient);
  if (!validation.valid) {
    throw new Error(`Invalid FHIR Patient: ${validation.errors.join(', ')}`);
  }

  const partial = fhirToPatient(fhirPatient);

  if (fhirPatient.id) {
    // Update existing patient
    const docRef = db.collection('patients').doc(fhirPatient.id);
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.update(partial);

      await writeAuditLog({
        action: 'update',
        collection: 'patients',
        documentId: fhirPatient.id,
        userId,
        description: 'FHIR Patient 업데이트',
        before: existing.data(),
        after: partial as Record<string, unknown>,
      });

      return fhirPatient.id;
    }
  }

  // Create new patient
  const now = Timestamp.now();
  const newPatient = {
    ...partial,
    rrn: partial.rrnMasked ?? '',
    createdAt: now,
  };

  const ref = await db.collection('patients').add(newPatient);

  await writeAuditLog({
    action: 'create',
    collection: 'patients',
    documentId: ref.id,
    userId,
    description: 'FHIR Patient 생성',
    after: newPatient as Record<string, unknown>,
  });

  return ref.id;
}

/**
 * Create a visit from a FHIR Bundle containing Encounter and related resources.
 * Returns the visit ID.
 */
export async function createVisitFromFhir(
  bundle: FhirBundle,
  userId?: string,
): Promise<string> {
  initAdmin();
  const db = adminDb();

  const encounters = extractFromBundle<FhirEncounter>(bundle, 'Encounter');
  if (encounters.length === 0) {
    throw new Error('Bundle must contain at least one Encounter');
  }

  const encounter = encounters[0];
  const conditions = extractFromBundle<FhirCondition>(bundle, 'Condition');
  const observations = extractFromBundle<FhirObservation>(bundle, 'Observation');
  const medicationRequests = extractFromBundle<FhirMedicationRequest>(bundle, 'MedicationRequest');

  const partial = fhirToVisit(encounter, conditions, observations, medicationRequests);

  const now = Timestamp.now();
  const newVisit = {
    ...partial,
    type: partial.type ?? 'new',
    status: partial.status ?? 'reception',
    createdAt: now,
    updatedAt: now,
    date: now,
  };

  const ref = await db.collection('visits').add(newVisit);

  await writeAuditLog({
    action: 'create',
    collection: 'visits',
    documentId: ref.id,
    userId,
    description: 'FHIR Encounter 기반 방문 생성',
    after: newVisit as Record<string, unknown>,
  });

  return ref.id;
}
