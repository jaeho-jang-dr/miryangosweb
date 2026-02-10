'use client';

import type { InitialVisitChart } from '@/lib/medical/templates/initial-visit-template';
import type { SoapNote } from '@/lib/medical/templates/soap-note-template';

interface ChartPreviewProps {
    chart: InitialVisitChart | SoapNote | null;
    isGenerating: boolean;
}

export function ChartPreview({ chart, isGenerating }: ChartPreviewProps) {
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
                        <InitialChartView chart={chart as InitialVisitChart} />
                    ) : (
                        <SoapNoteView chart={chart as SoapNote} />
                    )}
                </div>
            ) : null}
        </div>
    );
}

function InitialChartView({ chart }: { chart: InitialVisitChart }) {
    const sections = [
        {
            icon: '🎯',
            title: '주소 (Chief Complaint)',
            content: chart.chiefComplaint.complaint,
            status: chart.chiefComplaint.complaint ? 'complete' : 'pending'
        },
        {
            icon: '📖',
            title: '병력 (History)',
            content: chart.history.onsetDate || chart.history.traumaHistory || chart.history.surgeryHistory,
            status: Object.keys(chart.history).length > 0 ? 'complete' : 'pending'
        },
        {
            icon: '💼',
            title: '직업력',
            content: chart.occupationalHistory.occupation,
            status: chart.occupationalHistory.occupation ? 'complete' : 'pending'
        },
        {
            icon: '🔬',
            title: '이학적 검사',
            content: chart.physicalExam.inspection || chart.physicalExam.palpation,
            status: Object.keys(chart.physicalExam).length > 0 ? 'partial' : 'pending'
        },
        {
            icon: '📸',
            title: '영상 검사',
            content: chart.imagingPlan.xrayViews?.join(', '),
            status: chart.imagingPlan.xrayViews?.length ? 'complete' : 'pending'
        },
        {
            icon: '🩺',
            title: '진단',
            content: chart.diagnosis.suspectedDiagnosis.join(', '),
            status: chart.diagnosis.suspectedDiagnosis.length > 0 ? 'complete' : 'pending'
        }
    ];

    return (
        <>
            {sections.map((section, index) => (
                <ChartSection key={index} {...section} />
            ))}
        </>
    );
}

function SoapNoteView({ chart }: { chart: SoapNote }) {
    const sections = [
        {
            icon: '🗣️',
            title: 'Subjective',
            content: chart.subjective.symptoms.join(', '),
            status: chart.subjective.symptoms.length > 0 ? 'complete' : 'pending'
        },
        {
            icon: '🔍',
            title: 'Objective',
            content: chart.objective.physicalFindings.join(', '),
            status: chart.objective.physicalFindings.length > 0 ? 'complete' : 'pending'
        },
        {
            icon: '📊',
            title: 'Assessment',
            content: chart.assessment.diagnosis.join(', '),
            status: chart.assessment.diagnosis.length > 0 ? 'complete' : 'pending'
        },
        {
            icon: '💊',
            title: 'Plan',
            content: chart.plan.medications?.join(', ') || chart.plan.physicalTherapy?.join(', '),
            status: Object.keys(chart.plan).length > 0 ? 'complete' : 'pending'
        }
    ];

    return (
        <>
            {sections.map((section, index) => (
                <ChartSection key={index} {...section} />
            ))}
        </>
    );
}

function ChartSection({
    icon,
    title,
    content,
    status
}: {
    icon: string;
    title: string;
    content?: string;
    status: 'complete' | 'partial' | 'pending';
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
        <div className={`p-4 border ${config.borderColor} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-semibold text-slate-700">{title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${config.badgeColor}`}>
                    {config.badge}
                </span>
            </div>
            <div className="text-sm text-slate-600 pl-7">
                {content || <span className="text-slate-400 italic">대기 중...</span>}
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
