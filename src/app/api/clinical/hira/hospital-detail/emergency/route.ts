/**
 * GET /api/clinical/hira/hospital-detail/emergency — 응급의료 정보
 * Query: ykiho, sidoCd, sgguCd, clCd, yadmNm, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { getHospitalEmergencyInfo } from '@/lib/hira/hospital-detail';
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

    const result = await getHospitalEmergencyInfo({
      ykiho: searchParams.get('ykiho') || undefined,
      sidoCd: searchParams.get('sidoCd') || undefined,
      sgguCd: searchParams.get('sgguCd') || undefined,
      clCd: searchParams.get('clCd') || undefined,
      yadmNm: searchParams.get('yadmNm') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_hospital_emergency',
      documentId: searchParams.get('ykiho') || searchParams.get('yadmNm') || 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `응급의료 정보 조회: ${searchParams.get('yadmNm') || searchParams.get('sidoCd') || 'all'}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/hospital-emergency] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/hospital-emergency] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
