"use client";

import { useState, useEffect } from 'react';
import { Save, Loader2, Hash, CheckCircle2 } from 'lucide-react';
import { useProjectSettings } from '@/hooks/useProjectSettings';
import { cn } from '@/lib/utils';

export function ProjectSettings() {
    const { data, isLoading, updateData } = useProjectSettings();
    const [prefix, setPrefix] = useState('PRJ-');
    const [nextNum, setNextNum] = useState('1');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!isLoading && data) {
            setPrefix(prev => prev === 'PRJ-' ? data.projectNumberPrefix : prev);
            setNextNum(prev => prev === '1' ? String(data.nextProjectNumber) : prev);
        }
    }, [isLoading, data]);

    const handleSave = async () => {
        setIsSaving(true);
        await updateData({
            projectNumberPrefix: prefix,
            nextProjectNumber: parseInt(nextNum, 10) || 1,
        });
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const preview = `${prefix}${String(parseInt(nextNum, 10) || 1).padStart(4, '0')}`;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900">Projektnummern</h3>
                    <p className="text-sm text-slate-500">Präfix und Startnummer für automatisch generierte Projektnummern</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Präfix</label>
                    <input
                        type="text"
                        value={prefix}
                        onChange={e => setPrefix(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold transition-all"
                        placeholder="PRJ-"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nächste Nummer</label>
                    <input
                        type="number"
                        value={nextNum}
                        onChange={e => setNextNum(e.target.value)}
                        min={1}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-3 border border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Vorschau nächste Projektnummer:</span>
                <span className="font-black text-indigo-600 text-lg tracking-wide">{preview}</span>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border",
                        saved
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100"
                    )}
                >
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Speichern...</>
                    ) : saved ? (
                        <><CheckCircle2 className="h-4 w-4" /> Gespeichert</>
                    ) : (
                        <><Save className="h-4 w-4" /> Speichern</>
                    )}
                </button>
            </div>
        </div>
    );
}
