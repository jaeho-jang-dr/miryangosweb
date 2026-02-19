'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Search, Plus, Trash2, Save, X,
  ChevronUp, ChevronDown, Copy, Edit2,
} from 'lucide-react';
import Link from 'next/link';
import {
  type BundlePrescription, type BundlePrescriptionItem,
  type FeeScheduleItemFull, FEE_CATEGORY_NAMES,
} from '@/types/fee-schedule';

const BUNDLE_COLLECTION = 'bundle_prescriptions';
const FEE_COLLECTION = 'fee_schedule_items';

export default function BundlePrescriptionPage() {
  return <EMRLayout><BundleContent /></EMRLayout>;
}

function BundleContent() {
  // Bundle list
  const [bundles, setBundles] = useState<BundlePrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Selected bundle
  const [selected, setSelected] = useState<BundlePrescription | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'new'>('view');

  // Prescription picker state
  const [pickerResults, setPickerResults] = useState<FeeScheduleItemFull[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // ─── Load Bundles ─────────────────────────────────────────────────────────
  const loadBundles = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      if (userFilter) {
        q = query(collection(db, BUNDLE_COLLECTION), where('userId', '==', userFilter), orderBy('name'));
      } else {
        q = query(collection(db, BUNDLE_COLLECTION), orderBy('name'));
      }
      const snap = await getDocs(q);
      setBundles(snap.docs.map(d => ({ id: d.id, ...d.data() })) as BundlePrescription[]);
    } catch (e) {
      console.error('Failed to load bundles:', e);
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => { loadBundles(); }, [loadBundles]);

  // ─── Filter bundles by search ────────────────────────────────────────────
  const filteredBundles = bundles.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return b.name.toLowerCase().includes(term) ||
           b.bundleCode.toLowerCase().includes(term) ||
           b.searchIndex?.toLowerCase().includes(term);
  });

  // ─── Prescription search for picker ──────────────────────────────────────
  const searchPrescriptions = async (term: string) => {
    if (!term || term.length < 2) {
      setPickerResults([]);
      return;
    }
    setPickerLoading(true);
    try {
      // Search by name using Firestore (limited - for full text search use Algolia/Typesense)
      const snap = await getDocs(
        query(collection(db, FEE_COLLECTION), orderBy('name'), limit(100))
      );
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeScheduleItemFull[];
      const termLower = term.toLowerCase();
      setPickerResults(all.filter(i =>
        i.name.toLowerCase().includes(termLower) ||
        i.prescriptionCode.toLowerCase().includes(termLower) ||
        i.searchIndex?.toLowerCase().includes(termLower)
      ).slice(0, 20));
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setPickerLoading(false);
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const saveBundle = async (bundle: BundlePrescription) => {
    try {
      const docId = bundle.id || `bundle_${Date.now()}`;
      const { id, ...data } = bundle;
      await setDoc(doc(db, BUNDLE_COLLECTION, docId), {
        ...data,
        updatedAt: new Date().toISOString(),
        ...(!bundle.createdAt ? { createdAt: new Date().toISOString() } : {}),
      }, { merge: true });
      setEditMode('view');
      setSelected({ ...bundle, id: docId });
      loadBundles();
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    }
  };

  const deleteBundle = async (bundle: BundlePrescription) => {
    if (!confirm(`"${bundle.name}" 묶음처방을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, BUNDLE_COLLECTION, bundle.id));
      setSelected(null);
      setEditMode('view');
      loadBundles();
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    }
  };

  const duplicateBundle = (bundle: BundlePrescription) => {
    setSelected({
      ...bundle,
      id: '',
      bundleCode: bundle.bundleCode + '_copy',
      name: bundle.name + ' (복사)',
      createdAt: undefined,
      updatedAt: undefined,
    });
    setEditMode('new');
  };

  const newBundle = () => {
    setSelected({
      id: '',
      bundleCode: '',
      name: '',
      searchIndex: '',
      items: [],
    });
    setEditMode('new');
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
            <h1 className="text-2xl font-bold text-slate-900">묶음처방 관리</h1>
            <p className="text-xs text-slate-500">전체 {bundles.length}건</p>
          </div>
        </div>
        <Button size="sm" onClick={newBundle}>
          <Plus className="w-4 h-4 mr-1" /> 신규 묶음
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="묶음코드, 묶음명칭 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-5 gap-4" style={{ minHeight: '70vh' }}>
        {/* ─── Left: Bundle List ──────────────────────────────────────────── */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="ml-2">로딩 중...</span>
              </div>
            ) : filteredBundles.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                묶음처방이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredBundles.map(bundle => (
                  <div
                    key={bundle.id}
                    onClick={() => { setSelected(bundle); setEditMode('view'); }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selected?.id === bundle.id
                        ? 'bg-emerald-50 border-l-2 border-l-emerald-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{bundle.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{bundle.bundleCode}</div>
                      </div>
                      <Badge variant="default">{bundle.items.length}항목</Badge>
                    </div>
                    {bundle.userName && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{bundle.userName}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Bundle Detail / Editor ─────────────────────────────── */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {selected ? (
            editMode === 'view' ? (
              <BundleDetailPanel
                bundle={selected}
                onEdit={() => setEditMode('edit')}
                onDelete={() => deleteBundle(selected)}
                onDuplicate={() => duplicateBundle(selected)}
              />
            ) : (
              <BundleEditPanel
                bundle={selected}
                isNew={editMode === 'new'}
                onSave={saveBundle}
                onCancel={() => {
                  if (editMode === 'new') setSelected(null);
                  setEditMode('view');
                }}
                onSearchPrescription={searchPrescriptions}
                pickerResults={pickerResults}
                pickerLoading={pickerLoading}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
              좌측에서 묶음처방을 선택하거나<br/>&ldquo;신규 묶음&rdquo; 버튼으로 새로 만드세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bundle Detail Panel ─────────────────────────────────────────────────────

function BundleDetailPanel({
  bundle, onEdit, onDelete, onDuplicate,
}: {
  bundle: BundlePrescription;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{bundle.name}</h3>
          <span className="text-xs text-slate-400 font-mono">{bundle.bundleCode}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="복사">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500 w-10">#</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500 w-24">처방코드</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500">처방명칭</th>
              <th className="px-3 py-2 text-right font-medium text-slate-500 w-14">수량</th>
              <th className="px-3 py-2 text-right font-medium text-slate-500 w-14">횟수</th>
              <th className="px-3 py-2 text-left font-medium text-slate-500 w-20">용법</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bundle.items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                처방 항목이 없습니다.
              </td></tr>
            ) : (
              bundle.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{item.order}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{item.prescriptionCode}</td>
                  <td className="px-3 py-2 text-slate-900">{item.name}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{item.frequency}</td>
                  <td className="px-3 py-2 text-slate-500">{item.dosage || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {bundle.userName && (
        <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-400">
          담당: {bundle.userName}
        </div>
      )}
    </div>
  );
}

// ─── Bundle Edit Panel ───────────────────────────────────────────────────────

function BundleEditPanel({
  bundle, isNew, onSave, onCancel, onSearchPrescription, pickerResults, pickerLoading,
}: {
  bundle: BundlePrescription;
  isNew: boolean;
  onSave: (b: BundlePrescription) => void;
  onCancel: () => void;
  onSearchPrescription: (term: string) => void;
  pickerResults: FeeScheduleItemFull[];
  pickerLoading: boolean;
}) {
  const [form, setForm] = useState<BundlePrescription>(bundle);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const handleSave = () => {
    if (!form.bundleCode || !form.name) {
      alert('묶음코드와 명칭은 필수입니다.');
      return;
    }
    onSave(form);
  };

  // Add prescription item from picker
  const addItem = (feeItem: FeeScheduleItemFull) => {
    const newItem: BundlePrescriptionItem = {
      order: form.items.length + 1,
      prescriptionCode: feeItem.prescriptionCode,
      name: feeItem.name,
      quantity: feeItem.defaultQuantity || 1,
      frequency: feeItem.defaultFrequency || 1,
      dosage: feeItem.dosageText,
    };
    setForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setShowPicker(false);
    setPickerSearch('');
  };

  // Remove item
  const removeItem = (idx: number) => {
    const items = form.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i + 1 }));
    setForm(prev => ({ ...prev, items }));
  };

  // Move item up/down
  const moveItem = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= form.items.length) return;
    const items = [...form.items];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setForm(prev => ({ ...prev, items: items.map((item, i) => ({ ...item, order: i + 1 })) }));
  };

  // Update item field
  const updateItem = (idx: number, field: keyof BundlePrescriptionItem, value: unknown) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm(prev => ({ ...prev, items }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50">
        <h3 className="font-bold text-emerald-800 text-sm">
          {isNew ? '신규 묶음처방' : '묶음처방 수정'}
        </h3>
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" /> 저장
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Basic info */}
      <div className="px-4 py-3 border-b space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-500 block mb-0.5">묶음코드 <span className="text-red-400">*</span></label>
            <input
              value={form.bundleCode}
              onChange={e => setForm(prev => ({ ...prev, bundleCode: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-0.5">묶음명칭 <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value, searchIndex: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b sticky top-0">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-2 py-2 text-left font-medium text-slate-500 w-10">#</th>
              <th className="px-2 py-2 text-left font-medium text-slate-500 w-20">코드</th>
              <th className="px-2 py-2 text-left font-medium text-slate-500">명칭</th>
              <th className="px-2 py-2 text-center font-medium text-slate-500 w-16">수량</th>
              <th className="px-2 py-2 text-center font-medium text-slate-500 w-16">횟수</th>
              <th className="px-2 py-2 text-center font-medium text-slate-500 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {form.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-2 py-1.5">
                  <div className="flex flex-col">
                    <button onClick={() => moveItem(idx, -1)} className="text-slate-300 hover:text-slate-500" disabled={idx === 0}>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveItem(idx, 1)} className="text-slate-300 hover:text-slate-500" disabled={idx === form.items.length - 1}>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-400">{item.order}</td>
                <td className="px-2 py-1.5 font-mono text-slate-600">{item.prescriptionCode}</td>
                <td className="px-2 py-1.5 text-slate-900">{item.name}</td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-full px-1 py-0.5 text-center border border-slate-200 rounded text-xs"
                    min={0}
                    step={0.5}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={item.frequency}
                    onChange={e => updateItem(idx, 'frequency', Number(e.target.value))}
                    className="w-full px-1 py-0.5 text-center border border-slate-200 rounded text-xs"
                    min={1}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add prescription */}
      <div className="px-4 py-3 border-t bg-slate-50">
        {showPicker ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                placeholder="처방코드 또는 명칭 검색..."
                value={pickerSearch}
                onChange={e => {
                  setPickerSearch(e.target.value);
                  onSearchPrescription(e.target.value);
                }}
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500/30"
              />
              <button onClick={() => { setShowPicker(false); setPickerSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            {pickerResults.length > 0 && (
              <div className="max-h-40 overflow-auto border border-slate-200 rounded bg-white">
                {pickerResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="px-3 py-1.5 hover:bg-emerald-50 cursor-pointer text-xs flex justify-between"
                  >
                    <span><span className="font-mono text-slate-500">{item.prescriptionCode}</span> {item.name}</span>
                    <span className="text-slate-400">{FEE_CATEGORY_NAMES[item.categoryCode]}</span>
                  </div>
                ))}
              </div>
            )}
            {pickerLoading && <div className="text-xs text-slate-400 text-center">검색 중...</div>}
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowPicker(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> 처방 추가
          </Button>
        )}
      </div>
    </div>
  );
}
