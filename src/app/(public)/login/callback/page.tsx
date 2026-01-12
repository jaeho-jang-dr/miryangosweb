'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
    interface Window {
        naver: any;
    }
}

export default function LoginCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('처리 중...');

    useEffect(() => {
        const initNaverLogin = () => {
            if (!window.naver || !window.naver.LoginWithNaverId) {
                return;
            }

            const naverLogin = new window.naver.LoginWithNaverId({
                clientId: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || "TEST_CLIENT_ID",
                callbackUrl: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback` : window.location.origin + '/login/callback',
                isPopup: false, // Callback page is not a popup usually, or it handles the popup closing
                callbackHandle: true
            });

            naverLogin.init();

            naverLogin.getLoginStatus(async function (status: boolean) {
                if (status) {
                    const email = naverLogin.user.getEmail();
                    const name = naverLogin.user.getName();
                    
                    console.log('Naver Login Success:', email, name);
                    
                    // Save to localStorage for client-side session handling
                    localStorage.setItem('localUser', JSON.stringify({
                        displayName: name,
                        email: email,
                        provider: 'naver',
                        uid: 'naver_' + email // Mock UID
                    }));

                    setStatus(`${name}님, 로그인 성공! 메인으로 이동합니다.`);
                    
                    // Note: Since we don't have a backend integration for Custom Auth Tokens yet,
                    // we cannot strictly sign in to Firebase here. 
                    // This is a placeholder for the successful OAuth flow.
                    
                    // If this was opened in a popup (which logic suggests it might be), close it and refresh opener
                    if (window.opener) {
                        alert(`네이버 로그인 성공!\n${name} (${email})`);
                        window.opener.location.reload();
                        window.close();
                    } else {
                        // Redirect to home after a short delay
                        setTimeout(() => {
                            router.push('/');
                        }, 1500);
                    }
                } else {
                    console.log("Naver Callback Error");
                    setStatus('로그인 정보 확인 실패. 다시 시도해주세요.');
                    setTimeout(() => {
                        router.push('/login');
                    }, 2000);
                }
            });
        };

        // If SDK is already loaded
        if (window.naver) {
            initNaverLogin();
        }
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <Script 
                src="https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js" 
                onLoad={() => {
                     // Trigger the effect if script loads after mount
                     window.dispatchEvent(new Event('naverLoaded'));
                }}
            />
            <div className="text-center p-8">
                <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-green-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">네이버 로그인</h2>
                <p className="text-gray-600">{status}</p>
            </div>
        </div>
    );
}
