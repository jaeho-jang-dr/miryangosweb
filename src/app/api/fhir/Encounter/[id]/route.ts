import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { getVisitAsFhir } from '@/lib/fhir';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

/**
 * GET /api/fhir/Encounter/[id] — Get a single visit as FHIR Bundle
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    const bundle = await getVisitAsFhir(id);

    await writeAuditLog({
      action: 'read',
      collection: 'visits',
      documentId: id,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: 'FHIR Encounter 조회',
    });

    return NextResponse.json(bundle, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR Encounter/id] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
