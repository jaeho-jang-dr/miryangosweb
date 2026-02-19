"use client"

import * as React from "react"
import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    /** 모달 고유 ID (aria-labelledby 연결용) */
    id?: string
}

export function Modal({ isOpen, onClose, title, children, id = "modal-title" }: ModalProps) {
    // ESC 키로 모달 닫기 (접근성)
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={id}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-[70] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl shadow-gray-200/50 sm:p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="모달 닫기">
                                <X className="h-5 w-5" aria-hidden="true" />
                            </Button>
                        </div>
                        <div>{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
