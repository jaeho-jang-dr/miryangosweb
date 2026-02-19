'use client';

import React from 'react';
import { CheckCircle, X, ArrowRight, FlaskConical, Stethoscope, CreditCard } from 'lucide-react';

interface ConfirmCompleteModalProps {
    patientName: string;
    nextStatus: string;
    chartSummary: {
        cc?: string;
        diagnosis?: string;
        plan?: string;
        testOrder?: string;
    };
    saving?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DEST_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    testing: { label: '검사실', icon: <FlaskConical className="w-5 h-5" />, color: 'bg-orange-100 text-orange-700' },
    treatment: { label: '치료실', icon: <Stethoscope className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700' },
    completed: { label: '수납', icon: <CreditCard className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-700' },
};

export default function ConfirmCompleteModal({
    patientName,
    nextStatus,
    chartSummary,
    saving,
    onConfirm,
    onCancel,
}: ConfirmCompleteModalProps) {
    const dest = DEST_CONFIG[nextStatus] || DEST_CONFIG.completed;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6" aria-hidden="true" />
                        <h3 id="confirm-modal-title" className="text-lg font-bold">진료 완료 확인</h3>
                    </div>
                    <button onClick={onCancel} aria-label="모달 닫기" className="p-1 hover:bg-white/20 rounded-lg">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Patient & Destination */}
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-800">{patientName}</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${dest.color}`}>
                            {dest.icon}
                            <ArrowRight className="w-3.5 h-3.5" />
                            {dest.label}
                        </div>
                    </div>

                    {/* Chart Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">차트 요약</h4>
                        {chartSummary.cc && (
                            <div>
                                <span className="font-bold text-slate-600">C.C:</span>{' '}
                                <span className="text-slate-700">{chartSummary.cc.substring(0, 80)}{chartSummary.cc.length > 80 ? '...' : ''}</span>
                            </div>
                        )}
                        {chartSummary.diagnosis && (
                            <div>
                                <span className="font-bold text-slate-600">진단:</span>{' '}
                                <span className="text-slate-700">{chartSummary.diagnosis.substring(0, 80)}{chartSummary.diagnosis.length > 80 ? '...' : ''}</span>
                            </div>
                        )}
                        {chartSummary.testOrder && (
                            <div>
                                <span className="font-bold text-slate-600">검사:</span>{' '}
                                <span className="text-slate-700">{chartSummary.testOrder.substring(0, 80)}{chartSummary.testOrder.length > 80 ? '...' : ''}</span>
                            </div>
                        )}
                        {chartSummary.plan && (
                            <div>
                                <span className="font-bold text-slate-600">Plan:</span>{' '}
                                <span className="text-slate-700">{chartSummary.plan.substring(0, 80)}{chartSummary.plan.length > 80 ? '...' : ''}</span>
                            </div>
                        )}
                        {!chartSummary.cc && !chartSummary.diagnosis && !chartSummary.plan && (
                            <p className="text-slate-400 italic">차트 내용 없음</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={saving}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        {saving ? '저장 중...' : '확인 (완료)'}
                    </button>
                </div>
            </div>
        </div>
    );
}
