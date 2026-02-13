import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyVisitSignature } from '@shared/lib/digital-signature';

/**
 * POST /api/clinical/signature/verify — Verify a visit's digital signature
 * Body: { visitId: string }
 * Returns: { valid: boolean, signedAt, signerName, signedFields }
 */
export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);

    const { visitId } = await req.json();
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const db = getFirestore();
    const visitDoc = await db.collection('visits').doc(visitId).get();
    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = { id: visitDoc.id, ...visitDoc.data() } as Record<string, unknown>;
    const sig = visitData.signature as {
      signature: string;
      publicKey: string;
      signedFields: string[];
      signedAt: unknown;
      signerName: string;
      signerId: string;
    } | undefined;

    if (!sig) {
      return NextResponse.json({
        valid: false,
        reason: '이 진료 기록에는 전자서명이 없습니다.',
      });
    }

    const valid = verifyVisitSignature(
      visitData,
      sig.signature,
      sig.publicKey,
      sig.signedFields,
    );

    return NextResponse.json({
      valid,
      signedAt: sig.signedAt,
      signerName: sig.signerName,
      signerId: sig.signerId,
      signedFields: sig.signedFields,
      reason: valid ? '서명 검증 성공' : '서명 불일치 — 데이터 변조 가능성',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Signature/Verify API] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
