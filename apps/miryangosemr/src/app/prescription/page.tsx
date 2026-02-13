'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@shared/lib/firebase-clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { Pill, Plus, Search, Printer } from 'lucide-react';
import Link from 'next/link';
import { startOfDay } from 'date-fns';

interface Prescription {
  id: string;
  visitId: string;
  patientName: string;
  prescription: string;
  diagnosis: string;
  date: Timestamp;
  status: string;
}

export default function PrescriptionListPage() {
  return <EMRLayout><PrescriptionListContent /></EMRLayout>;
}

function PrescriptionListContent() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const q = query(
        collection(db, 'visits'),
        where('date', '>=', Timestamp.fromDate(today)),
        orderBy('date', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const visits = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((v: any) => v.prescription) as Prescription[];
      setPrescriptions(visits);
    } catch (e) {
      console.error('처방전 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = prescriptions.filter(p =>
    p.patientName?.includes(searchTerm) || p.prescription?.includes(searchTerm)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">처방전 관리</h1>
          <p className="text-sm text-slate-500">오늘의 처방전을 조회하고 관리합니다.</p>
        </div>
        <Link href="/prescription/new" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> 새 처방전
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="환자 이름 또는 약물로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">환자</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">처방 내용</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">진단</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">출력</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">처방전이 없습니다.</td></tr>
            ) : (
              filtered.map(rx => (
                <tr key={rx.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{rx.patientName}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{rx.prescription}</td>
                  <td className="px-4 py-3 text-slate-500">{rx.diagnosis || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/prescription/${rx.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                      <Printer className="w-3 h-3" /> 상세
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
