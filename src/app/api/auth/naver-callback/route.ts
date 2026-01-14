import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

// Naver OAuth configuration
const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET; // Add this to .env.local
const NAVER_CALLBACK_URL = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback`
    : 'http://localhost:3000/login/callback';

export async function POST(request: NextRequest) {
    try {
        const { code, state } = await request.json();

        if (!code || !state) {
            return NextResponse.json(
                { error: 'Code and state are required' },
                { status: 400 }
            );
        }

        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
            return NextResponse.json(
                { error: 'Naver OAuth credentials not configured' },
                { status: 500 }
            );
        }

        // Exchange code for access token
        const tokenResponse = await fetch(
            `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
        );

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`Naver token error: ${tokenData.error_description || tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        // Get user profile
        const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const profileData = await profileResponse.json();

        if (profileData.resultcode !== '00') {
            throw new Error(`Naver profile error: ${profileData.message}`);
        }

        const profile = profileData.response;
        const email = profile.email;
        const name = profile.name || profile.nickname || '네이버 사용자';
        const profileImage = profile.profile_image || '';
        const naverId = profile.id;

        // Initialize Firebase Admin
        initAdmin();
        const authAdmin = getAuth();
        const db = getFirestore();

        // Create or update user in Firebase Auth
        let firebaseUser;
        const uid = `naver_${naverId}`;

        try {
            firebaseUser = await authAdmin.getUser(uid);
        } catch (error) {
            // User doesn't exist, create new one
            firebaseUser = await authAdmin.createUser({
                uid: uid,
                email: email,
                displayName: name,
                photoURL: profileImage,
                emailVerified: true,
            });
        }

        // Store user data in Firestore
        await db.collection('users').doc(firebaseUser.uid).set({
            email: email,
            displayName: name,
            photoURL: profileImage || null,
            provider: 'naver',
            role: 'user',
            createdAt: new Date(),
            lastLoginAt: new Date(),
        }, { merge: true });

        // Create custom token
        const customToken = await authAdmin.createCustomToken(firebaseUser.uid);

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
        console.error('Naver callback error:', error);
        return NextResponse.json(
            { error: error.message || 'Naver login failed' },
            { status: 500 }
        );
    }
}
