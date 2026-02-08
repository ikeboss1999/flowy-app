"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, CloudDownload } from "lucide-react";
import { restoreFromCloud } from "@/lib/cloudBackup";

export function AutoRestore({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    // We use a dummy state just to force re-render when we finish checking
    const [_, setForceUpdate] = useState(0);
    const [isRestoring, setIsRestoring] = useState(false);

    // SYNCHRONOUS DERIVED STATE (No useEffect lag)
    // If we have a user, and we haven't checked yet -> BLOCK IMMEDIATELY.
    const hasChecked = typeof window !== 'undefined' ? sessionStorage.getItem('flowy_autorestore_checked') : true;
    const shouldBlock = !!user && !hasChecked;

    useEffect(() => {
        if (!shouldBlock) return;
        if (isRestoring) return; // Don't interfere if restore is active

        const checkAndRestore = async () => {
            console.log("[AutoRestore] Starting backup check...");

            // Failsafe: Unblock after 4 seconds regardless (prevents white screen if API hangs)
            const timeout = setTimeout(() => {
                console.warn("[AutoRestore] Check timed out, releasing block.");
                sessionStorage.setItem('flowy_autorestore_checked', 'true');
                setForceUpdate(n => n + 1);
            }, 4000);

            try {
                // 1. Check if Local DB is empty
                const statusRes = await fetch('/api/db/status');
                if (!statusRes.ok) throw new Error("Status API failed");
                const { isEmpty, recordCount } = await statusRes.json();

                console.log("[AutoRestore] DB Status:", { isEmpty, recordCount });

                if (!isEmpty) {
                    console.log("[AutoRestore] Local data found, skipping cloud check.");
                    clearTimeout(timeout);
                    sessionStorage.setItem('flowy_autorestore_checked', 'true');
                    setForceUpdate(n => n + 1); // Release block
                    return;
                }

                // 2. Check Cloud
                console.log("[AutoRestore] DB is empty, checking Supabase Storage for backups...");
                const { data: list, error: listError } = await supabase.storage
                    .from('backups')
                    .list(user!.id, {
                        limit: 1,
                        sortBy: { column: 'created_at', order: 'desc' },
                    });

                if (listError) {
                    console.error("[AutoRestore] Supabase list error:", listError);
                    throw listError;
                }

                if (!list || list.length === 0) {
                    console.log("[AutoRestore] No cloud backups found.");
                    clearTimeout(timeout);
                    sessionStorage.setItem('flowy_autorestore_checked', 'true');
                    setForceUpdate(n => n + 1);
                    return;
                }

                // 3. Confirm
                clearTimeout(timeout); // We found something, cancel the automatic release
                const backupFile = list[0];
                console.log("[AutoRestore] Backup found:", backupFile.name);

                const confirmRestore = window.confirm(
                    `Willkommen auf diesem Gerät! Es wurde ein Cloud-Backup gefunden (${new Date(backupFile.created_at).toLocaleString()}). Soll es heruntergeladen werden?`
                );

                if (!confirmRestore) {
                    console.log("[AutoRestore] User declined restore.");
                    sessionStorage.setItem('flowy_autorestore_checked', 'true');
                    setForceUpdate(n => n + 1);
                    return;
                }

                // 4. Restore
                setIsRestoring(true); // Switch to restoring UI
                console.log("[AutoRestore] Downloading backup...");

                const { data: blob, error: dlError } = await supabase.storage
                    .from("backups")
                    .download(`${user!.id}/${backupFile.name}`);

                if (dlError || !blob) throw dlError;

                const text = await blob.text();
                const jsonData = JSON.parse(text);

                console.log("[AutoRestore] Importing data...");
                const { error: restoreError } = await restoreFromCloud(jsonData);
                if (restoreError) throw restoreError;

                alert("Daten erfolgreich wiederhergestellt! Die App wird neu geladen.");

                sessionStorage.setItem('flowy_autorestore_checked', 'true');
                window.location.reload();

            } catch (error) {
                console.error("[AutoRestore] Fatal error during check/restore:", error);
                clearTimeout(timeout);
                sessionStorage.setItem('flowy_autorestore_checked', 'true');
                setForceUpdate(n => n + 1);
            }
        };

        checkAndRestore();
    }, [shouldBlock, isRestoring, user]);

    // BLOCKING UI
    if (shouldBlock || isRestoring) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05050A]">
                <div className="flex flex-col items-center gap-6 p-8 animate-in zoom-in-95">
                    {isRestoring ? (
                        <>
                            <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                <CloudDownload className="h-8 w-8 text-indigo-500 animate-bounce" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">Daten werden wiederhergestellt...</h3>
                                <p className="text-slate-400 text-sm">Dies kann einen Moment dauern.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                            <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Prüfe Cloud-Backups...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // NORMAL UI (Login or Dashboard)
    return <>{children}</>;
}
