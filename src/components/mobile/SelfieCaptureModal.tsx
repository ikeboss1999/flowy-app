"use client"

import React, { useState, useRef } from "react"
import { Camera, X, Check, RefreshCw, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelfieCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Image: string) => Promise<void>;
    title?: string;
    description?: string;
}

export function SelfieCaptureModal({
    isOpen,
    onClose,
    onSave,
    title = "Profilbild aufnehmen",
    description = "Bitte nimm ein Selfie von dir auf, damit wir dich in der App erkennen können."
}: SelfieCaptureModalProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize image to max 512px height/width
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxSize = 512;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                setPreview(base64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!preview) return;
        setIsSaving(true);
        try {
            await onSave(preview);
            onClose();
        } catch (error) {
            console.error("Failed to save selfie:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => !isSaving && onClose()}
            />

            <div className="w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden flex flex-col relative z-10">
                {/* Drag Handle for mobile feel */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full" />

                <div className="pt-10 px-8 pb-6 text-center">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">
                        {description}
                    </p>
                </div>

                <div className="flex-1 px-8 pb-8 flex flex-col items-center">
                    <div className="relative group">
                        <div className={cn(
                            "w-48 h-48 rounded-[3rem] bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500",
                            preview ? "ring-4 ring-indigo-50" : "ring-4 ring-slate-50"
                        )}>
                            {preview ? (
                                <img src={preview} alt="Selfie Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-20 w-20 text-slate-200" />
                            )}
                        </div>

                        {!isSaving && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 h-14 w-14 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-500 active:scale-90 transition-all border-4 border-white"
                            >
                                {preview ? <RefreshCw className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                            </button>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleCapture}
                    />

                    <div className="w-full mt-10 space-y-3">
                        {preview ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black tracking-widest uppercase text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="h-5 w-5" />
                                            Foto Speichern
                                        </>
                                    )}
                                </button>
                                {!isSaving && (
                                    <button
                                        onClick={() => setPreview(null)}
                                        className="w-full py-4 bg-white text-slate-400 rounded-[2rem] font-black tracking-widest uppercase text-[10px] hover:bg-slate-50 transition-all"
                                    >
                                        Anderes Foto aufnehmen
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black tracking-widest uppercase text-sm hover:bg-indigo-500 transition-all active:scale-95 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                            >
                                <Camera className="h-5 w-5" />
                                Selfie aufnehmen
                            </button>
                        )}

                        {!isSaving && (
                            <button
                                onClick={onClose}
                                className="w-full py-4 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
                            >
                                Vielleicht später
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
