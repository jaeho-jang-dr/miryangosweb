/**
 * FHIR ↔ HIRA 브릿지 컨버터
 *
 * HIRA/MFDS 공공 API 데이터 → FHIR R4 표준 리소스 변환
 *
 * 1. DUR 체크 결과 → FHIR OperationOutcome
 * 2. 의약품 정보   → FHIR Medication
 * 3. 약국 정보     → FHIR Organization (type=pharmacy)
 *
 * KR Core Profile 준수: http://www.hl7korea.or.kr/fhir/krcore/
 */

import type {
  FhirOperationOutcome,
  FhirOperationOutcomeIssue,
  FhirIssueSeverity,
  FhirMedication,
  FhirOrganization,
} from '@/types/fhir';
import type {
  EmrDurCheckResult,
  EmrDurAlert,
  EmrDrugLookupResult,
  PharmacyDetailInfo,
} from '@/types/hira';

// ─── DUR → OperationOutcome ─────────────────────────────

const SEVERITY_MAP: Record<EmrDurAlert['severity'], FhirIssueSeverity> = {
  critical: 'error',
  warning: 'warning',
  info: 'information',
};

const DUR_CODE_MAP: Record<string, string> = {
  contraindication: 'DUR-CI',
  'age-taboo': 'DUR-AGE',
  'pregnancy-taboo': 'DUR-PREG',
  'dosage-caution': 'DUR-DOSE',
  'duration-caution': 'DUR-DUR',
  'duplicate-efficacy': 'DUR-DUP',
  'split-caution': 'DUR-SPLIT',
};

const DUR_DISPLAY_MAP: Record<string, string> = {
  contraindication: '병용금기',
  'age-taboo': '특정연령대금기',
  'pregnancy-taboo': '임부금기',
  'dosage-caution': '용량주의',
  'duration-caution': '투여기간주의',
  'duplicate-efficacy': '효능군중복',
  'split-caution': '서방정분할주의',
};

/**
 * DUR 일괄체크 결과 → FHIR OperationOutcome
 *
 * FHIR $validate 응답 표준. 외부 EMR이 OperationOutcome.issue[]를 파싱하여
 * severity=error 시 처방 차단, warning 시 팝업 알림 가능.
 */
export function durResultToOperationOutcome(
  result: EmrDurCheckResult,
): FhirOperationOutcome {
  const issues: FhirOperationOutcomeIssue[] = [];

  const allAlerts = [
    ...result.critical,
    ...result.warnings,
    ...result.info,
  ];

  if (allAlerts.length === 0) {
    // DUR 통과 — 안전
    issues.push({
      severity: 'information',
      code: 'informational',
      details: {
        coding: [{ system: 'urn:miryang-ortho:dur', code: 'PASS', display: 'DUR 통과' }],
        text: `${result.drugCount}개 약물 DUR 체크 통과`,
      },
      diagnostics: `Checked ${result.drugCount} drugs at ${result.checkedAt}. No issues found.`,
    });
  } else {
    for (const alert of allAlerts) {
      issues.push(durAlertToIssue(alert));
    }
  }

  return {
    resourceType: 'OperationOutcome',
    id: `dur-check-${Date.now()}`,
    issue: issues,
  };
}

function durAlertToIssue(alert: EmrDurAlert): FhirOperationOutcomeIssue {
  const code = alert.severity === 'critical' ? 'business-rule' : 'informational';
  const durCode = DUR_CODE_MAP[alert.type] || alert.type;
  const durDisplay = DUR_DISPLAY_MAP[alert.type] || alert.type;

  const expressions: string[] = [`MedicationRequest.medication[${alert.ingredient}]`];
  if (alert.relatedIngredient) {
    expressions.push(`MedicationRequest.medication[${alert.relatedIngredient}]`);
  }

  return {
    severity: SEVERITY_MAP[alert.severity],
    code,
    details: {
      coding: [{
        system: 'urn:miryang-ortho:dur',
        code: durCode,
        display: durDisplay,
      }],
      text: alert.message,
    },
    diagnostics: alert.detail || undefined,
    expression: expressions,
  };
}

// ─── Drug → Medication ──────────────────────────────────

/**
 * HIRA 의약품 통합조회 결과 → FHIR Medication
 *
 * 외부 EMR에서 GET /api/fhir/Medication?code=성분명 으로 조회 시
 * 표준 FHIR Medication 리소스로 응답.
 */
