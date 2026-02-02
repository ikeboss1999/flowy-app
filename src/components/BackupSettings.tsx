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

export function BackupSettings() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | null }>({ text: '', type: null });
    const fileInputRef = useRef<HTMLInputElement>(null);

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
