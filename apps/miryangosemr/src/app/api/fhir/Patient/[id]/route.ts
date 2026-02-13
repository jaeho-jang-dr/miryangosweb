import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@shared/lib/audit-logger';
import { getPatientAsFhir, upsertPatientFromFhir } from '@shared/lib/fhir';
import type { FhirPatient } from '@shared/types/fhir';

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
 * GET /api/fhir/Patient/[id] — Get a single patient as FHIR
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authenticateClinicalStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { decoded } = auth as { decoded: { uid: string; email?: string }; db: FirebaseFirestore.Firestore };

  try {
    const fhirPatient = await getPatientAsFhir(id);

    await writeAuditLog({
      action: 'read',
      collection: 'patients',
      documentId: id,
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: 'FHIR Patient 조회',
    });

    return NextResponse.json(fhirPatient, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    console.error('[FHIR Patient/id] GET Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/fhir/Patient/[id] — Update a patient from FHIR
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authenticateClinicalStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { decoded } = auth as { decoded: { uid: string; email?: string }; db: FirebaseFirestore.Firestore };

  try {
    const fhirPatient: FhirPatient = await req.json();

    if (fhirPatient.resourceType !== 'Patient') {
      return NextResponse.json(
        { error: 'Expected resourceType: Patient' },
        { status: 400 },
      );
    }

    // Ensure the ID in the body matches the URL
    fhirPatient.id = id;

    const patientId = await upsertPatientFromFhir(fhirPatient, decoded.uid);
    const updated = await getPatientAsFhir(patientId);

    return NextResponse.json(updated, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    console.error('[FHIR Patient/id] PUT Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
