"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
                "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
                isOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"
            )}
            onClick={onClose}
        >
            <div
                className={cn(
                    "bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl transform transition-all duration-300 border border-white/20",
                    isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-xl z-10">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
