'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Pill, Check, Loader2 } from 'lucide-react';
// import { PRESCRIPTION_LIST } from '@/data/clinical-resources'; // Deprecated

interface DrugItem {
    id: string;
    name: string;
    ingredient: string;
    category: string;
    unit: string;
}

interface PrescriptionModuleProps {
    onAddOrder: (orderText: string) => void;
}

export default function PrescriptionModule({ onAddOrder }: PrescriptionModuleProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<DrugItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);
    const [dosage, setDosage] = useState('1');
    const [frequency, setFrequency] = useState('3'); // #/day
    const [days, setDays] = useState('3');
    
    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }
            // If search term matches selected drug, don't search again
            if (selectedDrug && searchTerm === selectedDrug.name) return;

            setLoading(true);
            try {
                const res = await fetch(`/api/clinical/drugs/search?q=${encodeURIComponent(searchTerm)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, selectedDrug]);

    const handleAdd = () => {
        if (!selectedDrug) return;

        // Format: DrugName (Dosage / Freq * Days)
        const orderText = `${selectedDrug.name} [ ${dosage}${selectedDrug.unit} / ${frequency}회 / ${days}일 ]`;
        onAddOrder(orderText);
        
        // Reset
        setSelectedDrug(null);
        setSearchTerm('');
        setSearchResults([]);
        setDosage('1');
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <Pill className="w-4 h-4 text-blue-600" />
                    약물 처방 (DB 연동)
                </h3>
            </div>

            <div className="p-4 space-y-4">
                {/* Search Box */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="약물 검색 (예: Tylenol)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                    />
                    {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
                    
                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && !selectedDrug && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                            {searchResults.map(drug => (
                                <button
                                    key={drug.id}
                                    onClick={() => {
                                        setSelectedDrug(drug);
                                        setSearchTerm(drug.name);
                                        setSearchResults([]);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex justify-between items-center border-b border-slate-50 last:border-0"
                                >
                                    <div>
                                        <div className="font-medium text-slate-700">{drug.name}</div>
                                        <div className="text-[10px] text-slate-400">{drug.ingredient}</div>
                                    </div>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{drug.category}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Drug & Options */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Selected Drug</span>
                        <span className="text-sm font-bold text-blue-700">
                            {selectedDrug ? selectedDrug.name : '약물을 선택하세요'}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Dosage */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">1회 투약량 ({selectedDrug?.unit || 'Tab'})</label>
                            <div className="flex rounded-md shadow-sm">
                                <input
                                    type="number"
                                    value={dosage}
                                    onChange={(e) => setDosage(e.target.value)}
                                    className="block w-full rounded-md border-slate-300 py-1.5 pl-3 text-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border"
                                />
                            </div>
                        </div>


                        {/* Frequency */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">1일 횟수 (회)</label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="block w-full rounded-md border-slate-300 py-1.5 pl-3 text-sm focus:border-blue-500 focus:ring-blue-500 border bg-white"
                            >
                                <option value="1">1회 (qd)</option>
                                <option value="2">2회 (bid)</option>
                                <option value="3">3회 (tid)</option>
                                <option value="4">4회 (qid)</option>
                            </select>
                        </div>

                        {/* Days */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">투약 일수 (일)</label>
                            <div className="flex gap-1">
                                {[3, 5, 7].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDays(d.toString())}
                                        className={`flex-1 text-xs rounded border ${days === d.toString() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!selectedDrug}
                        className={`w-full py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${selectedDrug
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Plus className="w-4 h-4" /> 처방 목록에 추가
                    </button>
                </div>
            </div>
        </div>
    );
}
