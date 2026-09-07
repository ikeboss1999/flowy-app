"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, FileText, Hash, Loader2 } from 'lucide-react';
import { useProjectSettings } from '@/hooks/useProjectSettings';
import { cn } from '@/lib/utils';

interface ProjectSettingsProps {
    readOnly?: boolean;
}

interface AccordionSectionProps {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function AccordionSection({ title, icon: Icon, isOpen, onToggle, children }: AccordionSectionProps) {
    return (
        <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between p-6 transition-colors hover:bg-slate-50"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                        <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-800">{title}</h3>
                </div>
                {isOpen ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
            </button>
            <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
                <div className="border-t border-slate-100 p-8">{children}</div>
            </div>
        </div>
    );
}

export function ProjectSettings({ readOnly = false }: ProjectSettingsProps) {
    const { data, isLoading, updateData } = useProjectSettings();
    const [prefix, setPrefix] = useState('PRJ-');
    const [nextNum, setNextNum] = useState('1');
    const [padding, setPadding] = useState('1');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (!isLoading && data) {
            setPrefix(data.projectNumberPrefix);
            setNextNum(String(data.nextProjectNumber));
            setPadding(String(data.projectNumberPadding));
        }
    }, [isLoading, data]);

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        await updateData({
            projectNumberPrefix: prefix,
            nextProjectNumber: parseInt(nextNum, 10) || 1,
            projectNumberPadding: Math.min(10, Math.max(1, parseInt(padding, 10) || 1)),
        });
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const preview = `${prefix}${String(parseInt(nextNum, 10) || 1).padStart(Math.min(10, Math.max(1, parseInt(padding, 10) || 1)), '0')}`;
    const inputClasses = cn(
        'w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
        readOnly && 'cursor-not-allowed bg-slate-100 text-slate-500'
    );
    const labelClasses = 'mb-2 ml-1 block text-sm font-bold text-slate-700';

    if (isLoading) return <div className="p-8 font-bold text-slate-400">Laden...</div>;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="mb-10 flex items-center gap-4 rounded-3xl border border-indigo-100/50 bg-indigo-50/50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                    <FileText className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Projekteinstellungen</h2>
            </div>

            <AccordionSection title="Nummernkreis & Präfix" icon={Hash} isOpen={isOpen} onToggle={() => setIsOpen((value) => !value)}>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        <div>
                            <label className={labelClasses}>Präfix (z.B. PRJ-)</label>
                            <input type="text" value={prefix} onChange={(event) => !readOnly && setPrefix(event.target.value)} disabled={readOnly} className={inputClasses} placeholder="PRJ-" />
                        </div>
                        <div>
                            <label className={labelClasses}>Nächste Projektnummer</label>
                            <input type="number" value={nextNum} onChange={(event) => !readOnly && setNextNum(event.target.value)} disabled={readOnly} min={1} className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Mindeststellen (Padding)</label>
                            <input type="number" value={padding} onChange={(event) => !readOnly && setPadding(event.target.value)} disabled={readOnly} min={1} max={10} className={inputClasses} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Eye className="h-5 w-5" /></div>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Vorschau nächste Nummer</div>
                            <div className="text-xl font-black text-indigo-600">{preview}</div>
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex justify-end">
                            <button onClick={handleSave} disabled={isSaving} className={cn('flex items-center gap-3 rounded-2xl px-10 py-5 text-lg font-black shadow-xl transition-all active:scale-95', saved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-indigo-600 text-white shadow-indigo-200 hover:scale-[1.02]')}>
                                {isSaving ? <><Loader2 className="h-6 w-6 animate-spin" /> Speichern...</> : saved ? <><CheckCircle2 className="h-6 w-6" /> Einstellungen gespeichert!</> : <><CheckCircle2 className="h-6 w-6" /> Einstellungen speichern</>}
                            </button>
                        </div>
                    )}
                </div>
            </AccordionSection>
        </div>
    );
}
