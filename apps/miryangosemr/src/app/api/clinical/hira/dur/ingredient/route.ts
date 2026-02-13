/**
 * GET /api/clinical/hira/dur/ingredient — DUR 성분 레벨 체크
 * Query: type (contraindication|age-taboo|pregnancy-taboo|dosage-caution|
 *              duration-caution|duplicate-efficacy|split-caution),
 *        ingrCode, ingrName, itemSeq, itemName, typeName, pageNo, numOfRows
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { durIngredientDispatch } from '@shared/lib/hira/dur-ingredient';
import { HiraError } from '@shared/types/hira';
import type { DurIngredientCheckType } from '@shared/types/hira';

const VALID_TYPES: DurIngredientCheckType[] = [
  'contraindication', 'age-taboo', 'pregnancy-taboo',
  'dosage-caution', 'duration-caution', 'duplicate-efficacy', 'split-caution',
];

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
    const type = (searchParams.get('type') || 'contraindication') as DurIngredientCheckType;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const handler = durIngredientDispatch[type];
    const result = await handler({
      ingrCode: searchParams.get('ingrCode') || undefined,
      ingrName: searchParams.get('ingrName') || undefined,
      itemSeq: searchParams.get('itemSeq') || undefined,
      itemName: searchParams.get('itemName') || undefined,
      typeName: searchParams.get('typeName') || undefined,
      pageNo: Number(searchParams.get('pageNo')) || 1,
      numOfRows: Number(searchParams.get('numOfRows')) || 10,
    });

    await writeAuditLog({
      action: 'read',
      collection: 'hira_dur_ingredient',
      documentId: searchParams.get('ingrName') || searchParams.get('itemName') || type,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `DUR 성분 ${type} 조회: ${searchParams.get('ingrName') || searchParams.get('itemName') || 'all'}`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof HiraError) {
      console.error(`[HIRA/dur-ingredient] ${error.code}: ${error.message}`);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HIRA/dur-ingredient] Error:', message);
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
