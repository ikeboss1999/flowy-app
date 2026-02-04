"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, CheckCircle, AlertCircle, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppSettings() {
    const [status, setStatus] = useState<string>("idle"); // idle, checking, available, not-available, downloading, downloaded, error
    const [progress, setProgress] = useState<any>(null);
    const [version, setVersion] = useState<string>("...");
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        // Get current version
        if (window.electron) {
            window.electron.getAppVersion().then(setVersion);

            // Listen for status updates
            const cleanup = window.electron.onUpdateStatus((newStatus, data) => {
                console.log("Update status:", newStatus, data);
                setStatus(newStatus);
                if (newStatus === 'progress') {
                    setStatus('downloading');
                    setProgress(data);
                }
                if (newStatus === 'error') {
                    setErrorMessage(data);
                }
            });
            return cleanup;
        }
    }, []);

    const checkForUpdates = async () => {
        if (window.electron) {
            setStatus("checking");
            setErrorMessage("");
            await window.electron.checkForUpdates();
        }
    };

    const installUpdate = async () => {
        if (window.electron) {
            await window.electron.quitAndInstall();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <RefreshCw className="h-32 w-32 text-indigo-900" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Anwendungs-Updates</h2>
                        <p className="text-slate-500 font-medium max-w-lg">
                            Halten Sie FlowY auf dem neuesten Stand, um von den neuesten Funktionen und Sicherheitsverbesserungen zu profitieren.
                        </p>
                    </div>

                    <div className="flex items-center gap-12 border-t border-slate-100 pt-8">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Installierte Version</p>
                            <p className="text-3xl font-black text-indigo-600 tracking-tight">v{version}</p>
                        </div>

                        <div className="flex-1">
                            {/* Status Area */}
                            {status === "idle" && (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Bereit zur Prüfung</span>
                                </div>
                            )}

                            {status === "checking" && (
                                <div className="flex items-center gap-3 text-indigo-600 animate-pulse">
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    <span className="font-bold">Suche nach Updates...</span>
                                </div>
                            )}

                            {status === "not-available" && (
                                <div className="flex items-center gap-3 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-bold">Sie sind auf dem neuesten Stand!</span>
                                </div>
                            )}

                            {status === "available" && (
                                <div className="flex items-center gap-3 text-indigo-600">
                                    <ArrowUpCircle className="h-5 w-5 animate-bounce" />
                                    <span className="font-bold">Neue Version verfügbar! Wird heruntergeladen...</span>
                                </div>
                            )}

                            {status === "downloading" && progress && (
                                <div className="w-full max-w-md space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-indigo-600 uppercase tracking-wide">
                                        <span>Herunterladen...</span>
                                        <span>{Math.round(progress.percent)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-indigo-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                            style={{ width: `${progress.percent}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 text-right font-mono">
                                        {(progress.transferred / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                </div>
                            )}

                            {status === "downloaded" && (
                                <div className="flex items-center gap-3 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-bold">Update bereit zur Installation</span>
                                </div>
                            )}

                            {status === "error" && (
                                <div className="flex items-center gap-3 text-red-500">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="font-bold">Fehler beim Update: {errorMessage}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            {status === "downloaded" ? (
                                <button
                                    onClick={installUpdate}
                                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                >
                                    <Download className="h-5 w-5" />
                                    Jetzt neu starten & installieren
                                </button>
                            ) : (
                                <button
                                    onClick={checkForUpdates}
                                    disabled={status === "checking" || status === "downloading" || status === "available"}
                                    className={cn(
                                        "px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg",
                                        status === "checking" || status === "downloading" || status === "available"
                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <RefreshCw className={cn("h-5 w-5", status === "checking" && "animate-spin")} />
                                    Nach Updates suchen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
