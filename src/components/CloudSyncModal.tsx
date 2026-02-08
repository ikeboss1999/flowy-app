"use client";

import { useEffect, useState } from "react";
import { Cloud, Upload, X, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloud } from "@/lib/cloudBackup";

export function CloudSyncModal() {
    const { user, signOut } = useAuth(); // Need signOut
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mode, setMode] = useState<'close' | 'logout'>('close');

    useEffect(() => {
        // Listen for close request from Electron (Native App Close)
        if (window.electron) {
            const cleanup = window.electron.onAppCloseRequested(() => {
                if (!user) {
                    // If not logged in, just close immediately without prompting
                    window.electron.appCloseConfirmed();
                    return;
                }
                setMode('close');
                setIsOpen(true);
            });
            return cleanup;
        }
    }, [user]);

    useEffect(() => {
        // Listen for internal Logout request (Sidebar)
        const handleLogoutRequest = () => {
            setMode('logout');
            setIsOpen(true);
        };
        window.addEventListener('flowy-logout-request', handleLogoutRequest);
        return () => window.removeEventListener('flowy-logout-request', handleLogoutRequest);
    }, []);

    const handleProceed = async () => {
        if (mode === 'close') {
            if (window.electron) window.electron.appCloseConfirmed();
        } else {
            await signOut();
            window.location.href = '/login'; // Force reload/redirect to be sure
        }
    };

    const handleBackupAndProceed = async () => {
        if (!user) {
            handleProceed();
            return;
        }

        setIsUploading(true);
        try {
            // 1. Fetch data locally via API re-use or just let the backup lib handle it?
            // The lib expects data. Let's fetch the export API.
            const response = await fetch('/api/backup/export');
            const data = await response.json();

            // 2. Upload
            const { error } = await uploadToCloud(data, user.id);
            if (error) throw error;

            // 3. Wipe Local Data (Clean Session)
            try {
                await fetch('/api/db/clear', { method: 'POST' });
            } catch (wipeError) {
                console.error("Wipe failed:", wipeError);
            }

            // 4. Quit
            handleProceed();
        } catch (error) {
            console.error(error);
            alert("Backup fehlgeschlagen! Vorgang wird trotzdem fortgesetzt.");
            handleProceed();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

            <div className="relative bg-[#0F0F12] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">

                        <Cloud className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">Cloud Backup?</h3>
                    <p className="text-slate-400 font-medium">
                        {mode === 'close'
                            ? "Möchten Sie Ihre lokalen Änderungen vor dem Beenden in der Cloud sichern?"
                            : "Möchten Sie Ihre Daten sichern, bevor Sie sich abmelden?"}
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleBackupAndProceed}
                        disabled={isUploading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Wird gesichert...
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                {mode === 'close' ? "Ja, Sichern & Beenden" : "Ja, Sichern & Abmelden"}
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleProceed}
                        disabled={isUploading}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl font-bold text-lg border border-white/5 active:scale-[0.98] flex items-center justify-center gap-3 transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                        {mode === 'close' ? "Nein, nur Beenden" : "Nein, nur Abmelden"}
                    </button>

                    <button
                        onClick={() => setIsOpen(false)}
                        disabled={isUploading}
                        className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm font-medium"
                    >
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
}
