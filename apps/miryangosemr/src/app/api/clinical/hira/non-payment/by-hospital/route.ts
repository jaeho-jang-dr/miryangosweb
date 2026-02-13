/**
 * GET /api/clinical/hira/non-payment/by-hospital — 비급여 병원별 가격 조회
 * Query: npayKorCd (필수), ykiho, sidoCd, sgguCd, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { getNonPaymentCostsByHospital } from '@shared/lib/hira/non-payment';
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
    const npayKorCd = searchParams.get('npayKorCd');
    if (!npayKorCd) {
      return NextResponse.json({ error: 'npayKorCd is required' }, { status: 400 });
    }

    const result = await getNonPaymentCostsByHospital({
      npayKorCd,
      ykiho: searchParams.get('ykiho') || undefined,
      sidoCd: searchParams.get('sidoCd') || undefined,
      sgguCd: searchParams.get('sgguCd') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_non_payment_hospital',
      documentId: npayKorCd,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `비급여 병원별 가격 조회: ${npayKorCd}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/non-payment/by-hospital] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/non-payment/by-hospital] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
