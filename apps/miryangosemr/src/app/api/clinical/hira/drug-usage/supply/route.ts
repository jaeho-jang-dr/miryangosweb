/**
 * GET /api/clinical/hira/drug-usage/supply — 의약품 공급 통계
 * Query: mdcinCpntNm, mdcinPrductNm, gnlNmCd, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { getDrugSupplyInfo } from '@shared/lib/hira/drug-usage';
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

    const result = await getDrugSupplyInfo({
      mdcinCpntNm: searchParams.get('mdcinCpntNm') || undefined,
      mdcinPrductNm: searchParams.get('mdcinPrductNm') || undefined,
      gnlNmCd: searchParams.get('gnlNmCd') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_drug_supply',
      documentId: searchParams.get('mdcinCpntNm') || searchParams.get('mdcinPrductNm') || 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `의약품 공급통계 조회: ${searchParams.get('mdcinCpntNm') || 'all'}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/drug-supply] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/drug-supply] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
