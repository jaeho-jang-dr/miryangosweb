'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import Link from 'next/link';
import {
  Settings, Building2, UserCog, Shield, Wifi, HardDrive,
  Stethoscope, CreditCard, Database, Trash2,
} from 'lucide-react';

export default function SetupPage() {
  return <EMRLayout><SetupContent /></EMRLayout>;
}

const settingsCategories = [
  {
    title: '기관 설정',
    items: [
      { href: '/setup/hospital', label: '병원정보', desc: '명칭, 기호, 주소, 계좌, 대표자', icon: Building2, color: 'bg-blue-100 text-blue-600' },
      { href: '/setup/doctors', label: '의사 관리', desc: '의사코드, 면허번호, 전문의', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-600' },
    ],
  },
  {
    title: '보험/청구 설정',
    items: [
      { href: '/setup/insurance', label: '보험 설정', desc: '본인부담율, 절사, 가산율', icon: CreditCard, color: 'bg-purple-100 text-purple-600' },
      { href: '/setup/edi', label: 'EDI 설정', desc: 'HIRA 심평원 전송 설정', icon: Wifi, color: 'bg-orange-100 text-orange-600' },
    ],
  },
  {
    title: '시스템 관리',
    items: [
      { href: '/setup/security', label: '보안 설정', desc: '사용자 인증, 접근 제어', icon: Shield, color: 'bg-red-100 text-red-600' },
      { href: '/setup/backup', label: '백업/복원', desc: '데이터 백업, 복원 관리', icon: HardDrive, color: 'bg-slate-100 text-slate-600' },
    ],
  },
  {
    title: '개발/테스트',
    items: [
      { href: '/setup/seed', label: '테스트 데이터', desc: '더미 환자/진료 데이터 생성', icon: Database, color: 'bg-amber-100 text-amber-600' },
    ],
  },
];

function SetupContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" /> 환경설정
        </h1>
        <p className="text-sm text-slate-500 mt-1">병원 운영에 필요한 설정을 관리합니다.</p>
      </div>

      {settingsCategories.map((cat) => (
        <div key={cat.title}>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{cat.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cat.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
