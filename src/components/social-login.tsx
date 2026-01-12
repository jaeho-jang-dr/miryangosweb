'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';
import { MessageSquare } from 'lucide-react';
import Script from 'next/script';
import { useState, useEffect } from 'react';

interface SocialLoginProps {
    className?: string;
    onLoginSuccess?: () => void;
}

declare global {
    interface Window {
        Kakao: any;
        naver: any;
    }
}

export function SocialLogin({ className, onLoginSuccess }: SocialLoginProps) {
    const [kakaoLoaded, setKakaoLoaded] = useState(false);
    const [naverLoaded, setNaverLoaded] = useState(false);

    // Initializer for Naver
    const initNaver = () => {
        if (window.naver && window.naver.LoginWithNaverId) {
            const naverLogin = new window.naver.LoginWithNaverId({
                clientId: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || "TEST_CLIENT_ID",
                callbackUrl: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback` : "http://localhost:3000/login/callback",
                isPopup: true,
                loginButton: { color: "green", type: 3, height: 50 }, // We won't use this button directly, but init requires it sometimes or we use custom button
            });
            naverLogin.init();
            setNaverLoaded(true);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            onLoginSuccess?.();
            // Google login automatically integrates with Firebase
        } catch (error: any) {
            console.error("Login failed:", error);
            if (error.code === 'auth/popup-closed-by-user') return;
            alert(`Google 로그인 실패: ${error.message}`);
        }
    };

    const handleKakaoLogin = () => {
        if (!kakaoLoaded || !window.Kakao) {
            alert("카카오 로그인 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
            alert(`[개발자 설정 필요]\n.env.local 파일에 NEXT_PUBLIC_KAKAO_JS_KEY 키를 설정해야 합니다.\n(Kakao Developers에서 JavaScript 키 발급 필요)`);
            return;
        }

        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
        }

        window.Kakao.Auth.login({
            success: function (authObj: any) {
                // Get User Info
                window.Kakao.API.request({
                    url: '/v2/user/me',
                    success: function(res: any) {
                        const kakaoAccount = res.kakao_account;
                        const nickname = kakaoAccount?.profile?.nickname || '카카오 사용자';
                        const email = kakaoAccount?.email || '';
                        
                        localStorage.setItem('localUser', JSON.stringify({
                            displayName: nickname,
                            email: email,
                            provider: 'kakao',
                            uid: 'kakao_' + res.id
                        }));
                        
                        onLoginSuccess?.();
                    },
                    fail: function(error: any) {
                        console.error('Kakao User Info Error:', error);
                        // Fallback even if profile fetch fails
                        localStorage.setItem('localUser', JSON.stringify({
                            displayName: '카카오 사용자',
                            email: '',
                            provider: 'kakao',
                            uid: 'kakao_unknown'
                        }));
                        onLoginSuccess?.();
                    }
                });
            },
            fail: function (err: any) {
                console.error("Kakao Login Error:", err);
                alert("카카오 로그인에 실패했습니다.");
            },
        });
    };

    const handleNaverLogin = () => {
        if (!process.env.NEXT_PUBLIC_NAVER_CLIENT_ID) {
            alert(`[개발자 설정 필요]\n.env.local 파일에 NEXT_PUBLIC_NAVER_CLIENT_ID 키를 설정해야 합니다.\n(Naver Developers에서 Client ID 발급 필요)`);
            return;
        }

        // Naver's custom login button trigger
        // The naver sdk usually attaches to an ID. We can simulate a click or use the URL.
        // Or we can simple open the popup window manually if SDK is tricky with custom buttons.
        // Recommended: Use the SDK authorized URL generation if available, or just use the hidden button click.

        // Simpler approach for custom button: manual pop-up window
        const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
        const callbackUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback` : window.location.origin + '/login/callback';
        const state = Math.random().toString(36).substr(2);

        const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;

        // Open popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
            naverAuthUrl,
            'naverloginpop',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );
    };

    return (
        <>
            {/* Load Kakao SDK (Legacy v1 for Popup support) */}
            <Script
                src="https://developers.kakao.com/sdk/js/kakao.min.js"
                strategy="lazyOnload"
                onLoad={() => {
                    setKakaoLoaded(true);
                    if (window.Kakao && !window.Kakao.isInitialized() && process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
                        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
                    }
                }}
            />
            {/* Load Naver SDK */}
            <Script
                src="https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js"
                strategy="lazyOnload"
                onLoad={() => {
                    setNaverLoaded(true);
                }}
            />

            <div className={`flex flex-col gap-3 w-full max-w-xs mx-auto ${className}`}>
                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    구글 계정으로 시작하기
                </button>
                <button
                    onClick={handleKakaoLogin}
                    className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <MessageSquare className="w-5 h-5 fill-current" />
                    카카오톡으로 시작하기
                </button>
                <button
                    onClick={handleNaverLogin}
                    className="w-full py-3 px-4 bg-[#03C75A] hover:bg-[#02b351] text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <span className="font-bold text-lg leading-none">N</span>
                    네이버로 시작하기
                </button>

                {(!process.env.NEXT_PUBLIC_KAKAO_JS_KEY || !process.env.NEXT_PUBLIC_NAVER_CLIENT_ID) && (
                    <div className="text-[10px] text-red-500 text-center mt-2 p-2 bg-red-50 rounded border border-red-100">
                        ⚠️ 개발자 모드: .env.local에 API Key 설정이 필요합니다.
                    </div>
                )}
            </div>
        </>
    );
}
