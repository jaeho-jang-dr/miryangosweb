import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { writeAuditLog } from '@/lib/audit-logger';
import { getPatientAsFhir, upsertPatientFromFhir } from '@/lib/fhir';
import { patientToFhir } from '@/lib/fhir';
import { buildSearchsetBundle } from '@/lib/fhir';
import type { Patient } from '@/types/clinical';
import type { FhirPatient, FhirResource } from '@/types/fhir';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

async function authenticateClinicalStaff(req: NextRequest) {
  initAdmin();
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization token', 401);
  }
  const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(decoded.uid).get();
  const role = userDoc.data()?.role;
  if (!role || !['admin', 'manager', 'operator'].includes(role)) {
    throw new AuthError('Clinical staff access required', 403);
  }
  return { decoded, db, role };
}

class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * GET /api/fhir/Patient — Search patients
 * Query: ?name=홍길동&_count=20
 */
export async function GET(req: NextRequest) {
  try {
    const { decoded, db } = await authenticateClinicalStaff(req);
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const count = parseInt(searchParams.get('_count') ?? '20', 10);

    let query: FirebaseFirestore.Query = db.collection('patients');

    if (name) {
      query = query.where('name', '==', name);
    }

    query = query.limit(count);
    const snapshot = await query.get();

    const resources: FhirResource[] = snapshot.docs.map((doc) => {
      const patient = { id: doc.id, ...doc.data() } as Patient;
      return patientToFhir(patient);
    });

    const bundle = buildSearchsetBundle(resources, snapshot.size);

    await writeAuditLog({
      action: 'read',
      collection: 'patients',
      documentId: 'search',
      userId: decoded.uid,
      userEmail: decoded.email || undefined,
      description: `FHIR Patient 검색: ${snapshot.size}건`,
      metadata: { name, count },
    });

    return NextResponse.json(bundle, {
      headers: { 'Content-Type': FHIR_CONTENT_TYPE },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

/**
 * POST /api/fhir/Patient — Create a patient from FHIR
 * Body: FHIR Patient resource
 */
export async function POST(req: NextRequest) {
  try {
    const { decoded } = await authenticateClinicalStaff(req);
    const fhirPatient: FhirPatient = await req.json();

    if (fhirPatient.resourceType !== 'Patient') {
      return NextResponse.json(
        { error: 'Expected resourceType: Patient' },
        { status: 400 },
      );
    }

    const patientId = await upsertPatientFromFhir(fhirPatient, decoded.uid);
    const created = await getPatientAsFhir(patientId);

    return NextResponse.json(created, {
      status: 201,
      headers: {
        'Content-Type': FHIR_CONTENT_TYPE,
        Location: `/api/fhir/Patient/${patientId}`,
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[FHIR Patient] Error:', message);
  if (message.includes('Firebase ID token') || message.includes('Decoding')) {
    return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
