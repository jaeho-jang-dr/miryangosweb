'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BundlePrescription } from '@/types/fee-schedule';
import { Search, Package, X, ChevronRight } from 'lucide-react';

interface BundlePrescriptionPickerProps {
  onSelectBundle: (bundle: BundlePrescription) => void;
}

export default function BundlePrescriptionPicker({ onSelectBundle }: BundlePrescriptionPickerProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<BundlePrescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        const snap = await getDocs(
          query(collection(db, 'bundle_prescriptions'), orderBy('name'), limit(50))
        );
        const bundles = snap.docs.map(d => ({ ...d.data(), id: d.id }) as BundlePrescription);

        const upper = q.toUpperCase();
        const filtered = bundles.filter(b =>
          b.name.includes(q) ||
          b.bundleCode.toUpperCase().includes(upper) ||
          (b.searchIndex && b.searchIndex.includes(q))
        ).slice(0, 15);

        setResults(filtered);
        setIsOpen(filtered.length > 0);
      } catch (e) {
        console.error('Bundle search error:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (bundle: BundlePrescription) => {
    onSelectBundle(bundle);
    setSearchText('');
    setResults([]);
    setIsOpen(false);
    setExpandedId(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="묶음처방 검색 (이름 또는 코드)..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-200 outline-none"
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
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {results.map((bundle) => (
            <div key={bundle.id} className="border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === bundle.id ? null : bundle.id)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedId === bundle.id ? 'rotate-90' : ''}`} />
                </button>

                {/* Select bundle */}
                <button
                  type="button"
                  onClick={() => handleSelect(bundle)}
                  className="flex-1 text-left py-2 pr-3 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{bundle.name}</span>
                      <span className="text-xs text-purple-500 ml-2">{bundle.bundleCode}</span>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {bundle.items.length}항목
                    </span>
                  </div>
                </button>
              </div>

              {/* Expanded item preview */}
              {expandedId === bundle.id && (
                <div className="pl-8 pr-3 pb-2 space-y-0.5">
                  {bundle.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 py-0.5">
                      <span className="text-slate-300">{idx + 1}.</span>
                      <span className="font-mono text-blue-500">{item.prescriptionCode}</span>
                      <span className="flex-1 truncate">{item.name}</span>
                      <span>{item.quantity}x{item.frequency}</span>
                      {item.days && <span>{item.days}일</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
