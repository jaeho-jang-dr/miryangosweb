'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@shared/contexts/admin-auth-context';
import { useAdminRole } from '@shared/hooks/useAdminRole';
import { useWorkflowEngine } from '@shared/hooks/useWorkflowEngine';
import { useSessionTimeout } from '@shared/hooks/useSessionTimeout';
import { logAudit } from '@shared/lib/audit-client';
import WorkflowToastContainer from '@/components/clinical/WorkflowToast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export default function EMRLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <EMRLayoutContent>{children}</EMRLayoutContent>
    </AdminAuthProvider>
  );
}

function EMRLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, signOut: rawSignOut } = useAdminAuth();

  const signOut = useCallback(() => {
    if (user) {
      logAudit({
        action: 'logout',
        collection: 'auth',
        documentId: user.uid,
        description: `로그아웃: ${user.email}`,
      });
    }
    rawSignOut();
  }, [user, rawSignOut]);
  const { role, loading: roleLoading, isAdmin, isManager, isOperator } = useAdminRole();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isClinicalStaff = isAdmin || isManager || isOperator;

  // Workflow engine
  const { toasts, removeToast } = useWorkflowEngine({ enabled: !roleLoading && isClinicalStaff });

  // Session timeout: 30min idle → auto logout (warning 5min before)
  const { showWarning, remainingSeconds, dismissWarning } = useSessionTimeout(
    () => signOut(),
    30 * 60 * 1000,
    5 * 60 * 1000,
  );

  // Loading state
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

  // Not authenticated → redirect to login
  if (!user) {
    if (pathname !== '/login') {
      router.push('/login');
    }
    return null;
  }

  // Authenticated but no clinical access
  if (user && !isClinicalStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한 없음</h2>
          <p className="text-slate-500 mb-1">EMR 시스템은 의료진만 사용할 수 있습니다.</p>
          <p className="text-sm text-slate-400 mb-6">
            현재 역할: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{role || 'none'}</span>
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* TopBar */}
      <TopBar user={user} sidebarCollapsed={sidebarCollapsed} onSignOut={signOut} />

      {/* Main Content */}
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

      {/* Session Timeout Warning */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">세션 만료 예정</h3>
            <p className="text-slate-500 text-sm mb-1">
              {Math.floor(remainingSeconds / 60)}분 {remainingSeconds % 60}초 후 자동 로그아웃됩니다.
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

      {/* Workflow Toasts */}
      <WorkflowToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
