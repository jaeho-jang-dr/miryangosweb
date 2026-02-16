'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, CreditCard, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function InsuranceSetupPage() {
  return <EMRLayout><InsuranceSetupContent /></EMRLayout>;
}

interface InsuranceSettings {
  // 본인부담율
  copayRateOutpatient: number;
  copayRateInpatient: number;
  copayRatePharmacy: number;
  // 절사 설정
  roundUnit: number; // 10원 단위 절사
  // 가산율
  nightSurchargeRate: number;
  weekendSurchargeRate: number;
  holidaySurchargeRate: number;
  emergencySurchargeRate: number;
  // 수가 적용
  feeScheduleYear: string;
  pointValue: number; // 환산지수
  // 비급여 설정
  nonCoveredRatio: number;
  memo: string;
}

const defaultSettings: InsuranceSettings = {
  copayRateOutpatient: 30,
  copayRateInpatient: 20,
  copayRatePharmacy: 30,
  roundUnit: 10,
  nightSurchargeRate: 30,
  weekendSurchargeRate: 30,
  holidaySurchargeRate: 50,
  emergencySurchargeRate: 50,
  feeScheduleYear: '2026',
  pointValue: 89.4,
  nonCoveredRatio: 0,
  memo: '',
};

function InsuranceSetupContent() {
  const [settings, setSettings] = useState<InsuranceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'insurance'));
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() } as InsuranceSettings);
      } catch (e) {
        console.error('보험 설정 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'insurance'), {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('보험 설정 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const NumField = ({ label, field, unit, step = 1 }: { label: string; field: keyof InsuranceSettings; unit: string; step?: number }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={settings[field] as number}
          onChange={e => setSettings(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
          step={step}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" /> 보험 설정
          </h1>
          <p className="text-sm text-slate-500">본인부담율, 절사, 가산율 등을 설정합니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-4">본인부담율</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField label="외래 본인부담율" field="copayRateOutpatient" unit="%" />
            <NumField label="입원 본인부담율" field="copayRateInpatient" unit="%" />
            <NumField label="약국 본인부담율" field="copayRatePharmacy" unit="%" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">절사 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField label="절사 단위" field="roundUnit" unit="원" />
          </div>
          <p className="text-xs text-slate-400 mt-2">본인부담금 계산 시 설정된 단위 미만은 절사합니다.</p>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">시간외/휴일 가산율</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField label="야간 가산율 (22-06시)" field="nightSurchargeRate" unit="%" />
            <NumField label="주말 가산율 (토요일)" field="weekendSurchargeRate" unit="%" />
            <NumField label="공휴일 가산율" field="holidaySurchargeRate" unit="%" />
            <NumField label="응급 가산율" field="emergencySurchargeRate" unit="%" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">수가 적용</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">수가 적용년도</label>
              <input value={settings.feeScheduleYear}
                onChange={e => setSettings(prev => ({ ...prev, feeScheduleYear: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <NumField label="환산지수" field="pointValue" unit="원" step={0.1} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">메모</label>
          <textarea value={settings.memo} onChange={e => setSettings(prev => ({ ...prev, memo: e.target.value }))} rows={2}
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
