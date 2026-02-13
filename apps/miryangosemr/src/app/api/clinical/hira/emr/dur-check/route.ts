/**
 * POST /api/clinical/hira/emr/dur-check — 처방전 DUR 일괄 체크
 *
 * Body (JSON):
 * {
 *   "ingredients": [
 *     { "name": "아세트아미노펜" },
 *     { "name": "이부프로펜" },
 *     { "name": "록소프로펜", "code": "..." }
 *   ],
 *   "patientAge": 72,
 *   "isPregnant": false
 * }
 *
 * 7종 DUR 체크를 병렬 수행하고 심각도별(critical/warning/info) 분류 결과 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { performBatchDurCheck } from '@shared/lib/hira/emr-integration';
import { HiraError } from '@shared/types/hira';
import type { EmrDurCheckRequest } from '@shared/types/hira';

export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // ── 인증 ──
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

    // ── 요청 바디 파싱 ──
    const body: EmrDurCheckRequest = await req.json();

    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'ingredients 배열이 필요합니다 (최소 1개 약물)' },
        { status: 400 },
      );
    }

    if (body.ingredients.length > 20) {
      return NextResponse.json(
        { error: '한 번에 최대 20개 약물까지 체크 가능합니다' },
        { status: 400 },
      );
    }

    for (const ingr of body.ingredients) {
      if (!ingr.name || typeof ingr.name !== 'string') {
        return NextResponse.json(
          { error: '각 약물에 name(성분명) 필드가 필요합니다' },
          { status: 400 },
        );
      }
    }

    // ── DUR 일괄 체크 수행 ──
    const result = await performBatchDurCheck(body);

    // ── 감사 로그 ──
    const drugNames = body.ingredients.map(i => i.name).join(', ');
    await writeAuditLog({
      action: 'read',
      collection: 'hira_emr_dur_check',
      documentId: `batch-${body.ingredients.length}drugs`,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `EMR DUR 일괄체크 (${body.ingredients.length}종): ${drugNames} → ${result.totalAlerts}건 알림 (critical ${result.critical.length})`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[EMR/dur-check] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMR/dur-check] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
