'use client';

import { X, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { WorkflowToast as ToastType } from '@shared/hooks/useWorkflowEngine';

interface WorkflowToastContainerProps {
    toasts: ToastType[];
    onRemove: (id: string) => void;
}

const TOAST_STYLES = {
    info: { bg: 'bg-blue-600', icon: <ArrowRight className="w-4 h-4" /> },
    success: { bg: 'bg-emerald-600', icon: <CheckCircle className="w-4 h-4" /> },
    warning: { bg: 'bg-amber-600', icon: <Clock className="w-4 h-4" /> },
};

export default function WorkflowToastContainer({ toasts, onRemove }: WorkflowToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => {
                const style = TOAST_STYLES[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`${style.bg} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[420px] pointer-events-auto`}
                    >
                        <div className="flex-shrink-0 p-1 bg-white/20 rounded-lg">{style.icon}</div>
                        <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
                        <button
                            onClick={() => onRemove(toast.id)}
                            aria-label="알림 닫기"
                            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
