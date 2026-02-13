'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit } from '@shared/types/clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

export default function PrescriptionDetailPage() {
  return <EMRLayout><PrescriptionDetailContent /></EMRLayout>;
}

function PrescriptionDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  const loadVisit = async () => {
    try {
      const d = await getDoc(doc(db, 'visits', id));
      if (d.exists()) setVisit({ id: d.id, ...d.data() } as Visit);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!visit) return <div className="text-center py-20 text-slate-500">처방전을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/prescription" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <h1 className="text-xl font-bold text-slate-900">처방전 상세</h1>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Printer className="w-4 h-4" /> 인쇄
        </button>
      </div>

      {/* Printable Prescription */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 print:shadow-none print:border-none">
        <div className="text-center mb-6 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold">처 방 전</h2>
          <p className="text-sm text-slate-500 mt-1">밀양 정형외과</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div><span className="text-slate-400">환자명:</span> <span className="font-bold">{visit.patientName}</span></div>
          <div><span className="text-slate-400">진료일:</span> {visit.date?.toDate?.()?.toLocaleDateString('ko-KR')}</div>
          <div><span className="text-slate-400">진단:</span> {visit.diagnosis || '-'}</div>
          <div><span className="text-slate-400">담당의:</span> {visit.doctorName || '-'}</div>
        </div>
        <div className="border-t border-slate-200 pt-4">
          <h3 className="font-bold text-slate-700 mb-2">처방 내용</h3>
          <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700">
            {visit.prescription || '처방 내용 없음'}
          </div>
        </div>
      </div>
    </div>
  );
}
