'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Wifi, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function EdiSetupPage() {
  return <EMRLayout><EdiSetupContent /></EMRLayout>;
}

interface EdiSettings {
  // HIRA 심평원
  hiraEnabled: boolean;
  hiraSenderId: string;
  hiraPassword: string;
  hiraCertPath: string;
  // 약국 EDI
  pharmacyEdiEnabled: boolean;
  pharmacyEdiUrl: string;
  // 청구 설정
  claimAutoSubmit: boolean;
  claimSubmitDay: number;
  claimNotifyEmail: string;
  // 기타
  testMode: boolean;
  memo: string;
}

const defaultSettings: EdiSettings = {
  hiraEnabled: false,
  hiraSenderId: '', hiraPassword: '', hiraCertPath: '',
  pharmacyEdiEnabled: false, pharmacyEdiUrl: '',
  claimAutoSubmit: false, claimSubmitDay: 10, claimNotifyEmail: '',
  testMode: true, memo: '',
};

function EdiSetupContent() {
  const [settings, setSettings] = useState<EdiSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'edi'));
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() } as EdiSettings);
      } catch (e) {
        console.error('EDI 설정 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'edi'), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('EDI 설정 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wifi className="w-6 h-6 text-orange-600" /> EDI 설정
          </h1>
          <p className="text-sm text-slate-500">HIRA 심평원 및 약국 EDI 전송 설정을 관리합니다.</p>
        </div>
      </div>

      {settings.testMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">테스트 모드</p>
            <p className="text-xs text-amber-600">현재 테스트 모드입니다. 실제 청구 전송은 이루어지지 않습니다.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">HIRA 심평원 연동</h3>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.hiraEnabled}
                onChange={e => setSettings(prev => ({ ...prev, hiraEnabled: e.target.checked }))}
                className="rounded border-slate-300" />
              {settings.hiraEnabled ? <Badge variant="success">활성</Badge> : <Badge variant="default">비활성</Badge>}
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">송신자 ID</label>
              <input value={settings.hiraSenderId}
                onChange={e => setSettings(prev => ({ ...prev, hiraSenderId: e.target.value }))}
                disabled={!settings.hiraEnabled}
                className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">비밀번호</label>
              <input type="password" value={settings.hiraPassword}
                onChange={e => setSettings(prev => ({ ...prev, hiraPassword: e.target.value }))}
                disabled={!settings.hiraEnabled}
                className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">인증서 경로</label>
              <input value={settings.hiraCertPath}
                onChange={e => setSettings(prev => ({ ...prev, hiraCertPath: e.target.value }))}
                disabled={!settings.hiraEnabled}
                placeholder="C:\HIRA\cert\signCert.der"
                className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50 disabled:text-slate-400 font-mono" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">약국 EDI</h3>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.pharmacyEdiEnabled}
                onChange={e => setSettings(prev => ({ ...prev, pharmacyEdiEnabled: e.target.checked }))}
                className="rounded border-slate-300" />
              {settings.pharmacyEdiEnabled ? <Badge variant="success">활성</Badge> : <Badge variant="default">비활성</Badge>}
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">약국 EDI 서버 URL</label>
            <input value={settings.pharmacyEdiUrl}
              onChange={e => setSettings(prev => ({ ...prev, pharmacyEdiUrl: e.target.value }))}
              disabled={!settings.pharmacyEdiEnabled}
              placeholder="https://edi.example.com/pharmacy"
              className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50 disabled:text-slate-400 font-mono" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-4">청구 자동화</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={settings.claimAutoSubmit}
                  onChange={e => setSettings(prev => ({ ...prev, claimAutoSubmit: e.target.checked }))}
                  className="rounded border-slate-300" />
                자동 청구 제출
              </label>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">제출 기준일 (매월)</label>
                <input type="number" value={settings.claimSubmitDay} min={1} max={28}
                  onChange={e => setSettings(prev => ({ ...prev, claimSubmitDay: parseInt(e.target.value) || 10 }))}
                  disabled={!settings.claimAutoSubmit}
                  className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">알림 이메일</label>
              <input type="email" value={settings.claimNotifyEmail}
                onChange={e => setSettings(prev => ({ ...prev, claimNotifyEmail: e.target.value }))}
                placeholder="admin@clinic.com"
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.testMode}
              onChange={e => setSettings(prev => ({ ...prev, testMode: e.target.checked }))}
              className="rounded border-slate-300" />
            테스트 모드
          </label>
          <p className="text-xs text-slate-400">테스트 모드에서는 실제 EDI 전송이 이루어지지 않습니다.</p>
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
