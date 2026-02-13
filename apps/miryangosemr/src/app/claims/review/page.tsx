'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ClaimsReviewPage() {
  return <EMRLayout><ClaimsReviewContent /></EMRLayout>;
}

function ClaimsReviewContent() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">제출 전 검토</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
        <p>작성 완료된 청구서를 제출 전 최종 검토합니다.</p>
        <p className="text-sm mt-2">DUR 검증, 수가 코드 확인, XML 미리보기 등을 수행합니다.</p>
      </div>
    </div>
  );
}
