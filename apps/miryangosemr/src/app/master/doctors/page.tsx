'use client';
import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DoctorsPage() {
  return <EMRLayout><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex items-center gap-3"><Link href="/master" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link><h1 className="text-2xl font-bold text-slate-900">의사 관리</h1></div>
    <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-slate-400">의료진 정보 및 면허번호를 관리합니다.</div>
  </div></EMRLayout>;
}
