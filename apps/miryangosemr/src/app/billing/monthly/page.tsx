'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function MonthlyBillingPage() {
  return <EMRLayout><MonthlyBillingContent /></EMRLayout>;
}

function MonthlyBillingContent() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">월간 수납 보고</h1>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-lg font-bold text-slate-900">{month}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
        <p>월간 수납 보고서는 Firestore 데이터 기반으로 자동 집계됩니다.</p>
        <p className="text-sm mt-2">일별 수납 데이터가 쌓이면 이곳에 월간 요약이 표시됩니다.</p>
      </div>
    </div>
  );
}
