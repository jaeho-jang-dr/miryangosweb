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
                icon="👁️"
                title="시진 (Inspection)"
                value={chart.physicalExam?.inspection || ''}
                onChange={(v) => updateField(['physicalExam', 'inspection'], v)}
                status={chart.physicalExam?.inspection ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🤲"
                title="촉진 (Palpation)"
                value={chart.physicalExam?.palpation || ''}
                onChange={(v) => updateField(['physicalExam', 'palpation'], v)}
                status={chart.physicalExam?.palpation ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🔄"
                title="관절 가동 범위 (ROM)"
                value={chart.physicalExam?.rangeOfMotion || ''}
                onChange={(v) => updateField(['physicalExam', 'rangeOfMotion'], v)}
                status={chart.physicalExam?.rangeOfMotion ? 'complete' : 'pending'}
            />
            <EditableSection
                icon="🧪"
                title="특수 검사 (Special Tests)"
                value={chart.physicalExam?.specialTests?.join(', ') || ''}
                onChange={(v) => {
                    const tests = v.split(',').map(s => s.trim()).filter(Boolean);
                    const newChart = { ...chart, physicalExam: { ...chart.physicalExam, specialTests: tests } };
                    onChange?.(newChart);
                }}
                status={chart.physicalExam?.specialTests?.length ? 'complete' : 'pending'}
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

function SoapNoteView({ chart, onChange }: { chart: SoapNote, onChange?: (c: SoapNote) => void }) {
    const updateField = (path: string[], value: string | number) => {
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
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 border-b border-slate-100 pb-1 uppercase tracking-widest">S: Subjective</h4>
                <EditableSection
                    icon="🎯"
                    title="증상 (Symptoms)"
                    value={chart.subjective.symptoms.join(', ')}
                    onChange={(v) => {
                        const symptoms = v.split(',').map(s => s.trim()).filter(Boolean);
                        const newChart = { ...chart, subjective: { ...chart.subjective, symptoms } };
                        onChange?.(newChart);
                    }}
                    status={chart.subjective.symptoms.length ? 'complete' : 'pending'}
                />
                <EditableSection
                    icon="🔄"
                    title="이전 방문 이후 변화"
                    value={chart.subjective.changesSinceLastVisit || ''}
                    onChange={(v) => updateField(['subjective', 'changesSinceLastVisit'], v)}
                    status={chart.subjective.changesSinceLastVisit ? 'complete' : 'pending'}
                />
                <EditableSection
                    icon="⚡"
                    title="통증 정도 (0-10)"
                    value={chart.subjective.painLevel?.toString() || ''}
                    onChange={(v) => updateField(['subjective', 'painLevel'], parseInt(v) || 0)}
                    status={chart.subjective.painLevel !== undefined ? 'complete' : 'pending'}
                />
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 border-b border-slate-100 pb-1 uppercase tracking-widest">O: Objective</h4>
                <EditableSection
                    icon="🤲"
                    title="이학적 소견"
                    value={chart.objective.physicalFindings.join(', ')}
                    onChange={(v) => {
                        const findings = v.split(',').map(s => s.trim()).filter(Boolean);
                        const newChart = { ...chart, objective: { ...chart.objective, physicalFindings: findings } };
                        onChange?.(newChart);
                    }}
                    status={chart.objective.physicalFindings.length ? 'complete' : 'pending'}
                />
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 border-b border-slate-100 pb-1 uppercase tracking-widest">A: Assessment</h4>
                <EditableSection
                    icon="🩺"
                    title="진단 (Diagnosis)"
                    value={chart.assessment.diagnosis.join(', ')}
                    onChange={(v) => {
                        const dx = v.split(',').map(s => s.trim()).filter(Boolean);
                        const newChart = { ...chart, assessment: { ...chart.assessment, diagnosis: dx } };
                        onChange?.(newChart);
                    }}
                    status={chart.assessment.diagnosis.length ? 'complete' : 'pending'}
                />
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 border-b border-slate-100 pb-1 uppercase tracking-widest">P: Plan</h4>
                <EditableSection
                    icon="📋"
                    title="치료 계획"
                    value={chart.plan.medications?.join(', ') || chart.plan.physicalTherapy?.join(', ') || ''}
                    onChange={(v) => {
                        const plan = v.split(',').map(s => s.trim()).filter(Boolean);
                        const newChart = { ...chart, plan: { ...chart.plan, medications: plan } };
                        onChange?.(newChart);
                    }}
                    status={chart.plan.medications?.length || chart.plan.physicalTherapy?.length ? 'complete' : 'pending'}
                />
            </div>
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
            badgeColor: 'bg-emerald-100 text-emerald-700',
            borderColor: 'border-emerald-100 bg-white',
            label: '작성됨'
        },
        partial: {
            badge: '⏳',
            badgeColor: 'bg-amber-100 text-amber-700',
            borderColor: 'border-amber-100 bg-amber-50/30',
            label: '부분 작성'
        },
        pending: {
            badge: '⚪',
            badgeColor: 'bg-slate-100 text-slate-400',
            borderColor: 'border-slate-100 bg-slate-50/30',
            label: '대기 중'
        }
    };

    const config = statusConfig[status];

    return (
        <div className={`group p-4 border rounded-2xl transition-all duration-300 hover:shadow-md hover:border-emerald-200 ${config.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-lg group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-300">
                        {icon}
                    </div>
                    <span className="font-bold text-slate-700 tracking-tight">{title}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.badgeColor}`}>
                    <span>{config.badge}</span>
                    <span>{config.label}</span>
                </div>
            </div>
            
            <div className="pl-0">
                {onChange ? (
                    <textarea 
                        className="w-full px-3 py-2.5 text-sm text-slate-700 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none bg-white transition-all placeholder:text-slate-300"
                        rows={value && value.length > 50 ? 3 : 2}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={`${title}을(를) 입력하세요...`}
                    />
                ) : (
                    <div className="px-3 py-2 text-sm text-slate-600 leading-relaxed font-medium">
                         {value || <span className="text-slate-300 italic font-normal">데이터를 기다리는 중...</span>}
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
