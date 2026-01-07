
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';
import { Lock, Mail, Loader2, UserPlus } from 'lucide-react';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
                // Creating user automatically signs them in
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push('/admin');
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.code === 'auth/weak-password') {
                setError('비밀번호는 6자리 이상이어야 합니다.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('이미 존재하는 이메일입니다.');
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else {
                setError('오류가 발생했습니다: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                        {isRegistering ? <UserPlus className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {isRegistering ? '초기 관리자 등록' : '관리자 로그인'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {isRegistering
                            ? '새로운 관리자 계정을 생성합니다.'
                            : 'Miryang OS Hospital 관리자 계정으로 접속하세요.'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-10 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 sm:text-sm"
                                    placeholder="admin@hospital.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-10 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center font-medium bg-red-50 dark:bg-red-900/20 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 transition-colors"
                    >
                        {loading && (
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        )}
                        {isRegistering ? '관리자 계정 생성' : '로그인'}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                            }}
                            className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        >
                            {isRegistering
                                ? '이미 계정이 있으신가요? 로그인하기'
                                : '초기 관리자 계정 생성하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
