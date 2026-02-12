import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { getPatientEncounters, getVisitAsFhir, createVisitFromFhir } from '@/lib/fhir';
import type { FhirBundle } from '@/types/fhir';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

async function authenticateClinicalStaff(req: NextRequest) {
  initAdmin();
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!role || !['admin', 'manager', 'operator'].includes(role)) {
      return { error: NextResponse.json({ error: 'Clinical staff access required' }, { status: 403 }) };
    }
    return { decoded, db };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 }) };
  }
}

/**
 * GET /api/fhir/Encounter — Search encounters
 * Query: ?patient=PATIENT_ID&_count=20
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateClinicalStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { decoded } = auth as { decoded: { uid: string; email?: string }; db: FirebaseFirestore.Firestore };

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patient parameter is required' },
        { status: 400 },
      );
    }

    const bundle = await getPatientEncounters(patientId);

    await writeAuditLog({
      action: 'read',
      collection: 'visits',
      documentId: 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `FHIR Encounter 검색: patient=${patientId}`,
    });

    return NextResponse.json(bundle, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR Encounter] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/fhir/Encounter — Create a visit from FHIR Bundle
 * Body: FHIR Bundle containing Encounter + related resources
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateClinicalStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { decoded } = auth as { decoded: { uid: string; email?: string }; db: FirebaseFirestore.Firestore };

  try {
    const bundle: FhirBundle = await req.json();

    if (bundle.resourceType !== 'Bundle') {
      return NextResponse.json(
        { error: 'Expected resourceType: Bundle' },
        { status: 400 },
      );
    }

    const visitId = await createVisitFromFhir(bundle, decoded.uid);
    const result = await getVisitAsFhir(visitId);

    return NextResponse.json(result, {
      status: 201,
      headers: {
        'Content-Type': FHIR_CONTENT_TYPE,
        Location: `/api/fhir/Encounter/${visitId}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FHIR Encounter] POST Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
