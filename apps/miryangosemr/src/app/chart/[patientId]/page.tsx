'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Patient, Visit } from '@shared/types/clinical';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, FileText, Stethoscope, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PatientChartPage() {
  return (
    <EMRLayout>
      <PatientChartContent />
    </EMRLayout>
  );
}

function PatientChartContent() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      // Load patient
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (patientDoc.exists()) {
        setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
      }

      // Load visits
      const visitsQ = query(
        collection(db, 'visits'),
        where('patientId', '==', patientId),
        orderBy('date', 'desc')
      );
      const visitsSnap = await getDocs(visitsQ);
      setVisits(visitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Visit[]);
    } catch (e) {
      console.error('차트 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!patient) {
    return <div className="text-center py-20 text-slate-500">환자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/chart" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{patient.name} 통합 차트</h1>
          <p className="text-sm text-slate-500">
            {patient.birthDate} | {patient.gender === 'male' ? '남' : '여'} | {patient.phoneMasked || patient.phone}
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-400">총 방문</span>
            <p className="text-xl font-bold text-slate-900">{visits.length}회</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">최근 방문</span>
            <p className="text-sm font-medium text-slate-700">
              {visits[0]?.date?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">보험 유형</span>
            <Badge variant={visits[0]?.insuranceType === 'nhis' ? 'info' : visits[0]?.insuranceType === 'auto' ? 'warning' : 'default'}>
              {visits[0]?.insuranceType === 'nhis' ? '건강보험' : visits[0]?.insuranceType === 'auto' ? '자동차보험' : '일반'}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-slate-400">알레르기/메모</span>
            <p className="text-sm text-red-600 font-medium">{patient.memo || '없음'}</p>
          </div>
        </div>
      </div>

      {/* Visit Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" /> 방문 이력 ({visits.length}건)
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {visits.map((visit) => (
            <Link key={visit.id} href={`/chart/${patientId}/${visit.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {visit.date?.toDate?.()?.toLocaleDateString('ko-KR')}
                      </span>
                      <Badge variant={visit.type === 'new' ? 'info' : 'default'}>
                        {visit.type === 'new' ? '초진' : '재진'}
                      </Badge>
                      <Badge variant={
                        visit.status === 'completed' ? 'success' :
                        visit.status === 'consulting' ? 'info' : 'warning'
                      }>
                        {visit.status === 'completed' ? '완료' : visit.status === 'consulting' ? '진료중' : visit.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {visit.diagnosis || visit.chiefComplaint || '진단 미입력'}
                    </p>
                  </div>
                </div>
                <FileText className="w-4 h-4 text-slate-300" />
              </div>
            </Link>
          ))}
          {visits.length === 0 && (
            <div className="p-8 text-center text-slate-400">방문 기록이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
