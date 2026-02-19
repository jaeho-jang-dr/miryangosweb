'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, HardDrive, Save, Loader2, Download, RefreshCw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function BackupSetupPage() {
  return <EMRLayout><BackupSetupContent /></EMRLayout>;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionCount: number;
  includeImages: boolean;
  memo: string;
}

interface BackupLog {
  id: string;
  type: 'manual' | 'auto';
  status: 'success' | 'failed' | 'in_progress';
  collections: string[];
  documentCount: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

const defaultSettings: BackupSettings = {
  autoBackupEnabled: false,
  backupFrequency: 'daily',
  backupTime: '03:00',
  retentionCount: 30,
  includeImages: false,
  memo: '',
};

const BACKUP_COLLECTIONS = ['patients', 'visits', 'billing', 'claims', 'admissions', 'rooms', 'doctors', 'settings'];

function BackupSetupContent() {
  const [settings, setSettings] = useState<BackupSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [backing, setBacking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [settingsSnap, logsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'backup')),
          getDocs(query(collection(db, 'backup_logs'), orderBy('createdAt', 'desc'), limit(10))),
        ]);
        if (settingsSnap.exists()) setSettings({ ...defaultSettings, ...settingsSnap.data() } as BackupSettings);
        setBackupLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as BackupLog));
      } catch (e) {
        console.error('백업 설정 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'backup'), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('백업 설정 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    if (!confirm('수동 백업을 실행하시겠습니까?')) return;
    setBacking(true);
    try {
      let totalDocs = 0;
      const data: Record<string, object[]> = {};

      for (const col of BACKUP_COLLECTIONS) {
        const snap = await getDocs(collection(db, col));
        data[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        totalDocs += snap.size;
      }

      // Create downloadable JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emr_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log backup
      await addDoc(collection(db, 'backup_logs'), {
        type: 'manual',
        status: 'success',
        collections: BACKUP_COLLECTIONS,
        documentCount: totalDocs,
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
      });

      alert(`백업 완료: ${totalDocs}건의 문서가 다운로드됩니다.`);

      // Refresh logs
      const logsSnap = await getDocs(query(collection(db, 'backup_logs'), orderBy('createdAt', 'desc'), limit(10)));
      setBackupLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as BackupLog));
    } catch (e) {
      console.error('백업 실패:', e);
      alert('백업에 실패했습니다.');
    } finally {
      setBacking(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const freqLabels = { daily: '매일', weekly: '매주', monthly: '매월' };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-slate-600" /> 백업/복원
          </h1>
          <p className="text-sm text-slate-500">데이터 백업 및 복원을 관리합니다.</p>
        </div>
      </div>

      {/* Manual Backup */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">수동 백업</h3>
            <p className="text-xs text-slate-400 mt-1">전체 데이터를 JSON 파일로 다운로드합니다.</p>
          </div>
          <button onClick={handleManualBackup} disabled={backing}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {backing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {backing ? '백업중...' : '지금 백업'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BACKUP_COLLECTIONS.map(c => (
            <Badge key={c} variant="info" className="text-[10px]">{c}</Badge>
          ))}
        </div>
      </div>

      {/* Auto Backup Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">자동 백업 설정</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.autoBackupEnabled}
              onChange={e => setSettings(prev => ({ ...prev, autoBackupEnabled: e.target.checked }))}
              className="rounded border-slate-300" />
            {settings.autoBackupEnabled ? <Badge variant="success">활성</Badge> : <Badge variant="default">비활성</Badge>}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">백업 주기</label>
            <select value={settings.backupFrequency}
              onChange={e => setSettings(prev => ({ ...prev, backupFrequency: e.target.value as BackupSettings['backupFrequency'] }))}
              disabled={!settings.autoBackupEnabled}
              className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50">
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">백업 시간</label>
            <input type="time" value={settings.backupTime}
              onChange={e => setSettings(prev => ({ ...prev, backupTime: e.target.value }))}
              disabled={!settings.autoBackupEnabled}
              className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">보관 개수</label>
            <div className="flex items-center gap-2">
              <input type="number" value={settings.retentionCount} min={1}
                onChange={e => setSettings(prev => ({ ...prev, retentionCount: parseInt(e.target.value) || 30 }))}
                disabled={!settings.autoBackupEnabled}
                className="w-full px-3 py-2 text-sm border rounded-lg disabled:bg-slate-50" />
              <span className="text-xs text-slate-400">건</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? '저장완료!' : '설정 저장'}
          </button>
        </div>
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> 백업 이력 (최근 10건)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">일시</th>
                <th className="px-4 py-2 text-center font-medium text-slate-500">유형</th>
                <th className="px-4 py-2 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">문서수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backupLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">백업 이력이 없습니다.</td></tr>
              ) : backupLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {log.createdAt?.toDate?.() ? log.createdAt.toDate().toLocaleString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Badge variant={log.type === 'auto' ? 'info' : 'default'}>{log.type === 'auto' ? '자동' : '수동'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {log.status === 'success' ? <Badge variant="success">성공</Badge> :
                     log.status === 'failed' ? <Badge variant="danger">실패</Badge> :
                     <Badge variant="warning">진행중</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{log.documentCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
