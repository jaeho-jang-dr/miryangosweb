/**
 * GET /api/clinical/hira/pharmacy — 약국 검색 + 상세(영업시간)
 * Query: type (basis|detail), yadmNm, sidoCd, sgguCd, ykiho, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { searchPharmacies, getPharmacyDetail } from '@/lib/hira/pharmacy-info';
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
    const type = searchParams.get('type') || 'basis';
    const params = {
      yadmNm: searchParams.get('yadmNm') || undefined,
      sidoCd: searchParams.get('sidoCd') || undefined,
      sgguCd: searchParams.get('sgguCd') || undefined,
      ykiho: searchParams.get('ykiho') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    };

    const result = type === 'detail'
      ? await getPharmacyDetail(params)
      : await searchPharmacies(params);

    await writeAuditLog({
      action: 'read',
      collection: 'hira_pharmacy',
      documentId: params.yadmNm || params.ykiho || 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `약국 ${type === 'detail' ? '상세' : '기본'} 조회: ${params.yadmNm || 'all'}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/pharmacy] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/pharmacy] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
