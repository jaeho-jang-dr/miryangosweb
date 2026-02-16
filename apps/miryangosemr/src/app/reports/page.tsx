'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import {
  FileText, Building2, ShieldAlert, ClipboardList,
  ArrowRight, Download, Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  return <EMRLayout><ReportsContent /></EMRLayout>;
}

const REPORT_CATEGORIES = [
  {
    title: '국세청 제출',
    description: '의료비 수납내역 국세청 제출용 자료',
    icon: Building2,
    href: '/reports/tax-submission',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    iconColor: 'text-blue-500',
    features: ['연말정산 의료비 자료', '현금영수증 발급내역', '소득공제 대상액 산출'],
  },
  {
    title: '비급여 보고',
    description: '비급여 진료비용 공개 및 보고 자료',
    icon: ShieldAlert,
    href: '/reports/non-covered',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    iconColor: 'text-orange-500',
    features: ['비급여 항목별 가격 공개', '비급여 진료현황', '비급여 비율 분석'],
  },
  {
    title: '환자조사표',
    description: '의료기관 환자 조사 통계 보고서',
    icon: ClipboardList,
    href: '/reports/patient-survey',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    iconColor: 'text-purple-500',
    features: ['외래 환자 현황표', '보험유형별 환자 통계', '진료과별 환자 분포'],
  },
];

function ReportsContent() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-slate-600" /> 규제 보고서
        </h1>
        <p className="text-sm text-slate-500">국세청, 건강보험심사평가원 등 제출용 보고서를 생성합니다.</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_CATEGORIES.map(cat => (
          <Link key={cat.href} href={cat.href}
            className={`rounded-xl border p-6 hover:shadow-md transition-shadow ${cat.color}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                <cat.icon className={`w-6 h-6 ${cat.iconColor}`} />
              </div>
              <ArrowRight className="w-5 h-5 opacity-50" />
            </div>
            <h3 className="font-bold text-lg mb-1">{cat.title}</h3>
            <p className="text-sm opacity-80 mb-4">{cat.description}</p>
            <ul className="space-y-1">
              {cat.features.map((f, i) => (
                <li key={i} className="text-xs opacity-70 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-current" /> {f}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">빠른 내보내기</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/reports/tax-submission" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <Download className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-bold text-slate-800">연말정산 의료비 자료</p>
              <p className="text-xs text-slate-400">국세청 홈택스 제출용 CSV</p>
            </div>
          </Link>
          <Link href="/reports/non-covered" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <Download className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-bold text-slate-800">비급여 현황 보고</p>
              <p className="text-xs text-slate-400">건강보험심사평가원 제출용</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
