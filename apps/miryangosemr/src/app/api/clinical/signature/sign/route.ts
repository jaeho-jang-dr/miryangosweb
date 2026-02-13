import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { signVisitRecord } from '@shared/lib/digital-signature';
import { writeAuditLog } from '@shared/lib/audit-logger';

/**
 * POST /api/clinical/signature/sign — Sign a completed visit record
 * Body: { visitId: string }
 * Returns: { signature, publicKey, signedFields, signedAt }
 */
export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);

    // Check role — only clinical staff can sign
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!role || !['admin', 'manager', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'Clinical staff access required' }, { status: 403 });
    }

    const { visitId } = await req.json();
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    // Fetch visit data
    const visitDoc = await db.collection('visits').doc(visitId).get();
    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = { id: visitDoc.id, ...visitDoc.data() } as Record<string, unknown>;

    // Sign
    const result = await signVisitRecord(visitData, decoded.uid);

    // Save signature to visit document
    await db.collection('visits').doc(visitId).update({
      signature: {
        signerId: decoded.uid,
        signerName: decoded.name || decoded.email || decoded.uid,
        algorithm: result.algorithm,
        signature: result.signature,
        publicKey: result.publicKey,
        signedAt: new Date(),
        signedFields: result.signedFields,
      },
    });

    // Audit log
    await writeAuditLog({
      action: 'sign',
      collection: 'visits',
      documentId: visitId,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: '전자서명 완료',
      metadata: { signedFields: result.signedFields },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Signature/Sign API] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
