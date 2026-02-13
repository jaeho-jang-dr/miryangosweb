'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Patient, Visit } from '@shared/types/clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Stethoscope, FileText, Pill, FlaskConical, HeartPulse } from 'lucide-react';
import Link from 'next/link';

export default function VisitDetailPage() {
  return (
    <EMRLayout>
      <VisitDetailContent />
    </EMRLayout>
  );
}

function VisitDetailContent() {
  const params = useParams();
  const { patientId, visitId } = params as { patientId: string; visitId: string };
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [patientId, visitId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientDoc, visitDoc] = await Promise.all([
        getDoc(doc(db, 'patients', patientId)),
        getDoc(doc(db, 'visits', visitId)),
      ]);
      if (patientDoc.exists()) setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
      if (visitDoc.exists()) setVisit({ id: visitDoc.id, ...visitDoc.data() } as Visit);
    } catch (e) {
      console.error('로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!visit) {
    return <div className="text-center py-20 text-slate-500">방문 기록을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/chart/${patientId}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {patient?.name || visit.patientName} — 방문 상세
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {visit.date?.toDate?.()?.toLocaleDateString('ko-KR')}
            <Badge variant={visit.type === 'new' ? 'info' : 'default'}>{visit.type === 'new' ? '초진' : '재진'}</Badge>
          </p>
        </div>
      </div>

      {/* SOAP Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subjective */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-blue-500" /> 주관적 소견 (S)
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400 text-xs">주소 (CC):</span><p className="text-slate-700">{visit.chiefComplaint || '-'}</p></div>
            <div><span className="text-slate-400 text-xs">현병력 (HPI):</span><p className="text-slate-700">{visit.history || '-'}</p></div>
            {visit.symptoms && visit.symptoms.length > 0 && (
              <div><span className="text-slate-400 text-xs">증상:</span><div className="flex flex-wrap gap-1 mt-1">{visit.symptoms.map((s, i) => <Badge key={i} variant="info">{s}</Badge>)}</div></div>
            )}
          </div>
        </div>

        {/* Objective */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-orange-500" /> 객관적 소견 (O)
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400 text-xs">신체 검사:</span><p className="text-slate-700">{visit.physicalExam || '-'}</p></div>
            <div><span className="text-slate-400 text-xs">검사 오더:</span><p className="text-slate-700">{visit.testOrder || '-'}</p></div>
            <div><span className="text-slate-400 text-xs">검사 결과:</span><p className="text-slate-700">{visit.testResult || '-'}</p></div>
          </div>
        </div>

        {/* Assessment */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-emerald-500" /> 평가 (A)
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400 text-xs">진단:</span><p className="text-slate-700 font-medium">{visit.diagnosis || '-'}</p></div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-purple-500" /> 계획 (P)
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400 text-xs">처방:</span><p className="text-slate-700 whitespace-pre-wrap">{visit.prescription || '-'}</p></div>
            <div><span className="text-slate-400 text-xs">치료:</span><p className="text-slate-700">{visit.treatmentNote || '-'}</p></div>
            <div><span className="text-slate-400 text-xs">물리치료:</span><p className="text-slate-700">{visit.physicalTherapy || '-'}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
