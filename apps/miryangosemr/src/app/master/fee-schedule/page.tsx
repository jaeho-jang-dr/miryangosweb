'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc,
  orderBy, limit, startAfter, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Search, Plus, Trash2, Save, X, Filter,
  ChevronLeft, ChevronRight, Edit2,
} from 'lucide-react';
import Link from 'next/link';
import {
  type FeeScheduleItemFull, type FeeCategory,
  FEE_CATEGORY_NAMES,
} from '@/types/fee-schedule';

const COLLECTION_NAME = 'fee_schedule_items';
const PAGE_SIZE = 50;

export default function FeeSchedulePage() {
  return <EMRLayout><FeeScheduleContent /></EMRLayout>;
}

function FeeScheduleContent() {
  // Data state
  const [items, setItems] = useState<FeeScheduleItemFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FeeCategory | ''>('');
  const [codeClassifierFilter, setCodeClassifierFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [lastDocs, setLastDocs] = useState<QueryDocumentSnapshot[]>([]);

  // Edit mode
  const [selectedItem, setSelectedItem] = useState<FeeScheduleItemFull | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'new'>('view');

  // ─── Data Loading ────────────────────────────────────────────────────────
  const loadItems = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        orderBy('categoryCode'),
        orderBy('prescriptionCode'),
        limit(PAGE_SIZE)
      );

      if (categoryFilter) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('categoryCode', '==', categoryFilter),
          orderBy('prescriptionCode'),
          limit(PAGE_SIZE)
        );
      }

      if (pageNum > 0 && lastDocs[pageNum - 1]) {
        q = query(
          collection(db, COLLECTION_NAME),
          ...(categoryFilter ? [where('categoryCode', '==', categoryFilter)] : []),
          orderBy(categoryFilter ? 'prescriptionCode' : 'categoryCode'),
          ...(categoryFilter ? [] : [orderBy('prescriptionCode')]),
          startAfter(lastDocs[pageNum - 1]),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newItems = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeScheduleItemFull[];
      setItems(newItems);

      // Store last doc for pagination
      if (snap.docs.length > 0) {
        const newLastDocs = [...lastDocs];
        newLastDocs[pageNum] = snap.docs[snap.docs.length - 1];
        setLastDocs(newLastDocs);
      }
    } catch (e) {
      console.error('Failed to load fee schedule items:', e);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, lastDocs]);

  // Count total items
  const loadCount = useCallback(async () => {
    try {
      let q;
      if (categoryFilter) {
        q = query(collection(db, COLLECTION_NAME), where('categoryCode', '==', categoryFilter));
      } else {
        q = collection(db, COLLECTION_NAME);
      }
      const snap = await getDocs(q);
      setTotalCount(snap.size);
    } catch { /* ignore */ }
  }, [categoryFilter]);

  useEffect(() => {
    setPage(0);
    setLastDocs([]);
    loadItems(0);
    loadCount();
  }, [categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Client-side search filter ───────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.prescriptionCode?.toLowerCase().includes(term) ||
      item.hiraCode?.toLowerCase().includes(term) ||
      item.name?.toLowerCase().includes(term) ||
      item.searchIndex?.toLowerCase().includes(term) ||
      item.ingredientCode?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // ─── CRUD Operations ────────────────────────────────────────────────────
  const saveItem = async (item: FeeScheduleItemFull) => {
    try {
      const docId = item.id || `${item.categoryCode}_${item.prescriptionCode}`;
      const { id, ...data } = item;
      await setDoc(doc(db, COLLECTION_NAME, docId), {
        ...data,
        updatedAt: new Date().toISOString(),
        ...(!item.createdAt ? { createdAt: new Date().toISOString() } : {}),
      }, { merge: true });
      setEditMode('view');
      setSelectedItem({ ...item, id: docId });
      loadItems(page);
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    }
  };

  const deleteItem = async (item: FeeScheduleItemFull) => {
    if (!confirm(`"${item.name}" (${item.prescriptionCode})을(를) 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, item.id));
      setSelectedItem(null);
      setEditMode('view');
      loadItems(page);
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    }
  };

  // ─── Pagination ──────────────────────────────────────────────────────────
  const goNextPage = () => {
    const next = page + 1;
    setPage(next);
    loadItems(next);
  };

  const goPrevPage = () => {
    if (page === 0) return;
    const prev = page - 1;
    setPage(prev);
    loadItems(prev);
  };

  // ─── Price display helper ────────────────────────────────────────────────
  const formatPrice = (item: FeeScheduleItemFull) => {
    if (item.ceilingPrice) return `${item.ceilingPrice.toLocaleString()}원 (상한)`;
    if (item.unitPrice) return `${item.unitPrice.toLocaleString()}원 (단가)`;
    if (item.clinicalFee) return `${item.clinicalFee.toLocaleString()}점 (진료)`;
    return '-';
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
            <h1 className="text-2xl font-bold text-slate-900">처방자료관리</h1>
            <p className="text-xs text-slate-500">
              전체 {totalCount.toLocaleString()}건
              {categoryFilter && ` | ${FEE_CATEGORY_NAMES[categoryFilter]}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> 필터
          </Button>
          <Button size="sm" onClick={() => {
            setSelectedItem({
              id: '', prescriptionCode: '', hiraCode: '', name: '',
              categoryCode: '05', categoryName: '05내복약',
              effectiveDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
              cFlag: 1, isPsychotropic: false, isNarcotic: false, isRequired: false,
            } as FeeScheduleItemFull);
            setEditMode('new');
          }}>
            <Plus className="w-4 h-4 mr-1" /> 신규 등록
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">구분</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as FeeCategory | '')}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">전체</option>
                {Object.entries(FEE_CATEGORY_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>{code} {name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">코드구분자</label>
              <select
                value={codeClassifierFilter}
                onChange={e => setCodeClassifierFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">전체</option>
                <option value="수가">수가</option>
                <option value="치료재료">치료재료</option>
                <option value="협약재료">협약재료</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="처방코드, 연합코드, 명칭, 성분코드 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4" style={{ minHeight: '70vh' }}>
        {/* ─── Left: Item List ───────────────────────────────────────────── */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 w-24">코드</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500">명칭</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 w-20">구분</th>
                  <th className="px-3 py-2.5 text-right font-medium text-slate-500 w-32">가격/점수</th>
                  <th className="px-3 py-2.5 text-center font-medium text-slate-500 w-16">급여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="ml-2">로딩 중...</span>
                  </td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                    데이터가 없습니다.
                    {!totalCount && ' Excel 데이터를 먼저 임포트하세요.'}
                  </td></tr>
                ) : (
                  filteredItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setEditMode('view'); }}
                      className={`cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-emerald-50 border-l-2 border-l-emerald-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.prescriptionCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 truncate max-w-xs">{item.name}</div>
                        {item.ingredientCode && (
                          <div className="text-[10px] text-slate-400 font-mono">{item.ingredientCode}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500">
                          {FEE_CATEGORY_NAMES[item.categoryCode] || item.categoryCode}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatPrice(item)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.codeClassifier === '치료재료' ? (
                          <Badge variant="purple">재료</Badge>
                        ) : item.isPsychotropic ? (
                          <Badge variant="warning">향정</Badge>
                        ) : item.isNarcotic ? (
                          <Badge variant="danger">마약</Badge>
                        ) : item.copayRatio === undefined || item.copayRatio < 1 ? (
                          <Badge variant="success">급여</Badge>
                        ) : (
                          <Badge variant="default">비급여</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-slate-50 text-xs text-slate-500">
            <span>
              {page * PAGE_SIZE + 1} - {page * PAGE_SIZE + filteredItems.length} / {totalCount}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={goPrevPage} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goNextPage} disabled={items.length < PAGE_SIZE}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Right: Detail / Edit Panel ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {selectedItem ? (
            editMode === 'view' ? (
              <DetailPanel
                item={selectedItem}
                onEdit={() => setEditMode('edit')}
                onDelete={() => deleteItem(selectedItem)}
              />
            ) : (
              <EditPanel
                item={selectedItem}
                isNew={editMode === 'new'}
                onSave={saveItem}
                onCancel={() => {
                  if (editMode === 'new') setSelectedItem(null);
                  setEditMode('view');
                }}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
              좌측 목록에서 항목을 선택하면<br/>상세 정보가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({
  item, onEdit, onDelete,
}: {
  item: FeeScheduleItemFull;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Detail fields */}
      <div className="flex-1 overflow-auto p-4 space-y-3 text-xs">
        <FieldGroup title="기본 정보">
          <Field label="처방코드" value={item.prescriptionCode} mono />
          <Field label="연합코드" value={item.hiraCode} mono />
          <Field label="구분" value={`${item.categoryCode} ${FEE_CATEGORY_NAMES[item.categoryCode] || ''}`} />
          <Field label="적용일자" value={item.effectiveDate} />
          <Field label="코드구분자" value={item.codeClassifier} />
        </FieldGroup>

        <FieldGroup title="가격">
          {item.ceilingPrice != null && <Field label="상한가" value={`${item.ceilingPrice.toLocaleString()}원`} />}
          {item.unitPrice != null && <Field label="단가" value={`${item.unitPrice.toLocaleString()}원`} />}
          {item.clinicalFee != null && <Field label="진료가" value={`${item.clinicalFee.toLocaleString()}점`} />}
          {item.surcharge != null && <Field label="가산" value={String(item.surcharge)} />}
          {item.copayRatio != null && <Field label="본인부담률" value={`${(item.copayRatio * 100).toFixed(0)}%`} />}
        </FieldGroup>

        <FieldGroup title="플래그">
          <Field label="C" value={String(item.cFlag)} />
          {item.w1Flag != null && <Field label="W1" value={String(item.w1Flag)} />}
          {item.w2Flag != null && <Field label="W2" value={String(item.w2Flag)} />}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {item.hFlag && <Badge variant="info">H</Badge>}
            {item.pFlag && <Badge variant="info">P</Badge>}
            {item.mFlag && <Badge variant="info">M</Badge>}
            {item.isPsychotropic && <Badge variant="warning">향정</Badge>}
            {item.isNarcotic && <Badge variant="danger">마약</Badge>}
            {item.isRequired && <Badge variant="success">필수</Badge>}
            {item.isDiscontinued && <Badge variant="danger">중지</Badge>}
          </div>
        </FieldGroup>

        {(item.consignmentMethod || item.consignmentCategory) && (
          <FieldGroup title="위탁">
            <Field label="위탁방식" value={item.consignmentMethod} />
            <Field label="위탁구분" value={item.consignmentCategory} />
          </FieldGroup>
        )}

        {item.ingredientCode && (
          <FieldGroup title="약품 정보">
            <Field label="성분코드" value={item.ingredientCode} mono />
            <Field label="용법코드" value={item.dosageCode} />
            <Field label="용법" value={item.dosageText} />
            <Field label="처방수량" value={item.defaultQuantity != null ? String(item.defaultQuantity) : undefined} />
            <Field label="처방횟수" value={item.defaultFrequency != null ? String(item.defaultFrequency) : undefined} />
          </FieldGroup>
        )}

        {(item.diagnosisCode || item.billingMemo || item.substituteCode) && (
          <FieldGroup title="연관 정보">
            <Field label="병명코드" value={item.diagnosisCode} mono />
            <Field label="청구메모" value={item.billingMemo} />
            <Field label="대체코드" value={item.substituteCode} mono />
          </FieldGroup>
        )}
      </div>
    </div>
  );
}

// ─── Edit Panel ──────────────────────────────────────────────────────────────

function EditPanel({
  item, isNew, onSave, onCancel,
}: {
  item: FeeScheduleItemFull;
  isNew: boolean;
  onSave: (item: FeeScheduleItemFull) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FeeScheduleItemFull>(item);

  const update = (field: keyof FeeScheduleItemFull, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.prescriptionCode || !form.name) {
      alert('처방코드와 명칭은 필수입니다.');
      return;
    }
    // Sync categoryName
    const catName = `${form.categoryCode}${FEE_CATEGORY_NAMES[form.categoryCode] || ''}`;
    onSave({ ...form, categoryName: catName });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50">
        <h3 className="font-bold text-emerald-800 text-sm">
          {isNew ? '신규 등록' : '수정'}
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

      <div className="flex-1 overflow-auto p-4 space-y-3 text-xs">
        <EditGroup title="기본 정보">
          <EditField label="처방코드" value={form.prescriptionCode} onChange={v => update('prescriptionCode', v)} required />
          <EditField label="연합코드" value={form.hiraCode} onChange={v => update('hiraCode', v)} />
          <EditField label="명칭" value={form.name} onChange={v => update('name', v)} required />
          <div>
            <label className="text-slate-500 block mb-0.5">구분</label>
            <select
              value={form.categoryCode}
              onChange={e => update('categoryCode', e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
            >
              {Object.entries(FEE_CATEGORY_NAMES).map(([code, name]) => (
                <option key={code} value={code}>{code} {name}</option>
              ))}
            </select>
          </div>
          <EditField label="적용일자" value={form.effectiveDate || ''} onChange={v => update('effectiveDate', v)} placeholder="YYYY.MM.DD" />
        </EditGroup>

        <EditGroup title="가격">
          <EditField label="상한가" value={form.ceilingPrice?.toString() || ''} onChange={v => update('ceilingPrice', v ? Number(v) : undefined)} type="number" />
          <EditField label="단가" value={form.unitPrice?.toString() || ''} onChange={v => update('unitPrice', v ? Number(v) : undefined)} type="number" />
          <EditField label="진료가" value={form.clinicalFee?.toString() || ''} onChange={v => update('clinicalFee', v ? Number(v) : undefined)} type="number" />
          <EditField label="가산" value={form.surcharge?.toString() || ''} onChange={v => update('surcharge', v ? Number(v) : undefined)} type="number" />
          <div>
            <label className="text-slate-500 block mb-0.5">본인부담률</label>
            <select
              value={form.copayRatio?.toString() || ''}
              onChange={e => update('copayRatio', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
            >
              <option value="">미지정</option>
              <option value="0.3">30%</option>
              <option value="0.5">50%</option>
              <option value="0.8">80%</option>
              <option value="0.9">90%</option>
              <option value="1">100%</option>
            </select>
          </div>
        </EditGroup>

        <EditGroup title="플래그">
          <div>
            <label className="text-slate-500 block mb-0.5">C</label>
            <select
              value={form.cFlag}
              onChange={e => update('cFlag', Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
            >
              <option value={1}>1 (표준)</option>
              <option value={7}>7 (특수)</option>
              <option value={8}>8 (재료)</option>
            </select>
          </div>
          <div className="col-span-2 flex flex-wrap gap-3 pt-2">
            <CheckboxField label="향정" checked={form.isPsychotropic} onChange={v => update('isPsychotropic', v)} />
            <CheckboxField label="마약" checked={form.isNarcotic} onChange={v => update('isNarcotic', v)} />
            <CheckboxField label="필수" checked={form.isRequired} onChange={v => update('isRequired', v)} />
            <CheckboxField label="H" checked={!!form.hFlag} onChange={v => update('hFlag', v)} />
            <CheckboxField label="P" checked={!!form.pFlag} onChange={v => update('pFlag', v)} />
            <CheckboxField label="M" checked={!!form.mFlag} onChange={v => update('mFlag', v)} />
          </div>
        </EditGroup>

        <EditGroup title="약품/처방">
          <EditField label="성분코드" value={form.ingredientCode || ''} onChange={v => update('ingredientCode', v || undefined)} />
          <EditField label="용법코드" value={form.dosageCode || ''} onChange={v => update('dosageCode', v || undefined)} />
          <EditField label="처방수량" value={form.defaultQuantity?.toString() || ''} onChange={v => update('defaultQuantity', v ? Number(v) : undefined)} type="number" />
          <EditField label="처방횟수" value={form.defaultFrequency?.toString() || ''} onChange={v => update('defaultFrequency', v ? Number(v) : undefined)} type="number" />
          <div className="col-span-2">
            <EditField label="용법" value={form.dosageText || ''} onChange={v => update('dosageText', v || undefined)} />
          </div>
        </EditGroup>

        <EditGroup title="연관 정보">
          <EditField label="병명코드" value={form.diagnosisCode || ''} onChange={v => update('diagnosisCode', v || undefined)} />
          <EditField label="대체코드" value={form.substituteCode || ''} onChange={v => update('substituteCode', v || undefined)} />
          <div className="col-span-2">
            <EditField label="청구메모" value={form.billingMemo || ''} onChange={v => update('billingMemo', v || undefined)} />
          </div>
        </EditGroup>
      </div>
    </div>
  );
}

// ─── Shared UI Components ────────────────────────────────────────────────────

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-slate-700 text-xs mb-1.5 pb-1 border-b border-slate-100">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-slate-400">{label}</span>
      <span className={`text-slate-700 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function EditGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-slate-700 text-xs mb-1.5 pb-1 border-b border-emerald-100">{title}</h4>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function EditField({
  label, value, onChange, type = 'text', required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-slate-500 block mb-0.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400"
      />
    </div>
  );
}

function CheckboxField({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
      />
      <span className="text-slate-600">{label}</span>
    </label>
  );
}
