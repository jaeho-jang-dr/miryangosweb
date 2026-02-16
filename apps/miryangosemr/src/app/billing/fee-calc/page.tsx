'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { calculateCopay, formatKRW } from '@/lib/fee-calculator';
import { resolve3TierPrice, feeItemToBillingItem } from '@/lib/fee-engine';
import { InsuranceType, COPAY_RATES, BillingItem } from '@/types/billing';
import { FeeScheduleItemFull } from '@/types/fee-schedule';
import { Badge } from '@/components/ui/badge';
import { Calculator, Plus, Trash2, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FeeScheduleSearch = dynamic(() => import('@/components/clinical/FeeScheduleSearch'), { ssr: false });
const BundlePrescriptionPicker = dynamic(() => import('@/components/clinical/BundlePrescriptionPicker'), { ssr: false });

interface CalcItem {
  id: string;
  name: string;
  code: string;
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
  const [mode, setMode] = useState<'search' | 'manual'>('search');

  // Manual entry state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newCovered, setNewCovered] = useState(true);

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newName,
      code: '-',
      basePrice: parseInt(newPrice),
      quantity: parseInt(newQty) || 1,
      isInsuranceCovered: newCovered,
    }]);
    setNewName(''); setNewPrice(''); setNewQty('1');
  };

  const handleFeeItemSelect = (item: FeeScheduleItemFull) => {
    const price = resolve3TierPrice(item);
    const covered = item.cFlag === 1 || item.cFlag === 7;
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      name: item.name,
      code: item.prescriptionCode,
      basePrice: price,
      quantity: item.defaultQuantity || 1,
      isInsuranceCovered: covered,
    }]);
  };

  const handleBundleSelect = async (bundle: { items: { prescriptionCode: string; name: string; quantity: number }[] }) => {
    const newItems: CalcItem[] = bundle.items.map(bi => ({
      id: crypto.randomUUID(),
      name: bi.name,
      code: bi.prescriptionCode,
      basePrice: 0, // Price will need fee lookup
      quantity: bi.quantity,
      isInsuranceCovered: true,
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const totals = items.reduce((acc, item) => {
    const { total, copay, insurance } = calculateCopay(item.basePrice, item.quantity, insuranceType, item.isInsuranceCovered);
    return { total: acc.total + total, copay: acc.copay + copay, insurance: acc.insurance + insurance };
  }, { total: 0, copay: 0, insurance: 0 });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Calculator className="w-6 h-6 text-emerald-600" /> 진료비 계산기</h1>
          <p className="text-sm text-slate-500">수가 항목을 검색하거나 입력하여 본인부담금을 계산합니다.</p>
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

      {/* Add Item — Mode Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-bold text-slate-800">항목 추가</h3>
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setMode('search')} className={`px-3 py-1 text-xs rounded-md border ${mode === 'search' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              <Search className="w-3 h-3 inline mr-1" />수가 검색
            </button>
            <button onClick={() => setMode('manual')} className={`px-3 py-1 text-xs rounded-md border ${mode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              직접 입력
            </button>
          </div>
        </div>

        {mode === 'search' ? (
          <div className="space-y-3">
            <FeeScheduleSearch onSelect={handleFeeItemSelect} placeholder="수가코드 또는 처방명으로 검색..." />
            <BundlePrescriptionPicker onSelectBundle={handleBundleSelect} />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">코드</th>
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
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{item.code}</td>
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
