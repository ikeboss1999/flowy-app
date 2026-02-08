"use client";

import React, { useState, useRef } from 'react';
import {
    Database,
    Download,
    Upload,
    AlertTriangle,
    CheckCircle2,
    RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloud, downloadFromCloud, getLastBackupInfo } from "@/lib/cloudBackup";
import { Cloud, Radio } from "lucide-react"; // Import Cloud icon

export function BackupSettings() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | null }>({ text: '', type: null });
    const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (user) {
            getLastBackupInfo(user.id).then(info => {
                if (info) setLastBackupTime(info.updated_at);
            });
        }
    }, [user]);

    const handleCloudExport = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Re-use api endpoint to get full JSON dump
            const response = await fetch('/api/backup/export');
            const data = await response.json();

            const { error } = await uploadToCloud(data, user.id);
            if (error) throw error;

            setMessage({ text: 'Daten erfolgreich in die Cloud hochgeladen!', type: 'success' });
            // Refresh info
            getLastBackupInfo(user.id).then(info => info && setLastBackupTime(info.updated_at));
        } catch (error: any) {
            console.error(error);
            setMessage({ text: 'Cloud-Upload fehlgeschlagen: ' + error.message, type: 'error' });
        }
        setIsLoading(false);
        setTimeout(() => setMessage({ text: '', type: null }), 5000);
    };

    const handleCloudImport = async () => {
        if (!user) return;
        if (!window.confirm("ACHTUNG: Dies überschreibt ALLE lokalen Daten mit dem Cloud-Stand. Fortfahren?")) return;

        setIsLoading(true);
        try {
            const { data, error } = await downloadFromCloud(user.id);
            if (error) throw error;
            if (!data) throw new Error("Keine Daten gefunden.");

            // Import via API
            const response = await fetch('/api/backup/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, currentUserId: user.id })
            });

            if (response.ok) {
                const keysToClear = [
                    'flowy_projects', 'flowy_customers', 'flowy_invoices',
                    'flowy_company_data', 'flowy_invoice_settings', 'flowy_vehicles',
                    'flowy_employees', 'flowy_time_entries', 'flowy_timesheets',
                    'flowy_todos', 'flowy_calendar_events', 'flowy_services',
                    'account_settings'
                ];
                keysToClear.forEach(key => localStorage.removeItem(key));

                setMessage({ text: 'Cloud-Backup erfolgreich wiederhergestellt! App wird neu geladen...', type: 'success' });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error("Import-API fehlgeschlagen.");
            }
        } catch (error: any) {
            console.error(error);
            setMessage({ text: 'Cloud-Wiederherstellung fehlgeschlagen: ' + error.message, type: 'error' });
        }
        setIsLoading(false);
    };

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/backup/export');
            const data = await response.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowy_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage({ text: 'Backup erfolgreich erstellt und heruntergeladen.', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Backup konnte nicht erstellt werden.', type: 'error' });
        }
        setIsLoading(false);
        setTimeout(() => setMessage({ text: '', type: null }), 5000);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ACHTUNG: Beim Wiederherstellen werden alle aktuellen Daten überschrieben. Fortfahren?")) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const data = JSON.parse(content);

                    const response = await fetch('/api/backup/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...data,
                            currentUserId: user?.id
                        })
                    });

                    if (response.ok) {
                        const resData = await response.json();
                        // Clear all legacy localStorage keys to prevent accidental re-migration
                        const keysToClear = [
                            'flowy_projects', 'flowy_customers', 'flowy_invoices',
                            'flowy_company_data', 'flowy_invoice_settings', 'flowy_vehicles',
                            'flowy_employees', 'flowy_time_entries', 'flowy_timesheets',
                            'flowy_todos', 'flowy_calendar_events', 'flowy_services',
                            'account_settings'
                        ];
                        keysToClear.forEach(key => localStorage.removeItem(key));

                        setMessage({
                            text: `Wiederherstellung erfolgreich! ${resData.rowCount || ''} Dateneinträge wurden geladen. Die App wird neu geladen...`,
                            type: 'success'
                        });
                        setTimeout(() => window.location.reload(), 3000);
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Server-Fehler beim Import.');
                    }
                } catch (err: any) {
                    setMessage({ text: err.message || 'Ungültige Datei.', type: 'error' });
                }
            };
            reader.readAsText(file);
        } catch (error) {
            setMessage({ text: 'Fehler beim Lesen der Datei.', type: 'error' });
        }
        setIsLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Database className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Datensicherung</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Export Card */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 group-hover:scale-110 transition-transform">
                        <Download className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4">Backup erstellen</h3>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        Sichern Sie alle Ihre Projekte, Rechnungen, Kunden und Einstellungen in einer einzigen Datei. Empfohlen vor größeren Updates oder einem PC-Wechsel.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCcw className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                        Backup herunterladen
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-8 border border-rose-100 group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8 text-rose-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4">Daten wiederherstellen</h3>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        Laden Sie eine zuvor erstellte Backup-Datei hoch, um Ihren Datenstand wiederherzustellen. <span className="text-rose-600 font-bold underline">Achtung: Überschreibt aktuelle Daten!</span>
                    </p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleImport}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="w-full py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-lg hover:border-rose-400 hover:text-rose-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCcw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                        Backup einspielen
                    </button>
                </div>
            </div>

            {/* Cloud Sync Section */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Cloud className="h-40 w-40 text-white" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Cloud className="h-8 w-8 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black tracking-tight text-white">FlowY Cloud Sync</h3>
                            <p className="text-indigo-200 font-medium">Sichere deine Daten in der Cloud (Supabase)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Cloud Upload */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                            <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Upload className="h-5 w-5 text-indigo-400" />
                                In die Cloud hochladen
                            </h4>
                            <p className="text-sm text-slate-400 mb-6">
                                Überschreibt das vorhandene Cloud-Backup mit deinen aktuellen lokalen Daten.
                            </p>
                            <button
                                onClick={handleCloudExport}
                                disabled={isLoading || !user}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Jetzt hochladen
                            </button>
                        </div>

                        {/* Cloud Download */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                            <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Download className="h-5 w-5 text-emerald-400" />
                                Aus der Cloud wiederherstellen
                            </h4>
                            <p className="text-sm text-slate-400 mb-6">
                                Lädt den letzten Stand aus der Cloud und überschreibt deine lokalen Daten.
                            </p>
                            {lastBackupTime && (
                                <p className="text-xs text-emerald-400/80 mb-4 font-mono">
                                    Letztes Backup: {new Date(lastBackupTime).toLocaleString()}
                                </p>
                            )}
                            <button
                                onClick={handleCloudImport}
                                disabled={isLoading || !user}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all border border-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Wiederherstellen
                            </button>
                        </div>
                    </div>

                    {!user && (
                        <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-200 text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            Du musst angemeldet sein, um die Cloud-Funktionen zu nutzen.
                        </div>
                    )}
                </div>
            </div>

            {message.text && (
                <div className={cn(
                    "p-6 rounded-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-rose-500" />}
                    <p className="font-bold text-lg">{message.text}</p>
                </div>
            )}
        </div>
    );
}
