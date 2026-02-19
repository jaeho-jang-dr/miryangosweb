/**
 * GET /api/fhir/Medication — FHIR 표준 의약품 조회
 * Query: ?code=록소프로펜 또는 ?code=성분코드
 *
 * HIRA 의약품 성분/약효/처방통계를 FHIR Medication 리소스로 반환.
 * 응답에 DUR 플래그가 meta.tag로 포함됨.
 *
 * Content-Type: application/fhir+json
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { lookupMedicationAsFhir } from '@/lib/fhir/hira-bridge';
import { buildSearchsetBundle } from '@/lib/fhir/bundle-builder';
import { HiraError } from '@/types/hira';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'required', diagnostics: 'code 파라미터(성분명)가 필요합니다' }],
        },
        { status: 400, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
      );
    }

    // 숫자로 시작하면 성분코드, 아니면 성분명
    const isCode = /^\d/.test(code);
    const medication = await lookupMedicationAsFhir(
      isCode ? '' : code,     // name (first param) - only meaningful when NOT a code
      isCode ? code : undefined,   // code (second param) - only when IS a code
    );

    const bundle = buildSearchsetBundle([medication], 1);

    await writeAuditLog({
      action: 'read',
      collection: 'fhir_medication',
      documentId: code,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `FHIR Medication 조회: ${code}`,
    });

    return NextResponse.json(bundle, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[FHIR/Medication] ${error.code}: ${error.message}`);
      return NextResponse.json(
        {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'fatal', code: 'exception', diagnostics: error.message }],
        },
        { status: error.statusCode, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR/Medication] Error:', message);
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
