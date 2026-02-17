"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export function InputDialog({
    isOpen,
    title,
    message,
    placeholder = "Eingabe...",
    initialValue = "",
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel
}: InputDialogProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [inputValue, setInputValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            setInputValue(initialValue);
            document.body.style.overflow = "hidden";
            // Focus input after animation
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            document.body.style.overflow = "unset";
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputValue.trim()) {
            onConfirm(inputValue.trim());
        }
    };

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
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 text-indigo-500">
                    <Edit3 className="h-8 w-8" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-6">
                    {message}
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="w-full py-4 rounded-2xl font-black text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {confirmLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
