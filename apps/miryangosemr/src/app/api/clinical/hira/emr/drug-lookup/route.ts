/**
 * GET /api/clinical/hira/emr/drug-lookup — 의약품 통합 조회
 * Query: drugName (필수), drugCode (선택)
 *
 * 성분 상세 + 약효 분류 + 처방 통계 + DUR 해당유형 플래그를 한번에 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { lookupDrugForEmr } from '@shared/lib/hira/emr-integration';
import { HiraError } from '@shared/types/hira';

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
    const drugName = searchParams.get('drugName');
    const drugCode = searchParams.get('drugCode') || undefined;

    if (!drugName) {
      return NextResponse.json(
        { error: 'drugName(성분명) 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    const result = await lookupDrugForEmr(drugName, drugCode);

    await writeAuditLog({
      action: 'read',
      collection: 'hira_emr_drug_lookup',
      documentId: drugCode || drugName,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `EMR 의약품 통합조회: ${drugName} (DUR: ${result.durFlags.join(',') || 'none'})`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[EMR/drug-lookup] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMR/drug-lookup] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
