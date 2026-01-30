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

    // 개선된 카카오 로그인 핸들러
    const handleKakaoLogin = async () => {
        if (isLoading) return;

        if (!kakaoLoaded || !window.Kakao) {
            alert("카카오 로그인을 준비 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
            alert("카카오 API 키가 설정되지 않았습니다.");
            return;
        }

        // Kakao SDK 초기화
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
        }

        setIsLoading(true);

        try {
            // 카카오 로그인 실행
            window.Kakao.Auth.login({
                success: async (authObj: any) => {
                    try {
                        // 사용자 정보 가져오기
                        window.Kakao.API.request({
                            url: '/v2/user/me',
                            success: async (res: any) => {
                                const { id, kakao_account } = res;
                                const profile = kakao_account?.profile || {};

                                // Firebase 백엔드로 전송
                                const response = await fetch('/api/auth/social-login', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        provider: 'kakao',
                                        uid: `kakao_${id}`,
                                        email: kakao_account?.email || `kakao_${id}@kakao.local`,
                                        displayName: profile?.nickname || '카카오 사용자',
                                        photoURL: profile?.profile_image_url || '',
                                    }),
                                });

                                const data = await response.json();

                                if (data.success && data.customToken) {
                                    await signInWithCustomToken(auth, data.customToken);
                                    onLoginSuccess?.();
                                } else {
                                    throw new Error(data.error || '로그인 처리 실패');
                                }
                                setIsLoading(false);
                            },
                            fail: (error: any) => {
                                console.error('사용자 정보 가져오기 실패:', error);
                                alert("카카오 사용자 정보를 가져올 수 없습니다.");
                                setIsLoading(false);
                            }
                        });
                    } catch (error: any) {
                        console.error("카카오 로그인 처리 오류:", error);
                        alert(`오류: ${error.message}`);
                        setIsLoading(false);
                    }
                },
                fail: (err: any) => {
                    console.error("카카오 로그인 실패:", err);
                    console.error("에러 상세:", JSON.stringify(err, null, 2));

                    // 에러 메시지 구성
                    let errorMsg = "카카오 로그인에 실패했습니다.";
                    if (err?.error) {
                        errorMsg += `\n\n오류: ${err.error}`;
                    }
                    if (err?.error_description) {
                        errorMsg += `\n상세: ${err.error_description}`;
                    }

                    alert(errorMsg + "\n\n카카오 개발자 콘솔에서 설정을 확인해주세요.");
                    setIsLoading(false);
                },
            });
        } catch (error: any) {
            console.error("카카오 로그인 오류:", error);
            alert(`카카오 로그인 오류: ${error.message}`);
            setIsLoading(false);
        }
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
            {/* Kakao SDK 로드 */}
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

            {/* Naver SDK 로드 */}
            <Script
                src="https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js"
                strategy="lazyOnload"
                onLoad={() => setNaverLoaded(true)}
            />

            <div className={`flex flex-col gap-3 w-full max-w-xs mx-auto ${className}`}>
                {/* 구글 로그인 */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    구글 계정으로 시작하기
                </button>

                {/* 카카오 로그인 - 개선됨 */}
                <button
                    onClick={handleKakaoLogin}
                    disabled={isLoading || !kakaoLoaded}
                    className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MessageSquare className="w-5 h-5 fill-current" />
                    카카오톡으로 시작하기
                </button>

                {/* 네이버 로그인 */}
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
