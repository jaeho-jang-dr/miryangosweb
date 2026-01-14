'use client';

import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';

export default function LoginCallbackPage() {
    const [status, setStatus] = useState('처리 중...');

    useEffect(() => {
        const handleNaverCallback = async () => {
            try {
                // Get code and state from URL
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');
                const error = params.get('error');

                if (error) {
                    throw new Error(error);
                }

                if (!code || !state) {
                    throw new Error('Invalid callback parameters');
                }

                // Verify state
                const savedState = sessionStorage.getItem('naver_state');
                if (state !== savedState) {
                    throw new Error('State mismatch - possible CSRF attack');
                }

                setStatus('네이버 사용자 정보 확인 중...');

                // Exchange code for token and get user info via backend
                const response = await fetch('/api/auth/naver-callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, state }),
                });

                const data = await response.json();

                if (!data.success || !data.customToken) {
                    throw new Error(data.error || 'Failed to process Naver login');
                }

                setStatus('Firebase 인증 중...');

                // Sign in to Firebase with custom token
                await signInWithCustomToken(auth, data.customToken);

                setStatus('로그인 성공! 메인으로 이동합니다...');

                // If this is a popup, close it and notify opener
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'NAVER_LOGIN_SUCCESS',
                    }, window.location.origin);
                    setTimeout(() => window.close(), 500);
                } else {
                    // If not a popup, redirect to home
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                }

            } catch (error: any) {
                console.error('Naver callback error:', error);
                setStatus(`로그인 실패: ${error.message}`);

                if (window.opener) {
                    window.opener.postMessage({
                        type: 'NAVER_LOGIN_FAILED',
                        error: error.message,
                    }, window.location.origin);
                    setTimeout(() => window.close(), 2000);
                } else {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                }
            }
        };

        handleNaverCallback();
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                <div className="mb-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-green-600">N</span>
                    </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">네이버 로그인</h2>
                <p className="text-gray-600">{status}</p>
                <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
            </div>
        </div>
    );
}
