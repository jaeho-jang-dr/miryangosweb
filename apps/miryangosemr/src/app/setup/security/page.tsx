'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Shield, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function SecuritySetupPage() {
  return <EMRLayout><SecuritySetupContent /></EMRLayout>;
}

interface SecuritySettings {
  // 인증 설정
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  requirePasswordChange: boolean;
  passwordChangeDays: number;
  // 접근 제어
  ipWhitelistEnabled: boolean;
  ipWhitelist: string;
  // 감사 로그
  auditLogEnabled: boolean;
  auditLogRetentionDays: number;
  // 데이터 보호
  encryptSensitiveData: boolean;
  maskRRN: boolean;
  autoLogout: boolean;
  memo: string;
}

const defaultSettings: SecuritySettings = {
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  requirePasswordChange: false,
  passwordChangeDays: 90,
  ipWhitelistEnabled: false,
  ipWhitelist: '',
  auditLogEnabled: true,
  auditLogRetentionDays: 365,
  encryptSensitiveData: true,
  maskRRN: true,
  autoLogout: true,
  memo: '',
};

function SecuritySetupContent() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'security'));
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() } as SecuritySettings);
      } catch (e) {
        console.error('보안 설정 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'security'), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('보안 설정 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const NumField = ({ label, field, unit, min = 0 }: { label: string; field: keyof SecuritySettings; unit: string; min?: number }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={settings[field] as number} min={min}
          onChange={e => setSettings(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  const Toggle = ({ label, field, desc }: { label: string; field: keyof SecuritySettings; desc?: string }) => (
    <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
      <input type="checkbox" checked={settings[field] as boolean}
        onChange={e => setSettings(prev => ({ ...prev, [field]: e.target.checked }))}
        className="rounded border-slate-300 mt-0.5" />
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </label>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" /> 보안 설정
          </h1>
          <p className="text-sm text-slate-500">사용자 인증 및 접근 제어를 관리합니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-4">인증 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField label="세션 타임아웃" field="sessionTimeoutMinutes" unit="분" min={5} />
            <NumField label="최대 로그인 시도" field="maxLoginAttempts" unit="회" min={1} />
            <NumField label="잠금 시간" field="lockoutMinutes" unit="분" min={1} />
          </div>
          <div className="mt-4 space-y-2">
            <Toggle label="정기 비밀번호 변경 요구" field="requirePasswordChange" desc="설정된 주기마다 비밀번호 변경을 요구합니다." />
            {settings.requirePasswordChange && (
              <div className="ml-10">
                <NumField label="변경 주기" field="passwordChangeDays" unit="일" min={30} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">접근 제어</h3>
          <div className="space-y-3">
            <Toggle label="IP 화이트리스트 사용" field="ipWhitelistEnabled" desc="허용된 IP에서만 접근 가능하도록 제한합니다." />
            {settings.ipWhitelistEnabled && (
              <div className="ml-10">
                <label className="block text-xs font-medium text-slate-500 mb-1">허용 IP 목록 (줄바꿈으로 구분)</label>
                <textarea value={settings.ipWhitelist}
                  onChange={e => setSettings(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                  rows={3} placeholder="192.168.1.0/24&#10;10.0.0.1"
                  className="w-full px-3 py-2 text-sm border rounded-lg font-mono" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">감사 로그</h3>
          <div className="space-y-3">
            <Toggle label="감사 로그 활성화" field="auditLogEnabled" desc="사용자 활동을 기록합니다 (진료조회, 수정, 삭제 등)." />
            {settings.auditLogEnabled && (
              <div className="ml-10">
                <NumField label="로그 보관 기간" field="auditLogRetentionDays" unit="일" min={30} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">데이터 보호</h3>
          <div className="space-y-2">
            <Toggle label="민감 데이터 암호화" field="encryptSensitiveData" desc="주민등록번호 등 민감 데이터를 암호화하여 저장합니다." />
            <Toggle label="주민등록번호 마스킹" field="maskRRN" desc="화면에 주민등록번호 뒷자리를 ****로 표시합니다." />
            <Toggle label="자동 로그아웃" field="autoLogout" desc="세션 타임아웃 시 자동으로 로그아웃합니다." />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">메모</label>
          <textarea value={settings.memo} onChange={e => setSettings(prev => ({ ...prev, memo: e.target.value }))} rows={2}
            className="w-full px-3 py-2 text-sm border rounded-lg" />
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
