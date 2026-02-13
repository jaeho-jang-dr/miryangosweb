'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateCopay, formatKRW } from '@/lib/fee-calculator';
import { InsuranceType, COPAY_RATES } from '@/types/billing';
import { Badge } from '@/components/ui/badge';
import { Calculator, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CalcItem {
  id: string;
  name: string;
  basePrice: number;
  quantity: number;
  isInsuranceCovered: boolean;
}

export default function FeeCalcPage() {
  return <EMRLayout><FeeCalcContent /></EMRLayout>;
}

function FeeCalcContent() {
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('nhis');
  const [items, setItems] = useState<CalcItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newCovered, setNewCovered] = useState(true);

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newName,
      basePrice: parseInt(newPrice),
      quantity: parseInt(newQty) || 1,
      isInsuranceCovered: newCovered,
    }]);
    setNewName(''); setNewPrice(''); setNewQty('1');
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const totals = items.reduce((acc, item) => {
    const { total, copay, insurance } = calculateCopay(item.basePrice, item.quantity, insuranceType, item.isInsuranceCovered);
    return { total: acc.total + total, copay: acc.copay + copay, insurance: acc.insurance + insurance };
  }, { total: 0, copay: 0, insurance: 0 });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">진료비 계산기</h1>
          <p className="text-sm text-slate-500">수가 항목을 입력하여 본인부담금을 계산합니다.</p>
        </div>
      </div>

      {/* Insurance Type */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">보험 유형</h3>
        <div className="flex gap-2">
          {(['nhis', 'auto', 'industrial', 'none'] as InsuranceType[]).map(type => (
            <button key={type} onClick={() => setInsuranceType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                insuranceType === type ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {type === 'nhis' ? '건강보험 (30%)' : type === 'auto' ? '자동차보험 (0%)' : type === 'industrial' ? '산재보험 (0%)' : '비급여 (100%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Add Item */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">항목 추가</h3>
        <div className="grid grid-cols-5 gap-2">
          <input placeholder="항목명" value={newName} onChange={e => setNewName(e.target.value)} className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          <input placeholder="단가" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          <input placeholder="수량" type="number" value={newQty} onChange={e => setNewQty(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          <button onClick={addItem} className="bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 text-sm font-medium">
            <Plus className="w-4 h-4" /> 추가
          </button>
        </div>
        <label className="flex items-center gap-2 mt-2 text-sm text-slate-600">
          <input type="checkbox" checked={newCovered} onChange={e => setNewCovered(e.target.checked)} className="rounded" /> 급여 항목
        </label>
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">항목</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">단가</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">수량</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">급여</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">본인부담</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const calc = calculateCopay(item.basePrice, item.quantity, insuranceType, item.isInsuranceCovered);
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-right">{formatKRW(item.basePrice)}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={item.isInsuranceCovered ? 'success' : 'danger'}>{item.isInsuranceCovered ? '급여' : '비급여'}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatKRW(calc.copay)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Totals */}
          <div className="bg-slate-50 p-5 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-slate-400">총 진료비</p><p className="text-lg font-bold text-slate-900">{formatKRW(totals.total)}</p></div>
            <div><p className="text-xs text-slate-400">보험 부담</p><p className="text-lg font-bold text-blue-600">{formatKRW(totals.insurance)}</p></div>
            <div><p className="text-xs text-slate-400">본인 부담</p><p className="text-lg font-bold text-emerald-600">{formatKRW(totals.copay)}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
