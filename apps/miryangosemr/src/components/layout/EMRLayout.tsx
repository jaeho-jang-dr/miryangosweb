'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import WorkflowToastContainer from '@/components/clinical/WorkflowToast';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import clsx from 'clsx';

export default function EMRLayout({ children }: { children: React.ReactNode }) {
  return <EMRLayoutContent>{children}</EMRLayoutContent>;
}

function EMRLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading, signOutUser, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated (in useEffect to avoid setState during render)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-3">인증 확인중...</p>
        </div>
      </div>
    );
  }

  // Show spinner while redirecting to login
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check permissions
  if (!hasPermission(pathname)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <TopBar user={user.firebaseUser} sidebarCollapsed={sidebarCollapsed} onSignOut={signOutUser} userName={user.displayName || user.email?.split('@')[0] || ''} userRole={user.role} />
        <main className={clsx('pt-14 min-h-screen transition-all duration-200', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
          <div className="p-6">
            <div className="max-w-md mx-auto text-center py-20">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">접근 권한 없음</h2>
              <p className="text-sm text-slate-500 mb-4">이 페이지에 접근할 권한이 없습니다.</p>
              <button onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
                대시보드로 이동
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopBar user={user.firebaseUser} sidebarCollapsed={sidebarCollapsed} onSignOut={signOutUser} userName={user.displayName || user.email?.split('@')[0] || ''} userRole={user.role} />
      <main
        className={clsx(
          'pt-14 min-h-screen transition-all duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
      <WorkflowToastContainer toasts={[]} onRemove={() => {}} />
    </div>
  );
}
