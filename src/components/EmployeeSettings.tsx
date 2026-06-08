"use client";

import React, { useState } from 'react';
import {
    Users2,
    Hash,
    CheckCircle2,
} from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { cn } from "@/lib/utils";

export function EmployeeSettings() {
    const { data, updateData, isLoading } = useCompanySettings();
    const [showSuccess, setShowSuccess] = useState(false);

    if (isLoading) return <div className="p-8 text-slate-400 font-bold">Laden...</div>;

    const handleSave = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    const prefix = data.employeeNumberPrefix ?? 'MA-';
    const nextNum = data.nextEmployeeNumber ?? '100001';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Users2 className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mitarbeitereinstellungen</h2>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <Hash className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Personalnummern-Kreis</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Präfix (z. B. MA-)</label>
                        <p className="text-xs text-slate-400 font-medium mb-3 ml-1">
                            Optionaler Text/Buchstaben vor der Nummer.
                        </p>
                        <input
                            type="text"
                            value={prefix}
                            onChange={(e) => updateData({ employeeNumberPrefix: e.target.value })}
                            className={inputClasses}
                            placeholder="z. B. MA-"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Nächste Personalnummer (z. B. 100001)</label>
                        <p className="text-xs text-slate-400 font-medium mb-3 ml-1">
                            Die laufende Nummer, die als nächstes vergeben wird.
                        </p>
                        <input
                            type="text"
                            value={nextNum}
                            onChange={(e) => updateData({ nextEmployeeNumber: e.target.value })}
                            className={inputClasses}
                            placeholder="z. B. 100001"
                        />
                    </div>
                </div>

                {/* Preview */}
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100/50">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Vorschau:</p>
                    <p className="text-lg text-indigo-900 font-bold">
                        Der nächste Mitarbeiter erhält die Personalnummer: <span className="text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-200 ml-1">{prefix}{nextNum}</span>
                    </p>
                </div>
            </div>

            <div className="pt-8 flex justify-end gap-4">
                <button
                    onClick={handleSave}
                    className={cn(
                        "px-10 py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center gap-3",
                        showSuccess
                            ? "bg-emerald-500 text-white shadow-emerald-200"
                            : "bg-indigo-600 text-white shadow-indigo-200 hover:scale-[1.02]"
                    )}
                >
                    {showSuccess ? (
                        <>
                            <CheckCircle2 className="h-6 w-6 animate-in zoom-in duration-300" />
                            Einstellungen gespeichert!
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-6 w-6" />
                            Einstellungen speichern
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