export function drugLookupToMedication(
  lookup: EmrDrugLookupResult,
  drugName: string,
): FhirMedication {
  const ingr = lookup.ingredient;

  const medication: FhirMedication = {
    resourceType: 'Medication',
    id: ingr?.cpntCd || `drug-${drugName}`,
    status: 'active',
    code: {
      coding: [],
      text: drugName,
    },
  };

  // 성분 코드
  if (ingr?.cpntCd) {
    medication.code!.coding!.push({
      system: 'http://www.hl7korea.or.kr/CodeSystem/hira-drug-ingredient',
      code: ingr.cpntCd,
      display: ingr.cpntNm,
    });
  }

  // 영문명
  if (ingr?.cpntNmEng) {
    medication.code!.coding!.push({
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      display: ingr.cpntNmEng,
    });
  }

  // 제형
  if (ingr?.fomlNm) {
    medication.form = {
      text: ingr.fomlNm,
      coding: ingr.fomlCd
        ? [{ system: 'urn:miryang-ortho:drug-form', code: ingr.fomlCd, display: ingr.fomlNm }]
        : undefined,
    };
  }

  // 약효 분류 → ingredient (FHIR에서 ingredient는 성분 구성이지만, 약효 정보도 여기에 매핑)
  if (lookup.effects.length > 0) {
    medication.ingredient = lookup.effects.map(eff => ({
      itemCodeableConcept: {
        coding: [{
          system: 'http://www.hl7korea.or.kr/CodeSystem/hira-drug-effect',
          code: eff.meftDivNo,
          display: eff.meftDivNm,
        }],
        text: eff.meftDivNm,
      },
      isActive: true,
    }));
  }

  // DUR 플래그 → meta.tag
  if (lookup.durFlags.length > 0) {
    medication.meta = {
      tag: lookup.durFlags.map(flag => ({
        system: 'urn:miryang-ortho:dur-flag',
        code: DUR_CODE_MAP[flag] || flag,
        display: DUR_DISPLAY_MAP[flag] || flag,
      })),
    };
  }

  return medication;
}

// ─── Pharmacy → Organization ────────────────────────────

/**
 * HIRA 약국 정보 → FHIR Organization (type=pharmacy)
 *
 * 외부 EMR에서 처방전 연계 시 FHIR Organization 검색으로
 * 주변 약국을 표준 형식으로 받을 수 있음.
 */
export function pharmacyToOrganization(
  pharmacy: PharmacyDetailInfo,
): FhirOrganization {
  const org: FhirOrganization = {
    resourceType: 'Organization',
    id: pharmacy.ykiho,
    active: true,
    type: [
      {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'prov',
          display: 'Healthcare Provider',
        }],
        text: '약국',
      },
    ],
    name: pharmacy.yadmNm,
    address: [
      {
        use: 'work',
        text: pharmacy.addr,
        state: pharmacy.sidoCdNm,
        district: pharmacy.sgguCdNm,
      },
    ],
  };

  // Identifiers
  org.identifier = [
    {
      use: 'official',
      system: 'http://www.hl7korea.or.kr/NamingSystem/hira-institution',
      value: pharmacy.ykiho,
    },
  ];

  // Phone
  if (pharmacy.telno) {
    org.telecom = [
      { system: 'phone', value: pharmacy.telno, use: 'work' },
    ];
  }

  return org;
}

/**
 * 약국 영업시간 → FHIR-호환 확장 데이터
 * (FHIR Location.hoursOfOperation 매핑용 — Organization에 추가 가능)
 */
export function extractBusinessHours(pharmacy: PharmacyDetailInfo): Record<string, string>[] {
  const dayNames = ['', '월', '화', '수', '목', '금', '토', '일', '공휴일'];
  const hours: Record<string, string>[] = [];

  for (let i = 1; i <= 8; i++) {
    const start = (pharmacy as Record<string, unknown>)[`dutyTime${i}s`] as string | undefined;
    const close = (pharmacy as Record<string, unknown>)[`dutyTime${i}c`] as string | undefined;
    if (start && close) {
      hours.push({
        day: dayNames[i],
        openingTime: `${start.slice(0, 2)}:${start.slice(2)}`,
        closingTime: `${close.slice(0, 2)}:${close.slice(2)}`,
      });
    }
  }

  return hours;
}
