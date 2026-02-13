'use client';
import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InsurancePage() {
  return <EMRLayout><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex items-center gap-3"><Link href="/master" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link><h1 className="text-2xl font-bold text-slate-900">보험 설정</h1></div>
    <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-slate-400">보험 유형별 수가 적용 규칙을 설정합니다. 건강보험 30%, 자동차보험 0%, 산재보험 0% 등의 본인부담률을 관리합니다.</div>
  </div></EMRLayout>;
}
