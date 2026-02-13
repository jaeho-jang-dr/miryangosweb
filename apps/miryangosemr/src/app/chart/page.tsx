'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@shared/lib/firebase-clinical';
import { Patient } from '@shared/types/clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { Search, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ChartBrowserPage() {
  return (
    <EMRLayout>
      <ChartBrowserContent />
    </EMRLayout>
  );
}

function ChartBrowserContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPatients();
  }, []);

  const loadRecentPatients = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'patients'), orderBy('lastVisit', 'desc'), limit(50));
      const snap = await getDocs(q);
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Patient[]);
    } catch (e) {
      console.error('환자 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter(p =>
    p.name.includes(searchTerm) || p.phone?.includes(searchTerm) || p.birthDate?.includes(searchTerm)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">통합 차트</h1>
        <p className="text-sm text-slate-500">환자를 검색하여 전체 진료 이력을 확인하세요.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="환자 이름, 전화번호, 생년월일로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">이름</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">생년월일</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">전화번호</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">최근 방문</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">차트</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">검색 결과가 없습니다.</td></tr>
            ) : (
              filtered.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{patient.name}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.birthDate}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.phoneMasked || patient.phone}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {patient.lastVisit?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/chart/${patient.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                    >
                      <FileText className="w-3 h-3" /> 차트 보기 <ArrowRight className="w-3 h-3" />
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
