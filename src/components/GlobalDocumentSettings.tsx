"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Coins, Percent } from "lucide-react";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";

interface GlobalDocumentSettingsProps {
    readOnly?: boolean;
}

export function GlobalDocumentSettings({ readOnly = false }: GlobalDocumentSettingsProps) {
    const { data, updateData, isLoading } = useInvoiceSettings();
    const [isOpen, setIsOpen] = useState(false);
    const inputClasses = cn(
        "w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
        readOnly && "cursor-not-allowed bg-slate-100 text-slate-500"
    );

    if (isLoading) return <div className="p-8 font-bold text-slate-400">Laden...</div>;

    return (
        <section className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
            <button type="button" onClick={() => setIsOpen((value) => !value)} className="flex w-full items-center justify-between p-6 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Coins className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900">Globale Dokumenteneinstellungen</h3>
                </div>
                </div>
                {isOpen ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
            </button>
            <div className={cn('overflow-hidden transition-all duration-300', isOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0')}>
            <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-8 md:grid-cols-2">
                <div>
                    <label className="mb-2 ml-1 block text-sm font-bold text-slate-700">Standard-Steuersatz (%)</label>
                    <div className="relative">
                        <Percent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={data.defaultTaxRate}
                            onChange={(event) => !readOnly && updateData({ defaultTaxRate: Number(event.target.value) })}
                            disabled={readOnly}
                            className={cn(inputClasses, "pl-11")}
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-2 ml-1 block text-sm font-bold text-slate-700">Standardwährung</label>
                    <select
                        value={data.defaultCurrency}
                        onChange={(event) => !readOnly && updateData({ defaultCurrency: event.target.value })}
                        disabled={readOnly}
                        className={inputClasses}
                    >
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="USD ($)">USD ($)</option>
                        <option value="CHF (CHF)">CHF (CHF)</option>
                    </select>
                </div>
            </div>
            </div>
        </section>
    );
}
