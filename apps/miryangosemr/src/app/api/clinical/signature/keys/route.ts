import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getOrCreateUserKeys } from '@shared/lib/digital-signature';

/**
 * GET /api/clinical/signature/keys — Get the current user's public key
 * Returns: { publicKey: string }
 * (Private key is never exposed to the client)
 */
export async function GET(req: NextRequest) {
  try {
    initAdmin();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);

    const keys = await getOrCreateUserKeys(decoded.uid);

    // Only return the public key
    return NextResponse.json({
      publicKey: keys.publicKey,
      userId: decoded.uid,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Signature/Keys API] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
