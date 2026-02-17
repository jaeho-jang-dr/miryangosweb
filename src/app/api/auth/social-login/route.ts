import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { provider, email, displayName, uid, photoURL } = await request.json();

    if (!provider || !email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Provider and valid email are required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    initAdmin();
    const auth = getAuth();
    const db = getFirestore();

    // Create or update user in Firebase Auth
    // 보안: 클라이언트 UID를 절대 신뢰하지 않음 — 서버에서 생성/조회
    let firebaseUser;
    try {
      // Try to get existing user by email
      firebaseUser = await auth.getUserByEmail(email);
    } catch (error) {
      // User doesn't exist, create new one with server-generated UID
      firebaseUser = await auth.createUser({
        // uid를 지정하지 않아 Firebase가 안전한 UID를 자동 생성
        email: email,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
        emailVerified: true, // Social logins are considered verified
      });
    }

    // Store user data in Firestore
    await db.collection('users').doc(firebaseUser.uid).set({
      email: email,
      displayName: displayName,
      photoURL: photoURL || null,
      provider: provider,
      role: 'user', // Default role
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }, { merge: true });

    // Create custom token for client-side auth
    const customToken = await auth.createCustomToken(firebaseUser.uid);

    return NextResponse.json({
      success: true,
      customToken: customToken,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }
    });

  } catch (error: any) {
    console.error('Social login error:', error);
    return NextResponse.json(
      { error: error.message || 'Social login failed' },
      { status: 500 }
    );
  }
}
