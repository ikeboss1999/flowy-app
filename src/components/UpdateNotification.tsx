"use client";

import { useState, useEffect } from "react";
import { X, Gift, Download, RefreshCw, ArrowUpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpdateInfo {
    version: string;
    releaseNotes?: string | Array<any>;
}

export function UpdateNotification() {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<string>("idle");
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [progress, setProgress] = useState<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electron) return;

        const cleanup = window.electron.onUpdateStatus((newStatus: string, data: any) => {
            console.log("[GlobalUpdate] Status:", newStatus, data);

            if (newStatus === 'available') {
                setStatus('available');
                setUpdateInfo(data);
                setIsOpen(true);
            }

            if (newStatus === 'progress') {
                setStatus('downloading');
                setProgress(data);
                setIsOpen(true); // Ensure open if it wasn't
            }

            if (newStatus === 'downloaded') {
                setStatus('downloaded');
                setUpdateInfo(data);
                setIsOpen(true);
            }

            if (newStatus === 'error') {
                setStatus('error');
                setUpdateInfo(prev => ({ ...prev!, errorMessage: data }));
                console.error("Update error:", data);
            }
        });

        return cleanup;
    }, []);

    if (!isOpen) return null;

    // No dismiss handler - mandatory update
    const handleInstall = () => {
        if (window.electron) {
            window.electron.quitAndInstall();
        }
    };

    const translateReleaseNotes = (notes: string) => {
        // Common release note keywords translation map
        const translations: Record<string, string> = {
            "Improvements": "Verbesserungen",
            "Bug Fixes": "Fehlerbehebungen",
            "Bug fixes": "Fehlerbehebungen",
            "Features": "Neue Funktionen",
            "New": "Neu",
            "Fixed": "Behoben",
            "Changed": "Geändert",
            "Removed": "Entfernt",
            "Performance": "Leistung",
            "Stability": "Stabilität",
            "Documentation": "Dokumentation",
            "General performance improvements and bug fixes": "Allgemeine Leistungsverbesserungen und Fehlerbehebungen",
            "Enhanced stability for native modules": "Verbesserte Stabilität für native Module"
        };

        let translated = notes;
        Object.entries(translations).forEach(([en, de]) => {
            // Match whole words or common headings
            const regex = new RegExp(`\\b${en}\\b|#{1,6}\\s*${en}`, 'gi');
            translated = translated.replace(regex, (match) => {
                // Preserve markdown symbols if matched a heading
                if (match.startsWith('#')) {
                    const hashes = match.match(/^#+/)?.[0] || '';
                    return `${hashes} ${de}`;
                }
                return de;
            });
        });

        return translated;
    };

    const renderReleaseNotes = (notes: string | Array<any> | undefined) => {
        if (!notes) return <p className="text-slate-500 italic">Keine Details verfügbar.</p>;

        if (Array.isArray(notes)) {
            return notes.map((note, i) => (
                <div key={i} className="mb-2">
                    <p className="font-semibold">{note.version}</p>
                    <div dangerouslySetInnerHTML={{ __html: translateReleaseNotes(note.note || "") }} />
                </div>
            ));
        }

        return (
            <div
                className="prose prose-sm max-w-none text-slate-600 space-y-1"
                dangerouslySetInnerHTML={{ __html: translateReleaseNotes(notes) }}
            />
        );
    };

    return (
        // Backdrop for blocking UI (Mandatory Update)
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-6 w-full max-w-lg flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Gift className="h-32 w-32 text-indigo-600" />
                </div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-xl">
                            {status === 'downloaded' ? (
                                <CheckCircleIcon className="h-8 w-8 text-indigo-600" />
                            ) : (
                                <Gift className="h-8 w-8 text-indigo-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-xl">
                                {status === 'downloaded' ? "Update bereit!" : "Update verfügbar"}
                            </h3>
                            <p className="text-indigo-600 font-bold">
                                {updateInfo?.version ? `Version ${updateInfo.version}` : "Neue Version"}
                            </p>
                        </div>
                    </div>
                    {/* No Dismiss Button - Mandatory */}
                </div>

                {/* Release Notes */}
                <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar relative z-10 max-h-[300px]">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Das ist neu
                        </h4>
                        {updateInfo && renderReleaseNotes(updateInfo.releaseNotes)}
                    </div>
                </div>

                {/* Progress / Actions */}
                <div className="mt-auto relative z-10 space-y-4">
                    {status === 'downloading' && progress ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-600 uppercase tracking-wide">
                                <span>Wird heruntergeladen...</span>
                                <span>{Math.round(progress.percent)}%</span>
                            </div>
                            <div className="h-3 w-full bg-indigo-50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 text-right font-mono">
                                {(progress.transferred / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB
                            </p>
                        </div>
                    ) : status === 'downloaded' ? (
                        <button
                            onClick={handleInstall}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Download className="h-5 w-5" />
                            Jetzt neu starten & installieren
                        </button>
                    ) : status === 'error' ? (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-rose-600 font-bold">
                                <X className="h-5 w-5" />
                                <span>Download fehlgeschlagen</span>
                            </div>
                            <p className="text-xs text-rose-500 break-words font-mono">
                                {(updateInfo as any)?.errorMessage || "Ein unbekannter Fehler ist aufgetreten."}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                            >
                                Erneut versuchen
                            </button>
                        </div>
                    ) : (
                        // Initial state (checking or available before progress starts)
                        <div className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 animate-pulse">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Update wird gestartet...
                        </div>
                    )}

                    <p className="text-center text-xs text-slate-400 font-medium">
                        Dieses Update ist erforderlich, um fortzufahren.
                    </p>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
