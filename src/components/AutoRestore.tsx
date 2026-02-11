"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, CloudDownload } from "lucide-react";
import { restoreFromCloud } from "@/lib/cloudBackup";

export function AutoRestore({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [_, setForceUpdate] = useState(0);
    const [isRestoring, setIsRestoring] = useState(false);
    const [pendingBackup, setPendingBackup] = useState<{ name: string, date: string } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // SYNCHRONOUS DERIVED STATE (No useEffect lag)
    const hasChecked = typeof window !== 'undefined' ? sessionStorage.getItem('flowy_autorestore_checked') : true;
    const shouldBlock = !!user && !hasChecked;

    useEffect(() => {
        if (!shouldBlock) return;
        if (isRestoring || pendingBackup || showSuccess) return;

        const checkAndRestore = async () => {
            console.log("[AutoRestore] Starting backup check...");

            const timeout = setTimeout(() => {
                console.warn("[AutoRestore] Check timed out, releasing block.");
                sessionStorage.setItem('flowy_autorestore_checked', 'true');
                setForceUpdate(n => n + 1);
            }, 4000);

            try {
                const statusRes = await fetch(`/api/db/status?userId=${user.id}`);
                if (!statusRes.ok) throw new Error("Status API failed");
                const { isEmpty } = await statusRes.json();

                if (!isEmpty) {
                    clearTimeout(timeout);
                    sessionStorage.setItem('flowy_autorestore_checked', 'true');
                    setForceUpdate(n => n + 1);
                    return;
                }

                const { data: list, error: listError } = await supabase.storage
                    .from('backups')
                    .list(user!.id, {
                        limit: 1,
                        sortBy: { column: 'created_at', order: 'desc' },
                    });

                if (listError) throw listError;

                if (!list || list.length === 0) {
                    clearTimeout(timeout);
                    sessionStorage.setItem('flowy_autorestore_checked', 'true');
                    setForceUpdate(n => n + 1);
                    return;
                }

                clearTimeout(timeout);
                const backupFile = list[0];
                setPendingBackup({
                    name: backupFile.name,
                    date: new Date(backupFile.created_at).toLocaleString()
                });

            } catch (error) {
                console.error("[AutoRestore] Fatal error during check:", error);
                clearTimeout(timeout);
                sessionStorage.setItem('flowy_autorestore_checked', 'true');
                setForceUpdate(n => n + 1);
            }
        };

        checkAndRestore();
    }, [shouldBlock, isRestoring, pendingBackup, showSuccess, user]);

    const handleConfirmRestore = async () => {
        if (!pendingBackup || !user) return;
        const backupName = pendingBackup.name;
        setPendingBackup(null);
        setIsRestoring(true);

        try {
            const { data: blob, error: dlError } = await supabase.storage
                .from("backups")
                .download(`${user.id}/${backupName}`);

            if (dlError || !blob) throw dlError;

            const text = await blob.text();
            let jsonData = JSON.parse(text);

            // Inject the current valid user ID to claim the data
            jsonData.currentUserId = user.id;

            const { error: restoreError } = await restoreFromCloud(jsonData);
            if (restoreError) throw restoreError;

            setIsRestoring(false);
            setShowSuccess(true);
        } catch (error) {
            console.error("[AutoRestore] Restore failed:", error);
            setIsRestoring(false);
            sessionStorage.setItem('flowy_autorestore_checked', 'true');
            setForceUpdate(n => n + 1);
        }
    };

    const handleDeclineRestore = () => {
        setPendingBackup(null);
        sessionStorage.setItem('flowy_autorestore_checked', 'true');
        setForceUpdate(n => n + 1);
    };

    const handleSuccessClose = () => {
        sessionStorage.setItem('flowy_autorestore_checked', 'true');
        window.location.reload();
    };

    // BLOCKING UI
    if (shouldBlock || isRestoring || pendingBackup || showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020205] overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative flex flex-col items-center gap-10 p-12 animate-in fade-in zoom-in-95 duration-1000 max-w-xl w-full">
                    {pendingBackup ? (
                        <div className="bg-[#0F0F12]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-8 shadow-2xl">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
                                <div className="relative h-20 w-20 bg-white/[0.03] backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10">
                                    <CloudDownload className="h-10 w-10 text-indigo-400" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white tracking-tight font-outfit">Cloud Backup <span className="text-indigo-400">Gefunden</span></h3>
                                <p className="text-slate-400 font-medium leading-relaxed">
                                    Willkommen zurück auf FlowY! Wir haben ein Backup vom <span className="text-white font-bold">{pendingBackup.date}</span> gefunden. Möchten Sie Ihre Daten jetzt wiederherstellen?
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                <button
                                    onClick={handleDeclineRestore}
                                    className="py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-white/5 active:scale-95"
                                >
                                    Überspringen
                                </button>
                                <button
                                    onClick={handleConfirmRestore}
                                    className="py-4 bg-primary-gradient text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Wiederherstellen
                                </button>
                            </div>
                        </div>
                    ) : showSuccess ? (
                        <div className="bg-[#0F0F12]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-8 shadow-2xl">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl" />
                                <div className="relative h-20 w-20 bg-white/[0.03] backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10">
                                    <div className="h-10 w-10 text-emerald-400 bg-emerald-400/10 rounded-full flex items-center justify-center">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white tracking-tight font-outfit">Erfolgreich <span className="text-emerald-400">geladen</span></h3>
                                <p className="text-slate-400 font-medium leading-relaxed">
                                    Ihre Daten wurden erfolgreich aus der Cloud synchronisiert. FlowY wird jetzt neu gestartet.
                                </p>
                            </div>
                            <button
                                onClick={handleSuccessClose}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Jetzt Starten
                            </button>
                        </div>
                    ) : isRestoring ? (
                        <>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="relative h-24 w-24 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
                                    <CloudDownload className="h-10 w-10 text-indigo-400 animate-bounce" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <h3 className="text-3xl font-black text-white tracking-tight font-outfit">
                                    Daten werden <span className="text-indigo-400">geladen</span>
                                </h3>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-slate-400 font-medium">Ihre Profileinstellungen werden synchronisiert.</p>
                                    <div className="flex gap-1">
                                        <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl" />
                                <div className="relative h-20 w-20 bg-white/[0.02] backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/5">
                                    <Loader2 className="h-8 w-8 text-indigo-500/50 animate-spin" />
                                </div>
                            </div>
                            <div className="text-center space-y-3">
                                <p className="text-[10px] font-black tracking-[0.4em] text-indigo-400/60 uppercase">Cloud Initialisierung</p>
                                <h4 className="text-white/40 font-medium italic">Verbindung wird hergestellt...</h4>
                            </div>
                        </>
                    )}

                    {!pendingBackup && !showSuccess && (
                        <div className="absolute bottom-[-100px] flex items-center gap-3 opacity-20">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">FlowY Cloud Engine</span>
                            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white" />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
