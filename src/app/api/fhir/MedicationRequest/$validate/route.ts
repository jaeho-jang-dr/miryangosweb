/**
 * POST /api/fhir/MedicationRequest/$validate — FHIR 표준 DUR 처방 검증
 *
 * 외부 EMR에서 처방전 약물을 FHIR 형식으로 보내면
 * HIRA DUR 7종 일괄 체크 후 FHIR OperationOutcome으로 응답.
 *
 * Body:
 * {
 *   "medications": [
 *     { "name": "아세트아미노펜" },
 *     { "name": "이부프로펜", "code": "..." }
 *   ],
 *   "patientAge": 72,
 *   "isPregnant": false
 * }
 *
 * 또는 FHIR Bundle:
 * {
 *   "resourceType": "Bundle",
 *   "entry": [
 *     { "resource": { "resourceType": "MedicationRequest", "medicationCodeableConcept": { "text": "아세트아미노펜" } } }
 *   ]
 * }
 *
 * Response: FHIR OperationOutcome (Content-Type: application/fhir+json)
 *   - issue[].severity = "error"       → 처방 차단 (병용금기, 임부금기)
 *   - issue[].severity = "warning"     → 경고 (연령, 용량, 기간)
 *   - issue[].severity = "information" → 참고 (효능중복, 서방정)
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { validatePrescriptionDur, extractMedicationsFromRequests } from '@/lib/fhir/hira-bridge';
import { extractFromBundle } from '@/lib/fhir/bundle-builder';
import { HiraError } from '@/types/hira';
import type { FhirBundle, FhirMedicationRequest } from '@/types/fhir';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

export async function POST(req: NextRequest) {
  try {
    initAdmin();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!role || !['admin', 'manager', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'Clinical staff access required' }, { status: 403 });
    }

    const body = await req.json();

    let medications: { name: string; code?: string }[];
    let patientAge: number | undefined;
    let isPregnant: boolean | undefined;

    // 두 가지 입력 형식 지원: 간편 형식 / FHIR Bundle 형식
    if (body.resourceType === 'Bundle') {
      // FHIR Bundle에서 MedicationRequest 추출
      const mrList = extractFromBundle<FhirMedicationRequest>(body as FhirBundle, 'MedicationRequest');
      if (mrList.length === 0) {
        return NextResponse.json(
          { error: 'Bundle에 MedicationRequest 리소스가 없습니다' },
          { status: 400 },
        );
      }
      medications = extractMedicationsFromRequests(mrList);
      patientAge = body.patientAge;
      isPregnant = body.isPregnant;
    } else {
      // 간편 형식
      medications = body.medications;
      patientAge = body.patientAge;
      isPregnant = body.isPregnant;
    }

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { error: 'medications 배열이 필요합니다 (최소 1개 약물)' },
        { status: 400 },
      );
    }

    if (medications.length > 20) {
      return NextResponse.json(
        { error: '한 번에 최대 20개 약물까지 검증 가능합니다' },
        { status: 400 },
      );
    }

    const outcome = await validatePrescriptionDur({ medications, patientAge, isPregnant });

    const drugNames = medications.map(m => m.name).join(', ');
    const errorCount = outcome.issue.filter((i: { severity: string }) => i.severity === 'error').length;
    const warningCount = outcome.issue.filter((i: { severity: string }) => i.severity === 'warning').length;

    await writeAuditLog({
      action: 'read',
      collection: 'fhir_dur_validate',
      documentId: `validate-${medications.length}drugs`,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `FHIR DUR $validate (${medications.length}종): ${drugNames} → error:${errorCount} warning:${warningCount}`,
    });

    return NextResponse.json(outcome, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[FHIR/$validate] ${error.code}: ${error.message}`);
      return NextResponse.json(
        {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'fatal', code: 'exception', diagnostics: error.message }],
        },
        { status: error.statusCode, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR/$validate] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json(
      {
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'fatal', code: 'exception', diagnostics: message }],
      },
      { status: 500, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
    );
  }
}
