'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import PrescriptionModule from '@/components/clinical/PrescriptionModule';
import { ArrowLeft, Trash2, Send } from 'lucide-react';
import Link from 'next/link';

export default function NewPrescriptionPage() {
  return <EMRLayout><NewPrescriptionContent /></EMRLayout>;
}

function NewPrescriptionContent() {
  const [orders, setOrders] = useState<string[]>([]);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const handleAddOrder = (orderText: string) => {
    setOrders(prev => [...prev, orderText]);
  };

  const handleRemoveOrder = (index: number) => {
    setOrders(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prescription" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">새 처방전</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient & Diagnosis */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800">환자 정보</h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">환자 이름</label>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="환자 이름 입력"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">진단명</label>
              <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="진단명 (예: M54.5 요통)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>

          {/* Current Orders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">처방 목록 ({orders.length}건)</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">우측에서 약물을 검색하여 추가하세요.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-700">{order}</span>
                    <button onClick={() => handleRemoveOrder(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            {orders.length > 0 && (
              <button className="w-full mt-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> 처방전 저장
              </button>
            )}
          </div>
        </div>

        {/* Drug Search */}
        <PrescriptionModule onAddOrder={handleAddOrder} />
      </div>
    </div>
  );
}
