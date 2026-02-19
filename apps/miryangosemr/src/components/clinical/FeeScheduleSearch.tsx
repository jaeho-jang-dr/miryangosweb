'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FeeScheduleItemFull, FeeCategory, FEE_CATEGORY_NAMES } from '@/types/fee-schedule';
import { resolve3TierPrice, getCategoryName } from '@/lib/fee-engine';
import { formatKRW } from '@/lib/fee-calculator';
import { Search, X } from 'lucide-react';

interface FeeScheduleSearchProps {
  onSelect: (item: FeeScheduleItemFull) => void;
  category?: FeeCategory;
  placeholder?: string;
  showPrice?: boolean;
}

const CATEGORY_TABS: { code: FeeCategory | ''; label: string }[] = [
  { code: '', label: '전체' },
  { code: '05', label: '내복약' },
  { code: '08', label: '근육주' },
  { code: '09', label: '정맥주' },
  { code: '17', label: '처치' },
  { code: '18', label: '수술' },
  { code: '21', label: '검사' },
  { code: '23', label: '방사선' },
  { code: '15', label: '이학요법' },
  { code: '13', label: '재료' },
];

export default function FeeScheduleSearch({ onSelect, category, placeholder, showPrice = true }: FeeScheduleSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<FeeScheduleItemFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | ''>(category || '');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const q = searchText.trim();
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const constraints = [];
        if (selectedCategory) {
          constraints.push(where('categoryCode', '==', selectedCategory));
        }
        constraints.push(orderBy('name'));
        constraints.push(limit(100));

        const snap = await getDocs(query(collection(db, 'fee_schedule_items'), ...constraints));
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as FeeScheduleItemFull);

        const upper = q.toUpperCase();
        const filtered = items.filter(item =>
          !item.isDiscontinued &&
          (item.name.includes(q) ||
           item.prescriptionCode.toUpperCase().includes(upper) ||
           item.hiraCode.toUpperCase().includes(upper) ||
           (item.searchIndex && item.searchIndex.includes(q)))
        ).slice(0, 15);

        setResults(filtered);
        setIsOpen(filtered.length > 0);
        setHighlightIndex(-1);
      } catch (e) {
        console.error('Fee search error:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, selectedCategory]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen, highlightIndex, results]);

  const handleSelect = (item: FeeScheduleItemFull) => {
    onSelect(item);
    setSearchText('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Category tabs */}
      {!category && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.code}
              type="button"
              onClick={() => setSelectedCategory(tab.code as FeeCategory | '')}
              className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
                selectedCategory === tab.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder || '수가코드 또는 처방명 검색...'}
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
        />
        {searchText && (
          <button
            type="button"
            onClick={() => { setSearchText(''); setResults([]); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((item, idx) => {
            const price = resolve3TierPrice(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                  idx === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                } ${idx > 0 ? 'border-t border-slate-50' : ''}`}
              >
                <span className="text-xs font-mono text-blue-600 w-16 shrink-0">{item.prescriptionCode}</span>
                <span className="flex-1 text-slate-800 truncate">{item.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                  {getCategoryName(item.categoryCode)}
                </span>
                {showPrice && price > 0 && (
                  <span className="text-xs font-medium text-emerald-600 shrink-0">{formatKRW(price)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
