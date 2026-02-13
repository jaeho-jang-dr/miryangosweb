import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyBackup } from '@shared/lib/backup';

/**
 * POST /api/clinical/backup/verify — Verify a backup (admin only)
 * Body: { backupId: string, sampleSize?: number }
 */
export async function POST(req: NextRequest) {
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
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { backupId, sampleSize } = await req.json();
    if (!backupId) {
      return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
    }

    const verification = await verifyBackup(backupId, sampleSize ?? 3);

    return NextResponse.json({
      success: true,
      verified: verification.mismatches.length === 0,
      verification,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Backup Verify API] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
