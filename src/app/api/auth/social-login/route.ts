import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

const ALLOWED_PROVIDERS = ['google', 'naver', 'kakao', 'github'] as const;
type AllowedProvider = typeof ALLOWED_PROVIDERS[number];

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { provider, email, displayName, uid, photoURL } = body as Record<string, unknown>;

    // 필수 필드 검증
    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'provider is required and must be a string' }, { status: 400 });
    }
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid is required and must be a string' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required and must be a string' }, { status: 400 });
    }

    // 허용된 provider 검증
    if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
      return NextResponse.json(
        { error: `provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // 이메일 형식 기본 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // UID 길이 제한 (Firebase 제한: 128자)
    if (uid.length > 128) {
      return NextResponse.json({ error: 'uid is too long' }, { status: 400 });
    }

    // photoURL 검증 (선택적)
    if (photoURL !== undefined && photoURL !== null && typeof photoURL !== 'string') {
      return NextResponse.json({ error: 'photoURL must be a string or null' }, { status: 400 });
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
    } catch {
      // User doesn't exist, create new one
      firebaseUser = await auth.createUser({
        // uid를 지정하지 않아 Firebase가 안전한 UID를 자동 생성
        email: email,
        displayName: typeof displayName === 'string' ? displayName : undefined,
        photoURL: typeof photoURL === 'string' && photoURL.length > 0 ? photoURL : undefined,
        emailVerified: true, // Social logins are considered verified
      });
    }

    // Store user data in Firestore (role 필드는 merge 시 기존 값 유지)
    const userRef = db.collection('users').doc(firebaseUser.uid);
    const userDoc = await userRef.get();

    const updateData: Record<string, unknown> = {
      email: email,
      displayName: typeof displayName === 'string' ? displayName : null,
      photoURL: typeof photoURL === 'string' && photoURL.length > 0 ? photoURL : null,
      provider: provider,
      lastLoginAt: FieldValue.serverTimestamp(),
    };

    // 신규 사용자에게만 기본 role과 createdAt 설정
    if (!userDoc.exists) {
      updateData.role = 'user';
      updateData.createdAt = FieldValue.serverTimestamp();
    }

    await userRef.set(updateData, { merge: true });

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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Social login failed';
    console.error('Social login error:', message);
    return NextResponse.json(
      { error: 'Social login failed' },
      { status: 500 }
    );
  }
}
