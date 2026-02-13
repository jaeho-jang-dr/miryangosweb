'use client';
import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DrugsPage() {
  return <EMRLayout><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex items-center gap-3"><Link href="/master" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link><h1 className="text-2xl font-bold text-slate-900">약품 관리</h1></div>
    <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-slate-400">처방 가능 약품 목록을 관리합니다. HIRA 약가 기준 데이터베이스와 연동됩니다.</div>
  </div></EMRLayout>;
}
