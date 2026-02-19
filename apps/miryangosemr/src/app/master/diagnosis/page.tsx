'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, query, getDocs, doc, setDoc, deleteDoc,
  orderBy, limit, startAfter, where, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Plus, Trash2, Save, X, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { type DiagnosisCode } from '@/types/fee-schedule';

const COLLECTION_NAME = 'diagnosis_codes';
const PAGE_SIZE = 50;

export default function DiagnosisCodePage() {
  return <EMRLayout><DiagnosisContent /></EMRLayout>;
}

function DiagnosisContent() {
  const [items, setItems] = useState<DiagnosisCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<DiagnosisCode | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'new'>('view');

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('code'), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DiagnosisCode[]);
    } catch (e) {
      console.error('Failed to load diagnosis codes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Client-side search
  const filtered = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(i =>
      i.code?.toLowerCase().includes(term) ||
      i.nameKr?.toLowerCase().includes(term) ||
      i.nameEn?.toLowerCase().includes(term) ||
      i.searchIndex?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Save
  const saveItem = async (item: DiagnosisCode) => {
    try {
      const docId = item.id || item.code.replace(/\./g, '_');
      const { id, ...data } = item;
      await setDoc(doc(db, COLLECTION_NAME, docId), data, { merge: true });
      setEditMode('view');
      setSelected({ ...item, id: docId });
      loadItems();
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    }
  };

  // Delete
  const deleteItem = async (item: DiagnosisCode) => {
    if (!confirm(`"${item.nameKr}" (${item.code}) 삭제?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, item.id));
      setSelected(null);
      setEditMode('view');
      loadItems();
    } catch (e) {
      alert('삭제 실패');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/master" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">병명자료 관리</h1>
            <p className="text-xs text-slate-500">KCD 진단코드 관리</p>
          </div>
        </div>
        <Button size="sm" onClick={() => {
          setSelected({ id: '', code: '', classificationCode: '', nameKr: '', searchIndex: '' });
          setEditMode('new');
        }}>
          <Plus className="w-4 h-4 mr-1" /> 병명 추가
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="병명코드, 한글병명, 영문병명 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4" style={{ minHeight: '70vh' }}>
        {/* List */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 w-28">코드</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">한글 병명</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 w-20">진료과</th>
                  <th className="px-3 py-2.5 text-center font-medium text-slate-500 w-16">주병명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="ml-2">로딩 중...</span>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400">
                    데이터가 없습니다.
                  </td></tr>
                ) : (
                  filtered.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => { setSelected(item); setEditMode('view'); }}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === item.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.code}</td>
                      <td className="px-3 py-2">
                        <div className="text-slate-900">{item.nameKr}</div>
                        {item.nameEn && <div className="text-[10px] text-slate-400">{item.nameEn}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{item.department || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        {item.isPrimary && <Badge variant="success">주</Badge>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail/Edit Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {selected ? (
            editMode === 'view' ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-sm">{selected.nameKr}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditMode('edit')}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(selected)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">코드</span><span className="font-mono">{selected.code}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">분류기호</span><span>{selected.classificationCode}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">한글병명</span><span>{selected.nameKr}</span></div>
                  {selected.nameEn && <div className="flex justify-between"><span className="text-slate-400">영문병명</span><span className="text-right max-w-[60%]">{selected.nameEn}</span></div>}
                  {selected.department && <div className="flex justify-between"><span className="text-slate-400">진료과목</span><span>{selected.department}</span></div>}
                  <div className="flex flex-wrap gap-1 pt-2">
                    {selected.flagA && <Badge variant="info">A: {selected.flagA}</Badge>}
                    {selected.flagB && <Badge variant="info">B: {selected.flagB}</Badge>}
                    {selected.flagC && <Badge variant="info">C: {selected.flagC}</Badge>}
                    {selected.isPrimary && <Badge variant="success">주병명</Badge>}
                  </div>
                </div>
              </div>
            ) : (
              <DiagnosisEditPanel
                item={selected}
                isNew={editMode === 'new'}
                onSave={saveItem}
                onCancel={() => { if (editMode === 'new') setSelected(null); setEditMode('view'); }}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
              좌측에서 병명을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiagnosisEditPanel({
  item, isNew, onSave, onCancel,
}: {
  item: DiagnosisCode;
  isNew: boolean;
  onSave: (item: DiagnosisCode) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DiagnosisCode>(item);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50">
        <h3 className="font-bold text-emerald-800 text-sm">{isNew ? '신규 병명' : '병명 수정'}</h3>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => {
            if (!form.code || !form.nameKr) { alert('코드와 한글병명은 필수입니다.'); return; }
            onSave({ ...form, searchIndex: `${form.code} ${form.nameKr} ${form.nameEn || ''}`.trim() });
          }}>
            <Save className="w-3.5 h-3.5 mr-1" /> 저장
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div>
          <label className="text-slate-500 mb-0.5 block">코드 <span className="text-red-400">*</span></label>
          <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
        </div>
        <div>
          <label className="text-slate-500 mb-0.5 block">분류기호</label>
          <input value={form.classificationCode} onChange={e => setForm(p => ({ ...p, classificationCode: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
        </div>
        <div>
          <label className="text-slate-500 mb-0.5 block">한글 병명 <span className="text-red-400">*</span></label>
          <input value={form.nameKr} onChange={e => setForm(p => ({ ...p, nameKr: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
        </div>
        <div>
          <label className="text-slate-500 mb-0.5 block">영문 병명</label>
          <input value={form.nameEn || ''} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value || undefined }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
        </div>
        <div>
          <label className="text-slate-500 mb-0.5 block">진료과목</label>
          <input value={form.department || ''} onChange={e => setForm(p => ({ ...p, department: e.target.value || undefined }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" placeholder="05 정형외과" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" checked={!!form.isPrimary} onChange={e => setForm(p => ({ ...p, isPrimary: e.target.checked }))} className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600" />
          <span className="text-slate-600">주병명</span>
        </label>
      </div>
    </div>
  );
}
