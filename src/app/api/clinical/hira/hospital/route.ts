/**
 * GET /api/clinical/hira/hospital — 의료기관 검색
 * Query: yadmNm, clCd, sidoCd, sgguCd, dgsbjtCd, ykiho, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { searchHospitals } from '@/lib/hira/hospital-info';
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

    const result = await searchHospitals({
      yadmNm: searchParams.get('yadmNm') || undefined,
      clCd: searchParams.get('clCd') || undefined,
      sidoCd: searchParams.get('sidoCd') || undefined,
      sgguCd: searchParams.get('sgguCd') || undefined,
      dgsbjtCd: searchParams.get('dgsbjtCd') || undefined,
      ykiho: searchParams.get('ykiho') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_hospital',
      documentId: searchParams.get('yadmNm') || searchParams.get('ykiho') || 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `의료기관 검색: ${searchParams.get('yadmNm') || searchParams.get('ykiho') || 'all'}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/hospital] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/hospital] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
