'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';
import { MessageSquare } from 'lucide-react';

interface SocialLoginProps {
    className?: string;
    onLoginSuccess?: () => void;
}

export function SocialLogin({ className, onLoginSuccess }: SocialLoginProps) {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            onLoginSuccess?.();
        } catch (error) {
            console.error("Login failed:", error);
            alert("로그인에 실패했습니다.");
        }
    };

    const handleKakaoLogin = () => {
        alert("카카오 로그인은 현재 준비 중입니다. 구글 로그인을 이용해주세요.");
    };

    const handleNaverLogin = () => {
        alert("네이버 로그인은 현재 준비 중입니다. 구글 로그인을 이용해주세요.");
    };

    return (
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
        </div>
    );
}
