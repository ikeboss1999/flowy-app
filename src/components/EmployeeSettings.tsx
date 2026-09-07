"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Hash, Loader2, Users2 } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';

interface EmployeeSettingsProps { readOnly?: boolean; }

function AccordionSection({ title, icon: Icon, isOpen, onToggle, children }: { title: string; icon: React.ElementType; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
    return <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between p-6 transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50"><Icon className="h-5 w-5 text-indigo-600" /></div><h3 className="text-xl font-bold tracking-tight text-slate-800">{title}</h3></div>
            {isOpen ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
        </button>
        <div className={cn('overflow-hidden transition-all duration-300', isOpen ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0')}><div className="border-t border-slate-100 p-8">{children}</div></div>
    </div>;
}

export function EmployeeSettings({ readOnly = false }: EmployeeSettingsProps) {
    const { data, updateData, isLoading } = useCompanySettings();
    const { employees } = useEmployees();
    const [isOpen, setIsOpen] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const prefix = data.employeeNumberPrefix ?? 'MA-';
    const configuredNextNum = data.nextEmployeeNumber ?? '100001';
    const highestExistingNumber = useMemo(() => employees.reduce((highest, employee) => {
        const numericValue = parseInt(String(employee.employeeNumber || '').replace(/\D/g, ''), 10) || 0;
        return Math.max(highest, numericValue);
    }, 0), [employees]);
    const configuredNextValue = parseInt(String(configuredNextNum).replace(/\D/g, ''), 10) || 100001;
    const nextNum = String(Math.max(configuredNextValue, highestExistingNumber + 1));
    const padding = Math.min(10, Math.max(1, Number(data.employeeNumberPadding) || 1));
    const preview = `${prefix}${String(Math.max(1, Number(nextNum.replace(/\D/g, '')) || 100001)).padStart(padding, '0')}`;
    const inputClasses = cn('w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20', readOnly && 'cursor-not-allowed bg-slate-100 text-slate-500');
    const labelClasses = 'mb-2 ml-1 block text-sm font-bold text-slate-700';

    useEffect(() => {
        if (isLoading || readOnly || highestExistingNumber < configuredNextValue) return;
        void updateData({ nextEmployeeNumber: String(highestExistingNumber + 1) });
    }, [configuredNextValue, highestExistingNumber, isLoading, readOnly]);

    if (isLoading) return <div className="p-8 font-bold text-slate-400">Laden...</div>;

    const save = async () => {
        if (readOnly) return;
        setIsSaving(true);
        await updateData({ employeeNumberPadding: padding });
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-10 flex items-center gap-4 rounded-3xl border border-indigo-100/50 bg-indigo-50/50 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200"><Users2 className="h-6 w-6 text-white" /></div><h2 className="text-3xl font-black tracking-tight text-slate-900">Mitarbeitereinstellungen</h2></div>
        <AccordionSection title="Nummernkreis & Präfix" icon={Hash} isOpen={isOpen} onToggle={() => setIsOpen((value) => !value)}>
            <div className="space-y-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div><label className={labelClasses}>Präfix (z.B. MA-)</label><input type="text" value={prefix} onChange={(event) => !readOnly && updateData({ employeeNumberPrefix: event.target.value })} disabled={readOnly} className={inputClasses} placeholder="MA-" /></div>
                    <div><label className={labelClasses}>Nächste Mitarbeiternummer</label><input type="text" value={nextNum} onChange={(event) => !readOnly && updateData({ nextEmployeeNumber: event.target.value })} disabled={readOnly} className={inputClasses} placeholder="100001" /></div>
                    <div><label className={labelClasses}>Mindeststellen (Padding)</label><input type="number" min="1" max="10" value={padding} onChange={(event) => !readOnly && updateData({ employeeNumberPadding: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })} disabled={readOnly} className={inputClasses} /></div>
                </div>
                <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Eye className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Vorschau nächste Nummer</div><div className="text-xl font-black text-indigo-600">{preview}</div></div></div>
                {!readOnly && <div className="flex justify-end"><button onClick={save} disabled={isSaving} className={cn('flex items-center gap-3 rounded-2xl px-10 py-5 text-lg font-black shadow-xl transition-all active:scale-95', saved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-indigo-600 text-white shadow-indigo-200 hover:scale-[1.02]')}>{isSaving ? <><Loader2 className="h-6 w-6 animate-spin" /> Speichern...</> : saved ? <><CheckCircle2 className="h-6 w-6" /> Einstellungen gespeichert!</> : <><CheckCircle2 className="h-6 w-6" /> Einstellungen speichern</>}</button></div>}
            </div>
        </AccordionSection>
    </div>;
}
