/**
 * GET /api/clinical/hira/non-payment — 비급여 종별 가격 조회
 * Query: npayKorCd (필수), pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { getNonPaymentCostsByClass } from '@/lib/hira/non-payment';
import { HiraError } from '@/types/hira';

export async function GET(req: NextRequest) {
  try {
    initAdmin();

    // Auth
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

    // Params
    const { searchParams } = new URL(req.url);
    const npayKorCd = searchParams.get('npayKorCd');
    if (!npayKorCd) {
      return NextResponse.json({ error: 'npayKorCd is required' }, { status: 400 });
    }

    const result = await getNonPaymentCostsByClass({
      npayKorCd,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_non_payment',
      documentId: npayKorCd,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `비급여 종별 가격 조회: ${npayKorCd}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleHiraError(error, 'non-payment');
  }
}

function handleHiraError(error: unknown, context: string) {
  if (error instanceof HiraError) {
    console.error(`[HIRA/${context}] ${error.code}: ${error.message}`);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[HIRA/${context}] Error:`, message);
  if (message.includes('Firebase ID token') || message.includes('Decoding')) {
    return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
