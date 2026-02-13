'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// TODO: 개발 완료 후 인증 로직 복원
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
