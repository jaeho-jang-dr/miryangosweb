'use client';

import { GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';
import { MessageSquare } from 'lucide-react';
import Script from 'next/script';
import { useState, useEffect, useRef } from 'react';

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
    const [isLoading, setIsLoading] = useState(false);
    const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
    const popupCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clean up message listener
            if (messageHandlerRef.current) {
                window.removeEventListener('message', messageHandlerRef.current);
                messageHandlerRef.current = null;
            }
            // Clean up interval
            if (popupCheckIntervalRef.current) {
                clearInterval(popupCheckIntervalRef.current);
                popupCheckIntervalRef.current = null;
            }
        };
    }, []);

    const handleGoogleLogin = async () => {
        if (isLoading) return;
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            onLoginSuccess?.();
        } catch (error: any) {
            console.error("Login failed:", error);
            if (error.code === 'auth/popup-closed-by-user') return;
            alert(`Google 로그인 실패: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKakaoLogin = async () => {
        if (isLoading) return;
        if (!kakaoLoaded || !window.Kakao) {
            alert("카카오 로그인 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
            alert(`카카오 JavaScript 키가 설정되지 않았습니다.`);
            return;
        }

        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
        }

        setIsLoading(true);

        window.Kakao.Auth.login({
            success: async function (authObj: any) {
                try {
                    // Get User Info
                    window.Kakao.API.request({
                        url: '/v2/user/me',
                        success: async function(res: any) {
                            try {
                                const kakaoAccount = res.kakao_account;
                                const nickname = kakaoAccount?.profile?.nickname || '카카오 사용자';
                                const email = kakaoAccount?.email || `kakao_${res.id}@kakao.local`;
                                const photoURL = kakaoAccount?.profile?.profile_image_url || '';

                                // Register with Firebase via backend
                                const response = await fetch('/api/auth/social-login', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        provider: 'kakao',
                                        uid: `kakao_${res.id}`,
                                        email: email,
                                        displayName: nickname,
                                        photoURL: photoURL,
                                    }),
                                });

                                const data = await response.json();

                                if (data.success && data.customToken) {
                                    // Sign in to Firebase with custom token
                                    await signInWithCustomToken(auth, data.customToken);
                                    onLoginSuccess?.();
                                } else {
                                    throw new Error(data.error || 'Failed to create Firebase session');
                                }
                            } catch (error: any) {
                                console.error("Kakao Firebase Integration Error:", error);
                                alert(`카카오 로그인 처리 중 오류: ${error.message}`);
                            } finally {
                                setIsLoading(false);
                            }
                        },
                        fail: function(error: any) {
                            console.error('Kakao User Info Error:', error);
                            alert("카카오 사용자 정보를 가져오는데 실패했습니다.");
                            setIsLoading(false);
                        }
                    });
                } catch (error: any) {
                    console.error("Kakao Login Error:", error);
                    alert(`카카오 로그인 오류: ${error.message}`);
                    setIsLoading(false);
                }
            },
            fail: function (err: any) {
                console.error("Kakao Login Error:", err);
                alert("카카오 로그인에 실패했습니다.");
                setIsLoading(false);
            },
        });
    };

    const handleNaverLogin = () => {
        if (isLoading) return;
        if (!process.env.NEXT_PUBLIC_NAVER_CLIENT_ID) {
            alert(`네이버 Client ID가 설정되지 않았습니다.`);
            return;
        }

        setIsLoading(true);

        const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
        const callbackUrl = process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback`
            : `${window.location.origin}/login/callback`;
        const state = Math.random().toString(36).substr(2);

        // Store state for verification
        sessionStorage.setItem('naver_state', state);

        const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;

        // Open popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            naverAuthUrl,
            'naverloginpop',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        // Clean up previous handlers if any
        if (messageHandlerRef.current) {
            window.removeEventListener('message', messageHandlerRef.current);
        }
        if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
        }

        // Listen for callback
        popupCheckIntervalRef.current = setInterval(() => {
            if (!popup || popup.closed) {
                if (popupCheckIntervalRef.current) {
                    clearInterval(popupCheckIntervalRef.current);
                    popupCheckIntervalRef.current = null;
                }
                setIsLoading(false);
            }
        }, 500);

        // Listen for message from callback window
        const messageHandler = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'NAVER_LOGIN_SUCCESS') {
                if (popupCheckIntervalRef.current) {
                    clearInterval(popupCheckIntervalRef.current);
                    popupCheckIntervalRef.current = null;
                }
                window.removeEventListener('message', messageHandler);
                messageHandlerRef.current = null;
                setIsLoading(false);
                onLoginSuccess?.();
            } else if (event.data.type === 'NAVER_LOGIN_FAILED') {
                if (popupCheckIntervalRef.current) {
                    clearInterval(popupCheckIntervalRef.current);
                    popupCheckIntervalRef.current = null;
                }
                window.removeEventListener('message', messageHandler);
                messageHandlerRef.current = null;
                setIsLoading(false);
                alert('네이버 로그인에 실패했습니다.');
            }
        };

        messageHandlerRef.current = messageHandler;
        window.addEventListener('message', messageHandler);
    };

    return (
        <>
            {/* Load Kakao SDK */}
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
                onLoad={() => setNaverLoaded(true)}
            />

            <div className={`flex flex-col gap-3 w-full max-w-xs mx-auto ${className}`}>
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    구글 계정으로 시작하기
                </button>

                <button
                    onClick={handleKakaoLogin}
                    disabled={isLoading || !kakaoLoaded}
                    className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MessageSquare className="w-5 h-5 fill-current" />
                    카카오톡으로 시작하기
                </button>

                <button
                    onClick={handleNaverLogin}
                    disabled={isLoading || !naverLoaded}
                    className="w-full py-3 px-4 bg-[#03C75A] hover:bg-[#02b351] text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="font-bold text-lg leading-none">N</span>
                    네이버로 시작하기
                </button>

                {isLoading && (
                    <div className="text-center text-sm text-gray-500 animate-pulse">
                        로그인 처리 중...
                    </div>
                )}
            </div>
        </>
    );
}
