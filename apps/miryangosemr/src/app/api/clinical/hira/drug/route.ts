/**
 * GET /api/clinical/hira/drug — 의약품 성분/약효 조회
 * Query: cpntCd, cpntNm, meftDivNo, type (ingredient|effect), pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { getDrugIngredients, getDrugEffects } from '@shared/lib/hira/drug-info';
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
    const type = searchParams.get('type') || 'ingredient';
    const params = {
      cpntCd: searchParams.get('cpntCd') || undefined,
      cpntNm: searchParams.get('cpntNm') || undefined,
      meftDivNo: searchParams.get('meftDivNo') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    };

    const result = type === 'effect'
      ? await getDrugEffects(params)
      : await getDrugIngredients(params);

    await writeAuditLog({
      action: 'read',
      collection: 'hira_drug',
      documentId: params.cpntCd || params.cpntNm || params.meftDivNo || 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `의약품 ${type === 'effect' ? '약효' : '성분'} 조회`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/drug] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/drug] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
