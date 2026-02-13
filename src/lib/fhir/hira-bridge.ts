/**
 * FHIR ↔ HIRA 브릿지 서비스
 *
 * 외부 EMR 시스템이 FHIR R4 표준 프로토콜로
 * HIRA/MFDS 공공 API 데이터에 접근할 수 있는 브릿지.
 *
 * 1. validatePrescriptionDur  — MedicationRequest $validate → DUR OperationOutcome
 * 2. lookupMedicationAsFhir   — 의약품 → FHIR Medication 리소스
 * 3. searchPharmacyOrganizations — 약국 → FHIR Organization 검색결과 Bundle
 */

import { performBatchDurCheck, lookupDrugForEmr, findNearbyPharmacies } from '@/lib/hira/emr-integration';
import {
  durResultToOperationOutcome,
  drugLookupToMedication,
  pharmacyToOrganization,
  extractBusinessHours,
} from './converters/hira-bridge-converter';
import { buildSearchsetBundle } from './bundle-builder';
import type { FhirOperationOutcome, FhirMedication, FhirBundle, FhirResource, FhirMedicationRequest } from '@/types/fhir';
import type { EmrDurCheckRequest, EmrIngredientEntry } from '@/types/hira';

// ─── 1. MedicationRequest $validate (DUR) ───────────────

/**
 * FHIR MedicationRequest(들)에서 약물 성분을 추출하여 DUR 일괄 체크.
 * 결과를 FHIR OperationOutcome으로 반환.
 *
 * 외부 EMR 연동 시나리오:
 *   POST /api/fhir/MedicationRequest/$validate
 *   Body: { medications: [...], patientAge: 72, isPregnant: false }
 *
 * @returns FHIR OperationOutcome (severity=error → 처방 차단, warning → 알림)
 */
export async function validatePrescriptionDur(params: {
  medications: { name: string; code?: string }[];
  patientAge?: number;
  isPregnant?: boolean;
}): Promise<FhirOperationOutcome> {
  const request: EmrDurCheckRequest = {
    ingredients: params.medications.map(m => ({
      name: m.name,
      code: m.code,
    })),
    patientAge: params.patientAge,
    isPregnant: params.isPregnant,
  };

  const durResult = await performBatchDurCheck(request);
  return durResultToOperationOutcome(durResult);
}

/**
 * FHIR MedicationRequest 리소스 목록에서 약물명을 추출.
 * medicationCodeableConcept.text 또는 .coding[0].display를 사용.
 */
export function extractMedicationsFromRequests(
  requests: FhirMedicationRequest[],
): EmrIngredientEntry[] {
  return requests
    .map((mr): EmrIngredientEntry | null => {
      const concept = mr.medicationCodeableConcept;
      const name = concept?.text
        || concept?.coding?.[0]?.display
        || concept?.coding?.[0]?.code;
      if (!name) return null;
      const code = concept?.coding?.[0]?.code !== name
        ? concept?.coding?.[0]?.code
        : undefined;
      return code ? { name, code } : { name };
    })
    .filter((m): m is EmrIngredientEntry => m !== null);
}

// ─── 2. Medication 조회 ─────────────────────────────────

/**
 * 성분명으로 HIRA 의약품 통합조회 후 FHIR Medication으로 반환.
 *
 * GET /api/fhir/Medication?code=록소프로펜
 */
export async function lookupMedicationAsFhir(
  drugName: string,
  drugCode?: string,
): Promise<FhirMedication> {
  const lookup = await lookupDrugForEmr(drugName, drugCode);
  return drugLookupToMedication(lookup, drugName);
}

// ─── 3. Organization (약국) 검색 ────────────────────────

/**
 * 지역 기반 약국 검색 결과를 FHIR Organization searchset Bundle로 반환.
 * 영업시간은 각 Organization의 extension에 포함.
 *
 * GET /api/fhir/Organization?type=pharmacy&address-state=48
 */
export async function searchPharmacyOrganizations(params: {
  sidoCd?: string;
  sgguCd?: string;
  yadmNm?: string;
  numOfRows?: number;
}): Promise<FhirBundle> {
  const result = await findNearbyPharmacies(params);

  const resources: FhirResource[] = result.pharmacies.map(pharmacy => {
    const org = pharmacyToOrganization(pharmacy);

    // 영업시간을 meta.extension에 추가 (FHIR extension 패턴)
    const hours = extractBusinessHours(pharmacy);
    if (hours.length > 0) {
      (org as unknown as Record<string, unknown>).extension = [{
        url: 'urn:miryang-ortho:pharmacy-hours',
        valueString: JSON.stringify(hours),
      }];
    }

    return org;
  });

  const bundle = buildSearchsetBundle(resources, result.totalCount);

  // Bundle에 openNowEstimate를 meta.tag로 첨부
  bundle.meta = {
    tag: [{
      system: 'urn:miryang-ortho:pharmacy-status',
      code: `open-now-${result.openNowEstimate}`,
      display: `현재 영업 중 추정: ${result.openNowEstimate}곳`,
    }],
  };

  return bundle;
}
