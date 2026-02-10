'use client';

import type { InitialVisitChart } from '@/lib/medical/templates/initial-visit-template';
import type { SoapNote } from '@/lib/medical/templates/soap-note-template';


interface ChartPreviewProps {
    chart: InitialVisitChart | SoapNote | null;
    isGenerating: boolean;
    onChartChange?: (newChart: InitialVisitChart | SoapNote) => void;
}

export function ChartPreview({ chart, isGenerating, onChartChange }: ChartPreviewProps) {
    if (!chart && !isGenerating) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    📋 자동 생성 차트
                </h3>
                <div className="flex items-center justify-center h-64 text-slate-400">
                    녹음을 완료하면 차트가 자동으로 생성됩니다.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                    📋 자동 생성 차트
                </h3>
                {isGenerating && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full animate-pulse">
                        생성 중...
                    </span>
                )}
            </div>

            {isGenerating ? (
                <div className="space-y-3">
                    <ChartSectionSkeleton />
                    <ChartSectionSkeleton />
                    <ChartSectionSkeleton />
                </div>
            ) : chart ? (
                <div className="space-y-4">
                    {chart.visitType === 'initial' ? (
                        <InitialChartView 
                            chart={chart as InitialVisitChart} 
                            onChange={onChartChange as (c: InitialVisitChart) => void} 
                        />
                    ) : (
                        <SoapNoteView 
                            chart={chart as SoapNote} 
                            onChange={onChartChange as (c: SoapNote) => void}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
}

function InitialChartView({ chart, onChange }: { chart: InitialVisitChart, onChange?: (c: InitialVisitChart) => void }) {
    const updateField = (path: string[], value: string) => {
        if (!onChange) return;
        const newChart = JSON.parse(JSON.stringify(chart));
        let current = newChart;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        onChange(newChart);
    };


    return (
        <>
            <EditableSection
                icon="🎯"
                title="주소 (Chief Complaint)"
                value={chart.chiefComplaint.complaint}
                onChange={(v) => updateField(['chiefComplaint', 'complaint'], v)}
                status={chart.chiefComplaint.complaint ? 'complete' : 'pending'}
            />
             <EditableSection
                icon="🕐"
                title="발병 시기"
                value={chart.history.onsetDate || ''}
                onChange={(v) => updateField(['history', 'onsetDate'], v)}
                status={chart.history.onsetDate ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="📍"
                title="통증 부위 (Pain Location)"
                value={chart.history.painLocation?.join(', ') || ''}
                onChange={(v) => {
                    const locations = v.split(',').map(s => s.trim()).filter(Boolean);
                    const newChart = { ...chart, history: { ...chart.history, painLocation: locations } };
                    onChange?.(newChart);
                }}
                status={chart.history.painLocation?.length ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="💥"
                title="외상력 (Trauma History)"
                value={chart.history.traumaHistory || ''}
                onChange={(v) => updateField(['history', 'traumaHistory'], v)}
                status={chart.history.traumaHistory ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🏥"
                title="수술력 (Surgery History)"
                value={chart.history.surgeryHistory || ''}
                onChange={(v) => updateField(['history', 'surgeryHistory'], v)}
                status={chart.history.surgeryHistory ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="💼"
                title="직업력"
                value={chart.occupationalHistory.occupation || ''}
                onChange={(v) => updateField(['occupationalHistory', 'occupation'], v)}
                status={chart.occupationalHistory.occupation ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🏃"
                title="운동 습관"
                value={chart.occupationalHistory.exercises?.join(', ') || ''}
                onChange={(v) => {
                    const exercises = v.split(',').map(s => s.trim()).filter(Boolean);
                    const newChart = { ...chart, occupationalHistory: { ...chart.occupationalHistory, exercises } };
                    onChange?.(newChart);
                }}
                status={chart.occupationalHistory.exercises?.length ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="📸"
                title="영상 검사 (X-ray Views)"
                value={chart.imagingPlan.xrayViews?.join(', ') || ''}
                onChange={(v) => {
                    const views = v.split(',').map(s => s.trim()).filter(Boolean);
                    const newChart = { ...chart, imagingPlan: { ...chart.imagingPlan, xrayViews: views } };
                    onChange?.(newChart);
                }}
                status={chart.imagingPlan.xrayViews?.length ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🩺"
                title="진단 (Diagnosis)"
                value={chart.diagnosis.suspectedDiagnosis?.join(', ') || ''}
                onChange={(v) => {
                     const dx = v.split(',').map(s => s.trim()).filter(Boolean);
                     const newChart = { ...chart, diagnosis: { ...chart.diagnosis, suspectedDiagnosis: dx } };
                     onChange?.(newChart);
                }}
                status={chart.diagnosis.suspectedDiagnosis?.length ? 'complete' : 'pending'}
            />
        </>
    );
}

function SoapNoteView({}: { chart: SoapNote, onChange?: (c: SoapNote) => void }) {
    // Similarly implement editable fields for SOAP
    // Simplified for brevity, focused on Initial Chart first
    // You can expand this if needed
    return (
        <div className="text-sm text-slate-500 text-center italic">
            SOAP 노트 편집 기능은 준비 중입니다.
        </div>
    ); 
}

function EditableSection({
    icon,
    title,
    value,
    status,
    onChange
}: {
    icon: string;
    title: string;
    value?: string;
    status: 'complete' | 'partial' | 'pending';
    onChange?: (value: string) => void;
}) {
    const statusConfig = {
        complete: {
            badge: '✅',
            badgeColor: 'bg-green-100 text-green-700',
            borderColor: 'border-green-200'
        },
        partial: {
            badge: '⏳',
            badgeColor: 'bg-yellow-100 text-yellow-700',
            borderColor: 'border-yellow-200'
        },
        pending: {
            badge: '⬜',
            badgeColor: 'bg-slate-100 text-slate-500',
            borderColor: 'border-slate-200'
        }
    };

    const config = statusConfig[status];

    return (
        <div className={`p-4 border ${config.borderColor} rounded-lg transition-colors hover:border-blue-300`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-semibold text-slate-700">{title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${config.badgeColor}`}>
                    {config.badge}
                </span>
            </div>
            
            <div className="pl-7">
                {onChange ? (
                    <textarea 
                        className="w-full p-2 text-sm text-slate-700 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-slate-50 focus:bg-white"
                        rows={value && value.length > 50 ? 3 : 2}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="내용을 입력하세요..."
                    />
                ) : (
                    <div className="text-sm text-slate-600">
                         {value || <span className="text-slate-400 italic">대기 중...</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

function ChartSectionSkeleton() {
    return (
        <div className="p-4 border border-slate-200 rounded-lg animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
        </div>
    );
}
