'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { Store, MapPin, Clock, Send } from 'lucide-react';

export default function PharmacyPage() {
  return <EMRLayout><PharmacyContent /></EMRLayout>;
}

function PharmacyContent() {
  const pharmacies = [
    { name: '밀양중앙약국', address: '밀양시 중앙로 123', phone: '055-351-1234', hours: '09:00-18:00', distance: '100m' },
    { name: '건강약국', address: '밀양시 상남면 45', phone: '055-351-5678', hours: '09:00-19:00', distance: '250m' },
    { name: '미래약국', address: '밀양시 내이동 67', phone: '055-352-9012', hours: '08:30-18:30', distance: '400m' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">약국 연동</h1>
        <p className="text-sm text-slate-500">근처 약국 목록 및 전자처방전 전송</p>
      </div>

      <div className="space-y-3">
        {pharmacies.map((pharmacy, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{pharmacy.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pharmacy.address}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pharmacy.hours}</span>
                  <span className="text-emerald-600 font-medium">{pharmacy.distance}</span>
                </div>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              <Send className="w-4 h-4" /> 처방전 전송
            </button>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        전자처방전 전송은 DUR 연동 시스템 구축 후 활성화됩니다. 현재는 약국 목록 조회만 가능합니다.
      </div>
    </div>
  );
}
