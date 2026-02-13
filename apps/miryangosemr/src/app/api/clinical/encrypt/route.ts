import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@shared/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { encrypt, decrypt, maskRRN, maskPhone } from '@shared/lib/crypto';

/**
 * POST /api/clinical/encrypt — Encrypt a field value
 * Body: { plaintext: string, fieldName: 'rrn' | 'phone' }
 * Returns: { encrypted: EncryptedField, masked: string }
 */
export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // Verify Firebase Auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);

    const { plaintext, fieldName } = await req.json();

    if (!plaintext || typeof plaintext !== 'string') {
      return NextResponse.json({ error: 'plaintext is required' }, { status: 400 });
    }
    if (!fieldName || !['rrn', 'phone'].includes(fieldName)) {
      return NextResponse.json({ error: 'fieldName must be "rrn" or "phone"' }, { status: 400 });
    }

    const encrypted = encrypt(plaintext);
    const masked = fieldName === 'rrn' ? maskRRN(plaintext) : maskPhone(plaintext);

    return NextResponse.json({ encrypted, masked, encryptedBy: decoded.uid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Encrypt API] Error:', message);

    if (message.includes('ENCRYPTION_MASTER_KEY')) {
      return NextResponse.json({ error: 'Server encryption not configured' }, { status: 500 });
    }
    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/clinical/encrypt — Decrypt a field value (admin only)
 * Body: { encrypted: EncryptedField }
 * Returns: { plaintext: string }
 */
export async function PUT(req: NextRequest) {
  try {
    initAdmin();

    // Verify Firebase Auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);

    // Check admin role
    const userDoc = await getFirestore().collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required for decryption' }, { status: 403 });
    }

    const { encrypted } = await req.json();
    if (!encrypted?.ciphertext || !encrypted?.iv || !encrypted?.tag) {
      return NextResponse.json({ error: 'Invalid encrypted field format' }, { status: 400 });
    }

    const plaintext = decrypt(encrypted);
    return NextResponse.json({ plaintext, decryptedBy: decoded.uid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Decrypt API] Error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
