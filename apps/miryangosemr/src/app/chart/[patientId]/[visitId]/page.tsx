'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Patient, Visit, MedicalOrder } from '@shared/types/clinical';
import { BillingRecord } from '@/types/billing';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import { ArrowLeft, Calendar, Stethoscope, FileText, Pill, FlaskConical, HeartPulse, CreditCard, ClipboardList, Activity, User } from 'lucide-react';
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
  const [billing, setBilling] = useState<BillingRecord | null>(null);
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

      // Load billing record for this visit
      try {
        const billingSnap = await getDocs(
          query(collection(db, 'billing'), where('visitId', '==', visitId), limit(1))
        );
        if (!billingSnap.empty) {
          setBilling({ id: billingSnap.docs[0].id, ...billingSnap.docs[0].data() } as BillingRecord);
        }
      } catch {
        // Billing may not exist yet
      }
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

  const orders = (visit.orders || []) as MedicalOrder[];
  const diagnosisLines = (visit.diagnosis || '').split('\n').filter(Boolean);
  const visitDate = visit.date?.toDate?.()?.toLocaleDateString('ko-KR') || '-';
  const visitTime = visit.date?.toDate?.()?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) || '';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/chart/${patientId}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              {patient?.name || visit.patientName}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {visitDate} {visitTime}
              <Badge variant={visit.type === 'new' ? 'info' : 'default'}>{visit.type === 'new' ? '초진' : '재진'}</Badge>
              {billing?.insuranceType && (
                <Badge variant="purple">
                  {billing.insuranceType === 'nhis' ? '건강보험' : billing.insuranceType === 'auto' ? '자동차' : billing.insuranceType === 'industrial' ? '산재' : '비급여'}
                </Badge>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">성별:</span>
            <span className="font-medium">{patient.gender === 'male' ? '남' : '여'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">생년월일:</span>
            <span className="font-medium">{patient.birthDate || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">연락처:</span>
            <span className="font-medium">{patient.phoneMasked || patient.phone || '-'}</span>
          </div>
          {patient.memo && (
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <span>특이사항: {patient.memo}</span>
            </div>
          )}
        </div>
      )}

      {/* SOAP Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subjective */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-blue-500" /> Subjective (주관적 소견)
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400 text-xs block mb-0.5">주소 (CC)</span>
              <p className="text-slate-700 whitespace-pre-wrap">{visit.chiefComplaint || '-'}</p>
            </div>
            {visit.symptoms && visit.symptoms.length > 0 && (
              <div>
                <span className="text-slate-400 text-xs block mb-1">증상</span>
                <div className="flex flex-wrap gap-1">{visit.symptoms.map((s, i) => <Badge key={i} variant="info">{s}</Badge>)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Objective */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-orange-500" /> Objective (객관적 소견)
          </h3>
          <div className="space-y-2 text-sm">
            {visit.physicalExam && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">신체 검사 (PE)</span>
                <p className="text-slate-700">{visit.physicalExam}</p>
              </div>
            )}
            {visit.testOrder && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">검사 오더</span>
                <p className="text-slate-700 whitespace-pre-wrap">{visit.testOrder}</p>
              </div>
            )}
            {visit.testResult && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">검사 결과</span>
                <p className="text-slate-700 whitespace-pre-wrap">{visit.testResult}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assessment */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-emerald-500" /> Assessment (평가/진단)
          </h3>
          <div className="space-y-1.5 text-sm">
            {diagnosisLines.length > 0 ? (
              diagnosisLines.map((line, idx) => {
                const kcdMatch = line.match(/\(([A-Z]\d{2}(?:\.\d+)?)\)/);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {idx === 0 && <Badge variant="danger" className="text-[10px]">주</Badge>}
                    <span className="text-slate-700">{line.replace(/\([A-Z]\d{2}(?:\.\d+)?\)/, '').trim()}</span>
                    {kcdMatch && (
                      <Badge variant="purple" className="text-[10px] font-mono">{kcdMatch[1]}</Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400">-</p>
            )}
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-purple-500" /> Plan (치료 계획)
          </h3>
          <div className="space-y-2 text-sm">
            {visit.treatmentNote && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">치료/처방</span>
                <p className="text-slate-700 whitespace-pre-wrap">{visit.treatmentNote}</p>
              </div>
            )}
            {visit.prescription && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">처방전</span>
                <p className="text-slate-700 whitespace-pre-wrap">{visit.prescription}</p>
              </div>
            )}
            {visit.physicalTherapy && (
              <div>
                <span className="text-slate-400 text-xs block mb-0.5">물리치료</span>
                <p className="text-slate-700">{visit.physicalTherapy}</p>
              </div>
            )}
            {!visit.treatmentNote && !visit.prescription && !visit.physicalTherapy && (
              <p className="text-slate-400">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders Card */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-indigo-500" /> 의료 오더
          </h3>
          <div className="flex flex-wrap gap-2">
            {orders.map((order, idx) => {
              const colorMap: Record<string, string> = {
                test: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                procedure: 'bg-rose-50 text-rose-700 border-rose-200',
                medication: 'bg-blue-50 text-blue-700 border-blue-200',
                pt: 'bg-teal-50 text-teal-700 border-teal-200',
                surgical: 'bg-slate-50 text-slate-700 border-slate-200',
              };
              const typeLabel: Record<string, string> = {
                test: '검사', procedure: '시술', medication: '약물', pt: 'PT', surgical: '수술',
              };
              const colors = colorMap[order.type] || colorMap.procedure;
              return (
                <span key={order.id || idx} className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${colors}`}>
                  <span className="font-bold mr-1">{typeLabel[order.type] || order.type}</span>
                  {order.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Billing Card */}
      {billing && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-emerald-500" /> 수납 내역
          </h3>
          {billing.items && billing.items.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500">코드</th>
                    <th className="px-3 py-2 text-left text-slate-500">항목</th>
                    <th className="px-3 py-2 text-right text-slate-500">수량</th>
                    <th className="px-3 py-2 text-right text-slate-500">금액</th>
                    <th className="px-3 py-2 text-center text-slate-500">급여</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billing.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.feeCode}</td>
                      <td className="px-3 py-2 text-slate-800">{item.feeName}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatKRW(item.totalPrice)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={item.insuranceCovered ? 'success' : 'danger'} className="text-[10px]">
                          {item.insuranceCovered ? '급여' : '비급여'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg text-center text-sm">
            <div>
              <p className="text-xs text-slate-400">총 진료비</p>
              <p className="font-bold text-slate-900">{formatKRW(billing.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">보험 부담</p>
              <p className="font-bold text-blue-600">{formatKRW(billing.insuranceAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">본인 부담</p>
              <p className="font-bold text-emerald-600">{formatKRW(billing.copayAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">수납 상태</p>
              <Badge variant={billing.paymentStatus === 'paid' ? 'success' : billing.paymentStatus === 'partial' ? 'warning' : 'default'}>
                {billing.paymentStatus === 'paid' ? '완납' : billing.paymentStatus === 'partial' ? '부분' : '미납'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Images */}
      {visit.images && visit.images.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-500" /> 의료 이미지
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {visit.images.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-100">
                <img src={img} alt={`의료 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
