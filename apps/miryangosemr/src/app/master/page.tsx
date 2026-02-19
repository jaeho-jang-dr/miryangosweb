'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { Database, DollarSign, Pill, Package, Building, UserCircle, Shield, ArrowRight, Layers, FileSearch } from 'lucide-react';
import Link from 'next/link';

const masterMenuItems = [
  { href: '/master/fee-schedule', label: '처방자료관리', desc: '처방코드, 수가, 약가, 치료재료 통합 관리 (Ichart 38컬럼)', icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
  { href: '/master/bundles', label: '묶음처방 관리', desc: '의사별 묶음처방 템플릿 관리', icon: Layers, color: 'bg-teal-50 text-teal-600' },
  { href: '/master/diagnosis', label: '병명자료 관리', desc: 'KCD 병명코드 조회 및 관리', icon: FileSearch, color: 'bg-amber-50 text-amber-600' },
  { href: '/master/drugs', label: '약품 관리', desc: '처방 가능 약품 목록 관리', icon: Pill, color: 'bg-purple-50 text-purple-600' },
  { href: '/master/materials', label: '재료 관리', desc: '의료 소모품 및 재료 관리', icon: Package, color: 'bg-orange-50 text-orange-600' },
  { href: '/master/departments', label: '진료과 설정', desc: '진료과목 및 코드 설정', icon: Building, color: 'bg-emerald-50 text-emerald-600' },
  { href: '/master/doctors', label: '의사 관리', desc: '의료진 정보 및 면허번호 관리', icon: UserCircle, color: 'bg-rose-50 text-rose-600' },
  { href: '/master/insurance', label: '보험 설정', desc: '보험 유형별 수가 적용 규칙', icon: Shield, color: 'bg-indigo-50 text-indigo-600' },
];

export default function MasterDataPage() {
  return <EMRLayout><MasterDataContent /></EMRLayout>;
}

function MasterDataContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">마스터데이터 관리</h1>
        <p className="text-sm text-slate-500">EMR 시스템 기초 데이터를 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masterMenuItems.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{item.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
