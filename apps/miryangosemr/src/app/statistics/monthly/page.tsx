'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MonthlyStatsPage() {
  return <EMRLayout><div className="max-w-4xl mx-auto space-y-6">
    <div className="flex items-center gap-3">
      <Link href="/statistics" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
      <h1 className="text-2xl font-bold text-slate-900">월별 리포트</h1>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
      월별 통계 요약이 표시됩니다. 일별 데이터가 쌓이면 자동 집계됩니다.
    </div>
  </div></EMRLayout>;
}
