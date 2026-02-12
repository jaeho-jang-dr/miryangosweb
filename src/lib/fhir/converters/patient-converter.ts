/**
 * Patient ↔ FHIR Patient Converter
 *
 * KR Core Profile: krcore-patient
 * Privacy: RRN is NEVER included in FHIR output. rrnMasked → secondary identifier.
 */

import type { Patient } from '@/types/clinical';
import type { FhirPatient } from '@/types/fhir';
import { KR_CORE_PROFILES } from '@/types/fhir';

/**
 * Convert internal Patient → FHIR Patient resource
 */
export function patientToFhir(patient: Patient): FhirPatient {
  const fhir: FhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      profile: [KR_CORE_PROFILES.Patient],
    },
    active: true,
    name: [
      {
        use: 'official',
        text: patient.name,
      },
    ],
    gender: patient.gender,
    birthDate: patient.birthDate,
  };

  // Identifiers
  const identifiers = [];

  // Internal system ID
  identifiers.push({
    use: 'usual' as const,
    system: 'urn:miryang-ortho:patient-id',
    value: patient.id,
  });

  // Masked RRN as secondary identifier (never the real RRN)
  if (patient.rrnMasked) {
    identifiers.push({
      use: 'secondary' as const,
      system: 'urn:miryang-ortho:rrn-masked',
      value: patient.rrnMasked,
    });
  }

  fhir.identifier = identifiers;

  // Phone
  if (patient.phone) {
    fhir.telecom = [
      {
        system: 'phone',
        value: patient.phone,
        use: 'mobile',
      },
    ];
  }

  // Address
  if (patient.address) {
    fhir.address = [
      {
        use: 'home',
        text: patient.address,
      },
    ];
  }

  return fhir;
}

/**
 * Convert FHIR Patient → Partial internal Patient
 * (partial because some fields like rrn cannot be derived from FHIR)
 */
export function fhirToPatient(fhir: FhirPatient): Partial<Patient> {
  const patient: Partial<Patient> = {};

  if (fhir.id) {
    patient.id = fhir.id;
  }

  // Name: use text field (Korean names are stored as full text)
  const officialName = fhir.name?.find((n) => n.use === 'official') ?? fhir.name?.[0];
  if (officialName?.text) {
    patient.name = officialName.text;
  } else if (officialName?.family || officialName?.given) {
    patient.name = [officialName.family, ...(officialName.given ?? [])].filter(Boolean).join('');
  }

  // Gender
  if (fhir.gender === 'male' || fhir.gender === 'female') {
    patient.gender = fhir.gender;
  }

  // Birth date
  if (fhir.birthDate) {
    patient.birthDate = fhir.birthDate;
  }

  // Phone
  const phone = fhir.telecom?.find((t) => t.system === 'phone');
  if (phone?.value) {
    patient.phone = phone.value;
  }

  // Address
  const address = fhir.address?.[0];
  if (address?.text) {
    patient.address = address.text;
  }

  // Masked RRN from secondary identifier
  const maskedId = fhir.identifier?.find(
    (id) => id.use === 'secondary' && id.system === 'urn:miryang-ortho:rrn-masked',
  );
  if (maskedId?.value) {
    patient.rrnMasked = maskedId.value;
  }

  return patient;
}
