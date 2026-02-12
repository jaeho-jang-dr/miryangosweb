/**
 * GET /api/clinical/hira/emr/nearby-pharmacy — 주변 약국 조회 (처방전 연계)
 * Query: sidoCd (시도코드), sgguCd (시군구코드), yadmNm (약국명), numOfRows
 *
 * 영업시간 포함 약국 목록 + 현재 영업 중인 약국 수 추정 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { findNearbyPharmacies } from '@/lib/hira/emr-integration';
import { HiraError } from '@/types/hira';

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
    const sidoCd = searchParams.get('sidoCd') || undefined;
    const sgguCd = searchParams.get('sgguCd') || undefined;
    const yadmNm = searchParams.get('yadmNm') || undefined;
    const numOfRows = Number(searchParams.get('numOfRows')) || 30;

    if (!sidoCd && !yadmNm) {
      return NextResponse.json(
        { error: 'sidoCd(시도코드) 또는 yadmNm(약국명) 중 하나가 필요합니다' },
        { status: 400 },
      );
    }

    const result = await findNearbyPharmacies({ sidoCd, sgguCd, yadmNm, numOfRows });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_emr_nearby_pharmacy',
      documentId: yadmNm || `${sidoCd}-${sgguCd || 'all'}`,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `EMR 주변약국 조회: ${yadmNm || sidoCd} (${result.totalCount}건, 영업중 약 ${result.openNowEstimate}건)`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[EMR/nearby-pharmacy] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMR/nearby-pharmacy] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
