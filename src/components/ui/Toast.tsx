"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
        error: <AlertCircle className="h-5 w-5 text-rose-500" />,
        info: <Info className="h-5 w-5 text-indigo-500" />
    };

    const styles = {
        success: "border-emerald-100 bg-emerald-50/80 shadow-emerald-100",
        error: "border-rose-100 bg-rose-50/80 shadow-rose-100",
        info: "border-indigo-100 bg-indigo-50/80 shadow-indigo-100"
    };

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 transform",
                styles[type],
                isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
            )}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-bold text-slate-800 leading-tight">
                {message}
            </p>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 500);
                }}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
