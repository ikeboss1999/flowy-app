"use client";

import { Eye, Hash, Truck } from "lucide-react";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";

export function SupplierSettings({ readOnly = false }: { readOnly?: boolean }) {
    const { data, updateData, isLoading } = useSupplierSettings();
    if (isLoading) return <div className="p-8 font-bold text-slate-400">Laden...</div>;

    const inputClassName = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100";
    const nextNumber = Math.max(1, Number(data.nextNumber) || 1);
    const preview = `${data.prefix || ""}${"0".repeat(Math.max(0, (Number(data.mindestLaenge) || 1) - String(nextNumber).length))}${nextNumber}`;
    const change = (key: "prefix" | "nextNumber" | "mindestLaenge", value: string) => {
        void updateData({ [key]: key === "prefix" ? value : Math.max(1, Number(value) || 1) });
    };

    return (
        <div className="mx-auto mt-6 max-w-5xl space-y-6">
            <div className="flex items-center gap-4 rounded-3xl border border-cyan-100 bg-cyan-50/60 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200"><Truck className="h-6 w-6" /></div>
                <div><h2 className="text-3xl font-black tracking-tight text-slate-900">Lieferanten</h2><p className="mt-1 text-sm font-semibold text-slate-500">Nummernkreis für Lieferanten aus Eingangsrechnungen.</p></div>
            </div>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-6"><Hash className="h-5 w-5 text-cyan-600" /><h3 className="text-xl font-bold text-slate-900">Nummernkreis & Präfix</h3></div>
                <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
                    <label className="space-y-2 text-sm font-bold text-slate-700">Präfix (z. B. LF-)<input className={inputClassName} value={data.prefix} disabled={readOnly} onChange={(event) => change("prefix", event.target.value)} /></label>
                    <label className="space-y-2 text-sm font-bold text-slate-700">Nächste Lieferantennummer<input className={inputClassName} type="number" min={1} value={nextNumber} disabled={readOnly} onChange={(event) => change("nextNumber", event.target.value)} /></label>
                    <label className="space-y-2 text-sm font-bold text-slate-700">Mindeststellen (Padding)<input className={inputClassName} type="number" min={1} max={10} value={data.mindestLaenge} disabled={readOnly} onChange={(event) => change("mindestLaenge", event.target.value)} /></label>
                </div>
                <div className="mx-6 mb-6 flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 md:mx-8 md:mb-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><Eye className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Vorschau nächste Nummer</p><p className="text-xl font-black text-cyan-600">{preview}</p></div></div>
            </section>
        </div>
    );
}
