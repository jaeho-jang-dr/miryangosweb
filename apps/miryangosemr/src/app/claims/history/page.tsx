'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ClaimsHistoryPage() {
  return <EMRLayout><ClaimsHistoryContent /></EMRLayout>;
}

function ClaimsHistoryContent() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">청구 이력</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
        <p>청구 이력 추적은 HIRA API 연동 후 자동으로 업데이트됩니다.</p>
        <p className="text-sm mt-2">제출, 심사, 승인/반려 상태가 이곳에 표시됩니다.</p>
      </div>
    </div>
  );
}
