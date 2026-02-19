'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Building2, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HospitalSetupPage() {
  return <EMRLayout><HospitalSetupContent /></EMRLayout>;
}

interface HospitalInfo {
  name: string;
  institutionCode: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  openDate: string;
  specialty: string;
  memo: string;
}

const defaultInfo: HospitalInfo = {
  name: '', institutionCode: '', representative: '', businessNumber: '',
  address: '', phone: '', fax: '', email: '',
  bankName: '', bankAccount: '', bankHolder: '',
  openDate: '', specialty: '', memo: '',
};

function HospitalSetupContent() {
  const [info, setInfo] = useState<HospitalInfo>(defaultInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'hospital'));
        if (snap.exists()) setInfo({ ...defaultInfo, ...snap.data() } as HospitalInfo);
      } catch (e) {
        console.error('병원정보 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'hospital'), {
        ...info,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('병원정보 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof HospitalInfo, value: string) =>
    setInfo(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const Field = ({ label, field, type = 'text', span = 1 }: { label: string; field: keyof HospitalInfo; type?: string; span?: number }) => (
    <div className={span === 2 ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={info[field]} onChange={e => update(field, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> 병원정보 설정
          </h1>
          <p className="text-sm text-slate-500">요양기관 기본정보를 관리합니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-4">기본정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="기관명칭" field="name" span={2} />
            <Field label="요양기관기호" field="institutionCode" />
            <Field label="대표자" field="representative" />
            <Field label="사업자등록번호" field="businessNumber" />
            <Field label="전문과목" field="specialty" />
            <Field label="개설일" field="openDate" type="date" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">연락처</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="주소" field="address" span={2} />
            <Field label="전화번호" field="phone" />
            <Field label="팩스" field="fax" />
            <Field label="이메일" field="email" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">계좌정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">은행명</label>
              <input value={info.bankName} onChange={e => update('bankName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">계좌번호</label>
              <input value={info.bankAccount} onChange={e => update('bankAccount', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">예금주</label>
              <input value={info.bankHolder} onChange={e => update('bankHolder', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">메모</label>
          <textarea value={info.memo} onChange={e => update('memo', e.target.value)} rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '저장완료!' : '저장'}
        </button>
      </div>
    </div>
  );
}
