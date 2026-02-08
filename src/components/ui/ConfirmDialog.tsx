"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant: 'danger' | 'primary';
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    variant
}: ConfirmDialogProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            document.body.style.overflow = "unset";
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted) return null;
    if (!visible && !isOpen) return null;

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300",
                isOpen ? "bg-slate-900/60 backdrop-blur-sm opacity-100" : "bg-slate-900/0 backdrop-blur-none opacity-0"
            )}
            onClick={onCancel}
        >
            <div
                className={cn(
                    "bg-white rounded-[32px] w-full max-w-md shadow-2xl transform transition-all duration-300 border border-slate-100 p-8",
                    isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Icon */}
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                    variant === 'danger' ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"
                )}>
                    {variant === 'danger' ? <AlertTriangle className="h-8 w-8" /> : <Info className="h-8 w-8" />}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                            variant === 'danger'
                                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200"
                                : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200"
                        )}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
