/**
 * GET /api/fhir/Organization — FHIR 표준 약국/기관 검색
 * Query: ?type=pharmacy&address-state=48&address-city=880&name=밀양
 *
 * HIRA 약국정보를 FHIR Organization 리소스 searchset Bundle로 반환.
 * 영업시간은 extension에 포함.
 *
 * Content-Type: application/fhir+json
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { searchPharmacyOrganizations } from '@/lib/fhir/hira-bridge';
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

    // FHIR 표준 파라미터명 매핑
    const sidoCd = searchParams.get('address-state') || searchParams.get('sidoCd') || undefined;
    const sgguCd = searchParams.get('address-city') || searchParams.get('sgguCd') || undefined;
    const yadmNm = searchParams.get('name') || searchParams.get('yadmNm') || undefined;
    const count = Number(searchParams.get('_count')) || 30;

    if (!sidoCd && !yadmNm) {
      return NextResponse.json(
        {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'required',
            diagnostics: 'address-state(시도코드) 또는 name(약국명) 중 하나가 필요합니다',
          }],
        },
        { status: 400, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
      );
    }

    const bundle = await searchPharmacyOrganizations({
      sidoCd,
      sgguCd,
      yadmNm,
      numOfRows: count,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'fhir_organization_pharmacy',
      documentId: yadmNm || `${sidoCd}-${sgguCd || 'all'}`,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `FHIR Organization(약국) 검색: ${yadmNm || sidoCd} (${bundle.total}건)`,
    });

    return NextResponse.json(bundle, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[FHIR/Organization] ${error.code}: ${error.message}`);
      return NextResponse.json(
        {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'fatal', code: 'exception', diagnostics: error.message }],
        },
        { status: error.statusCode, headers: { 'Content-Type': FHIR_CONTENT_TYPE } },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR/Organization] Error:', message);
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
