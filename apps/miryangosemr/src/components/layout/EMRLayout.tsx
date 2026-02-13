'use client';

import React, { useState } from 'react';
import WorkflowToastContainer from '@/components/clinical/WorkflowToast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import clsx from 'clsx';

// TODO: 개발 완료 후 인증 로직 복원
// import { AdminAuthProvider, useAdminAuth } from '@shared/contexts/admin-auth-context';
// import { useAdminRole } from '@shared/hooks/useAdminRole';
// import { useWorkflowEngine } from '@shared/hooks/useWorkflowEngine';
// import { useSessionTimeout } from '@shared/hooks/useSessionTimeout';

export default function EMRLayout({ children }: { children: React.ReactNode }) {
  return <EMRLayoutContent>{children}</EMRLayoutContent>;
}

function EMRLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopBar user={null} sidebarCollapsed={sidebarCollapsed} onSignOut={() => {}} />
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
