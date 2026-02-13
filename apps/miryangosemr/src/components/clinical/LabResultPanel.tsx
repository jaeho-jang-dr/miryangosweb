'use client';

import { useState } from 'react';
import { LabPanel, LabItem, getResultStatus, formatResultEntry } from '@/lib/lab-panels';

interface LabResultPanelProps {
    panels: LabPanel[];
    onResultsComplete: (formattedResults: string) => void;
}

interface ResultValue {
    panelId: string;
    itemName: string;
    value: string;
}

export default function LabResultPanel({ panels, onResultsComplete }: LabResultPanelProps) {
    const [results, setResults] = useState<ResultValue[]>([]);

    const getResultValue = (panelId: string, itemName: string) => {
        return results.find(r => r.panelId === panelId && r.itemName === itemName)?.value || '';
    };

    const setResultValue = (panelId: string, itemName: string, value: string) => {
        setResults(prev => {
            const existing = prev.findIndex(r => r.panelId === panelId && r.itemName === itemName);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { panelId, itemName, value };
                return updated;
            }
            return [...prev, { panelId, itemName, value }];
        });
    };

    const getStatusColor = (value: string, item: LabItem): string => {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        const status = getResultStatus(num, item);
        if (status === 'high') return 'bg-red-50 border-red-300 text-red-800';
        if (status === 'low') return 'bg-blue-50 border-blue-300 text-blue-800';
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    };

    const handleComplete = () => {
        const lines: string[] = [];
        panels.forEach(panel => {
            const panelResults: string[] = [];
            panel.items.forEach(item => {
                const val = getResultValue(panel.id, item.name);
                if (val) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                        panelResults.push(formatResultEntry(item.name, num, item));
                    }
                }
            });
            if (panelResults.length > 0) {
                lines.push(`[${panel.name}]`);
                lines.push(...panelResults);
            }
        });
        onResultsComplete(lines.join('\n'));
    };

    const filledCount = results.filter(r => r.value.trim()).length;
    const totalItems = panels.reduce((sum, p) => sum + p.items.length, 0);

    return (
        <div className="space-y-4">
            {panels.map(panel => (
                <div key={panel.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700">{panel.name} ({panel.nameKo})</h4>
                    </div>
                    <div className="p-3 space-y-2">
                        {panel.items.map(item => {
                            const val = getResultValue(panel.id, item.name);
                            const statusClass = val ? getStatusColor(val, item) : '';
                            return (
                                <div key={item.name} className="flex items-center gap-3">
                                    <label className="text-xs font-medium text-slate-600 w-36 truncate">{item.name}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={val}
                                        onChange={(e) => setResultValue(panel.id, item.name, e.target.value)}
                                        className={`w-24 px-2 py-1.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 ${statusClass || 'border-slate-200'}`}
                                        placeholder="값"
                                    />
                                    <span className="text-xs text-slate-400">{item.unit}</span>
                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                        참조: {item.refRange}
                                    </span>
                                    {val && !isNaN(parseFloat(val)) && (
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                            getResultStatus(parseFloat(val), item) === 'normal'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : getResultStatus(parseFloat(val), item) === 'high'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {getResultStatus(parseFloat(val), item) === 'normal' ? '정상' :
                                             getResultStatus(parseFloat(val), item) === 'high' ? '↑높음' : '↓낮음'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">{filledCount}/{totalItems} 항목 입력됨</span>
                <button
                    onClick={handleComplete}
                    disabled={filledCount === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-colors"
                >
                    구조화 결과 적용
                </button>
            </div>
        </div>
    );
}
