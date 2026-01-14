import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { provider, email, displayName, uid, photoURL } = await request.json();

    if (!provider || !uid) {
      return NextResponse.json(
        { error: 'Provider and UID are required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    initAdmin();
    const auth = getAuth();
    const db = getFirestore();

    // Create or update user in Firebase Auth
    let firebaseUser;
    try {
      // Try to get existing user
      firebaseUser = await auth.getUserByEmail(email);
    } catch (error) {
      // User doesn't exist, create new one
      firebaseUser = await auth.createUser({
        uid: uid,
        email: email,
        displayName: displayName,
        photoURL: photoURL,
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
