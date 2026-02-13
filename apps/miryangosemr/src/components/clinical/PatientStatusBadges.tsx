'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Visit, ClinicalStatus } from '@shared/types/clinical';
import { changeVisitStatus, STATUS_LABELS } from '@shared/lib/workflow-engine';

interface PatientStatusPopoverProps {
    visit: Visit;
    className?: string;
    currentPage?: ClinicalStatus;
}

type NavigationTarget = {
    status: ClinicalStatus;
    label: string;
    color: string;
};

function getNavigationButtons(currentStatus: ClinicalStatus): NavigationTarget[] {
    switch (currentStatus) {
        case 'reception':
            return [
                { status: 'consulting', label: '진료실로', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
            ];
        case 'consulting':
            return [
                { status: 'consulting', label: '진료실로', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                { status: 'testing', label: '검사실로', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                { status: 'treatment', label: '치료실로', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                { status: 'completed', label: '수납으로', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            ];
        case 'testing':
            return [
                { status: 'consulting', label: '진료실로', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                { status: 'completed', label: '수납으로', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            ];
        case 'treatment':
            return [
                { status: 'consulting', label: '진료실로', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                { status: 'completed', label: '수납으로', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            ];
        case 'completed':
            return [
                { status: 'consulting', label: '진료실로', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
            ];
        default:
            return [];
    }
}

function PatientStatusBadgesInner({ visit, className = '', currentPage }: PatientStatusPopoverProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasTestOrder = !!visit.testOrder?.trim();
    const hasTestResult = !!visit.testResult?.trim() || visit.testStatus === 'completed';
    const hasTreatmentOrder = !!visit.treatmentNote?.trim();

    const handleMouseEnter = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setIsOpen(true); };
    const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setIsOpen(false), 200); };

    useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

    const handleNavigate = async (e: React.MouseEvent, newStatus: ClinicalStatus) => {
        e.stopPropagation();
        if (loading) return;

        if (newStatus === 'consulting') {
            if (visit.status !== 'consulting') {
                setLoading(true);
                try { await changeVisitStatus(visit.id, 'consulting'); } catch (error) { alert('상태 변경 실패: ' + (error as Error).message); setLoading(false); return; }
                setLoading(false);
            }
            setIsOpen(false);
            router.push(`/consulting/${visit.id}`);
            return;
        }

        setLoading(true);
        try { await changeVisitStatus(visit.id, newStatus); setIsOpen(false); } catch (error) { alert('상태 변경 실패: ' + (error as Error).message); } finally { setLoading(false); }
    };

    const navButtons = getNavigationButtons(visit.status).filter(btn => !currentPage || btn.status !== currentPage);

    return (
        <div className={`relative inline-flex ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={popoverRef}>
            <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${hasTestOrder ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    검사오더 {hasTestOrder ? '✓' : '✗'}
                </span>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${hasTestResult ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    검사결과 {hasTestResult ? '✓' : '✗'}
                </span>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${hasTreatmentOrder ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    치료오더 {hasTreatmentOrder ? '✓' : '✗'}
                </span>
            </div>
            {isOpen && (
                <div className="absolute z-50 left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-slate-800 text-sm">{visit.patientName}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            visit.status === 'reception' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            visit.status === 'consulting' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            visit.status === 'testing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            visit.status === 'treatment' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                            {STATUS_LABELS[visit.status]}
                        </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                        <div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${hasTestOrder ? 'bg-emerald-500' : 'bg-slate-300'}`} /><span className="text-slate-500 w-14">검사오더:</span><span className="font-medium truncate flex-1">{hasTestOrder ? visit.testOrder : '(없음)'}</span></div>
                        <div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${hasTestResult ? 'bg-emerald-500' : 'bg-slate-300'}`} /><span className="text-slate-500 w-14">검사결과:</span><span className="font-medium truncate flex-1">{hasTestResult ? (visit.testResult || '완료') : '(미입력)'}</span></div>
                        <div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${hasTreatmentOrder ? 'bg-emerald-500' : 'bg-slate-300'}`} /><span className="text-slate-500 w-14">치료오더:</span><span className="font-medium truncate flex-1">{hasTreatmentOrder ? visit.treatmentNote : '(없음)'}</span></div>
                    </div>
                    {navButtons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                            {navButtons.map((btn) => (
                                <button key={btn.status} onClick={(e) => handleNavigate(e, btn.status)} disabled={loading} className={`px-2.5 py-1.5 text-[11px] font-bold border rounded-lg transition-colors disabled:opacity-50 ${btn.color}`}>
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const PatientStatusBadges = React.memo(PatientStatusBadgesInner);
export default PatientStatusBadges;
