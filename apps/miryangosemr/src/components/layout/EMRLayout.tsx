'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import WorkflowToastContainer from '@/components/clinical/WorkflowToast';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import clsx from 'clsx';
import { AdminAuthProvider, useAdminAuth } from '@shared/contexts/admin-auth-context';
import { useAdminRole } from '@shared/hooks/useAdminRole';
import { useWorkflowEngine } from '@shared/hooks/useWorkflowEngine';
import { useSessionTimeout } from '@shared/hooks/useSessionTimeout';

export default function EMRLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <EMRLayoutContent>{children}</EMRLayoutContent>
    </AdminAuthProvider>
  );
}

function EMRLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAdminAuth();
  const { role, loading: roleLoading, isAdmin, isManager, isOperator } = useAdminRole();
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

  // 임상 스태프(admin/manager/operator)만 접근 허용
  const isClinicalStaff = isAdmin || isManager || isOperator;

  // 워크플로우 엔진: 권한 로딩 완료 후 임상 스태프에게만 활성화
  const { toasts, removeToast } = useWorkflowEngine({ enabled: !roleLoading && isClinicalStaff });

  // 세션 타임아웃: 30분 비활동 시 자동 로그아웃 (5분 전 경고)
  const { showWarning, remainingSeconds, dismissWarning } = useSessionTimeout(
    () => signOut(),
    30 * 60 * 1000, // 30분
    5 * 60 * 1000,  // 5분 전 경고
  );

  // 권한 로딩 중 스피너
  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 로그인은 됐지만 임상 스태프 권한이 없는 경우
  if (user && !isClinicalStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한 없음</h2>
          <p className="text-slate-500 mb-1">EMR 시스템은 의료진만 사용할 수 있습니다.</p>
          <p className="text-sm text-slate-400 mb-6">
            현재 역할:{' '}
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{role || 'none'}</span>
          </p>
          <p className="text-xs text-slate-400 mb-6">
            관리자에게 admin, manager, 또는 operator 역할을 요청하세요.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={signOut}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopBar user={user} sidebarCollapsed={sidebarCollapsed} onSignOut={signOut} />
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

      {/* 세션 만료 경고 모달 */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">세션 만료 예정</h3>
            <p className="text-slate-500 text-sm mb-1">
              보안을 위해 {Math.floor(remainingSeconds / 60)}분 {remainingSeconds % 60}초 후 자동 로그아웃됩니다.
            </p>
            <p className="text-xs text-slate-400 mb-6">의료법 제23조 — 비활동 세션 보호</p>
            <button
              onClick={dismissWarning}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
            >
              계속 사용
            </button>
          </div>
        </div>
      )}

      <WorkflowToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
