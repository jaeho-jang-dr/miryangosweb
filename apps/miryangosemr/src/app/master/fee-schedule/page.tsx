'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@shared/lib/firebase-clinical';
import { FeeScheduleItem } from '@/types/billing';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

export default function FeeSchedulePage() {
  return <EMRLayout><FeeScheduleContent /></EMRLayout>;
}

function FeeScheduleContent() {
  const [items, setItems] = useState<FeeScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ code: '', name: '', basePrice: '', category: 'consultation', unit: '회', insuranceCovered: true });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'fee_schedule'));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeScheduleItem[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addItem = async () => {
    if (!newItem.code || !newItem.name) return;
    try {
      await addDoc(collection(db, 'fee_schedule'), { ...newItem, basePrice: parseInt(newItem.basePrice) || 0, updatedAt: serverTimestamp() });
      setShowAdd(false);
      setNewItem({ code: '', name: '', basePrice: '', category: 'consultation', unit: '회', insuranceCovered: true });
      loadItems();
    } catch (e) { alert('추가 실패: ' + (e as Error).message); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await deleteDoc(doc(db, 'fee_schedule', id)); loadItems(); } catch (e) { alert('삭제 실패'); }
  };

  const filtered = items.filter(i => i.code.includes(search) || i.name.includes(search));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/master" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <h1 className="text-2xl font-bold text-slate-900">수가 관리</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> 수가 추가
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 grid grid-cols-6 gap-3">
          <input placeholder="코드" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className="px-3 py-2 text-sm border rounded-lg" />
          <input placeholder="수가명" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="col-span-2 px-3 py-2 text-sm border rounded-lg" />
          <input placeholder="단가" type="number" value={newItem.basePrice} onChange={e => setNewItem({...newItem, basePrice: e.target.value})} className="px-3 py-2 text-sm border rounded-lg" />
          <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="px-3 py-2 text-sm border rounded-lg bg-white">
            <option value="consultation">진찰</option><option value="test">검사</option><option value="procedure">시술</option><option value="injection">주사</option>
            <option value="medication">약제</option><option value="physical_therapy">물리치료</option><option value="material">재료</option>
          </select>
          <button onClick={addItem} className="bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">저장</button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder="코드 또는 수가명 검색..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">코드</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">수가명</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">분류</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">단가</th>
            <th className="px-4 py-3 text-center font-medium text-slate-500">급여</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">로딩 중...</td></tr> :
            filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">수가 데이터가 없습니다. 위에서 추가하세요.</td></tr> :
            filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-900">{item.code}</td>
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-slate-500">{item.category}</td>
                <td className="px-4 py-3 text-right">{new Intl.NumberFormat('ko-KR').format(item.basePrice)}원</td>
                <td className="px-4 py-3 text-center"><Badge variant={item.insuranceCovered ? 'success' : 'danger'}>{item.insuranceCovered ? '급여' : '비급여'}</Badge></td>
                <td className="px-4 py-3 text-right"><button onClick={() => deleteItem(item.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
