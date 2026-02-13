'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { saveClaim, validateClaimForDUR } from '@/lib/claims-engine';
import { ArrowLeft, AlertTriangle, Send, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewClaimPage() {
  return <EMRLayout><NewClaimContent /></EMRLayout>;
}

function NewClaimContent() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [insuranceAmount, setInsuranceAmount] = useState('');
  const [copayAmount, setCopayAmount] = useState('');
  const [durWarnings, setDurWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleValidate = () => {
    const result = validateClaimForDUR({
      visitId: '', patientId: '', patientName,
      visitDate,
      diagnosisCodes: diagnosisCode ? [diagnosisCode] : [],
      diagnosisNames: diagnosisName ? [diagnosisName] : [],
      doctorName,
      items: [],
      totalAmount: parseInt(totalAmount) || 0,
      insuranceAmount: parseInt(insuranceAmount) || 0,
      copayAmount: parseInt(copayAmount) || 0,
      status: 'draft',
      durChecked: false,
    });
    setDurWarnings(result.warnings);
    return result.passed;
  };

  const handleSave = async () => {
    if (!handleValidate()) return;
    setSaving(true);
    try {
      await saveClaim({
        visitId: '', patientId: '', patientName,
        visitDate,
        diagnosisCodes: [diagnosisCode],
        diagnosisNames: [diagnosisName],
        doctorName,
        items: [],
        totalAmount: parseInt(totalAmount) || 0,
        insuranceAmount: parseInt(insuranceAmount) || 0,
        copayAmount: parseInt(copayAmount) || 0,
        status: 'draft',
        durChecked: true,
      });
      router.push('/claims');
    } catch (e) { alert('저장 실패: ' + (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">신규 청구 생성</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 mb-1">환자명</label><input value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">진료일</label><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">진단코드 (KCD)</label><input value={diagnosisCode} onChange={e => setDiagnosisCode(e.target.value)} placeholder="M54.5" className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">진단명</label><input value={diagnosisName} onChange={e => setDiagnosisName(e.target.value)} placeholder="요통" className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">담당의</label><input value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 mb-1">총 진료비</label><input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">보험 청구액</label><input type="number" value={insuranceAmount} onChange={e => setInsuranceAmount(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">본인부담금</label><input type="number" value={copayAmount} onChange={e => setCopayAmount(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
        </div>
      </div>

      {durWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> DUR 검증 경고</h4>
          <ul className="text-sm text-amber-700 space-y-1">{durWarnings.map((w, i) => <li key={i}>- {w}</li>)}</ul>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleValidate} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4" /> 검증
        </button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          <Send className="w-4 h-4" /> {saving ? '저장 중...' : '청구 저장'}
        </button>
      </div>
    </div>
  );
}
