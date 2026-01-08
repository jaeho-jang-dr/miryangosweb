'use client';

import { SocialLogin } from '@/components/social-login';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next') || '/';
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.replace(nextUrl);
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router, nextUrl]);

    const handleLoginSuccess = () => {
        // Redirection handled by onAuthStateChanged
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">로그인</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        소셜 계정으로 간편하게 로그인하세요.
                    </p>
                </div>

                <SocialLogin onLoginSuccess={handleLoginSuccess} />

                <div className="mt-8 text-center text-xs text-slate-400">
                    로그인 시 개인정보 처리방침 및 이용약관에 동의하는 것으로 간주됩니다.
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
