"use client";

import React, { useState } from 'react';
import {
    FileText,
    Mail,
    Calendar,
    Percent,
    Coins,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    BellRing,
    AlertCircle,
    History,
    Trash2
} from "lucide-react";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";
import { DunningLevel, PaymentTerm } from '@/types/invoice';

interface AccordionSectionProps {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function AccordionSection({ title, icon: Icon, isOpen, onToggle, children }: AccordionSectionProps) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-4 shadow-sm transition-all duration-300">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-6 w-6 text-slate-400" />
                ) : (
                    <ChevronDown className="h-6 w-6 text-slate-400" />
                )}
            </button>
            <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-8 border-t border-slate-100">
                    {children}
                </div>
            </div>
        </div>
    );
}

interface DunningCardProps {
    title: string;
    level: DunningLevel;
    onChange: (data: Partial<DunningLevel>) => void;
    bgColor: string;
    borderColor: string;
    textColor: string;
}

function DunningCard({ title, level, onChange, bgColor, borderColor, textColor }: DunningCardProps) {
    const inputClasses = "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className={cn("p-8 rounded-3xl border mb-6", bgColor, borderColor)}>
            <h4 className={cn("text-lg font-black mb-6", textColor)}>{title}</h4>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <label className={labelClasses}>Mahngebühr (€)</label>
                    <input
                        type="number"
                        value={level.fee}
                        onChange={(e) => onChange({ fee: Number(e.target.value) })}
                        className={inputClasses}
                    />
                </div>
                <div>
                    <label className={labelClasses}>Zahlungsfrist (Tage)</label>
                    <input
                        type="number"
                        value={level.period}
                        onChange={(e) => onChange({ period: Number(e.target.value) })}
                        className={inputClasses}
                    />
                </div>
            </div>
        </div>
    );
}

export function InvoiceSettings() {
    const { data, updateData, updateDunningLevel, isLoading } = useInvoiceSettings();
    const [openSection, setOpenSection] = useState<string | null>("general");
    const [showSuccess, setShowSuccess] = useState(false);

    // Payment Terms Management State
    const [newTerm, setNewTerm] = useState<Partial<PaymentTerm>>({ name: '', text: '', days: 0 });
    const [editingTermId, setEditingTermId] = useState<string | null>(null);

    if (isLoading) return <div className="p-8 text-slate-400 font-bold">Laden...</div>;

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const finalValue = e.target.type === 'number' ? Number(value) : value;
        updateData({ [name]: finalValue });
    };

    const handleSave = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleAddTerm = () => {
        if (!newTerm.name || !newTerm.text) return;

        const term: PaymentTerm = {
            id: editingTermId || Math.random().toString(36).substr(2, 9),
            name: newTerm.name || '',
            text: newTerm.text || '',
            days: newTerm.days || 0
        };

        const updatedTerms = editingTermId
            ? data.paymentTerms.map(t => t.id === editingTermId ? term : t)
            : [...data.paymentTerms, term];

        updateData({ paymentTerms: updatedTerms });
        setNewTerm({ name: '', text: '', days: 0 });
        setEditingTermId(null);
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const selectClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <FileText className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rechnungseinstellungen</h2>
            </div>

            {/* Allgemeine Rechnungseinstellungen */}
            <AccordionSection
                title="Allgemeine Rechnungseinstellungen"
                icon={FileText}
                isOpen={openSection === "general"}
                onToggle={() => toggleSection("general")}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        <div>
                            <label className={labelClasses}>Nächste Rechnungsnummer</label>
                            <input
                                type="number"
                                name="nextInvoiceNumber"
                                value={data.nextInvoiceNumber}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Standard Steuersatz (%)</label>
                            <input
                                type="number"
                                name="defaultTaxRate"
                                value={data.defaultTaxRate}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Standardwährung</label>
                            <select
                                name="defaultCurrency"
                                value={data.defaultCurrency}
                                onChange={handleChange}
                                className={selectClasses}
                            >
                                <option value="EUR (€)">EUR (€)</option>
                                <option value="USD ($)">USD ($)</option>
                                <option value="CHF (CHF)">CHF (CHF)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Zahlungskonditionen */}
            <AccordionSection
                title="Zahlungskonditionen"
                icon={Coins}
                isOpen={openSection === "paymentTerms"}
                onToggle={() => toggleSection("paymentTerms")}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6">
                        {data.paymentTerms.map((term) => (
                            <div key={term.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-900">{term.name}</span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold uppercase tracking-wider">{term.days} Tage</span>
                                        {data.defaultPaymentTermId === term.id && (
                                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-bold uppercase tracking-wider">Standard</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">{term.text}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setNewTerm(term);
                                            setEditingTermId(term.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                        title="Bearbeiten"
                                    >
                                        <History className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const updatedTerms = data.paymentTerms.filter(t => t.id !== term.id);
                                            updateData({
                                                paymentTerms: updatedTerms,
                                                defaultPaymentTermId: data.defaultPaymentTermId === term.id ? (updatedTerms[0]?.id || '') : data.defaultPaymentTermId
                                            });
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                        title="Löschen"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-6">
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">
                            {editingTermId ? 'Zahlungskondition bearbeiten' : 'Neue Zahlungskondition hinzufügen'}
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-1">
                                <label className={labelClasses}>Name (intern)</label>
                                <input
                                    type="text"
                                    placeholder="z.B. Netto 14 Tage"
                                    value={newTerm.name || ''}
                                    onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className={labelClasses}>Frist (in Tagen)</label>
                                <input
                                    type="number"
                                    placeholder="14"
                                    value={newTerm.days || 0}
                                    onChange={(e) => setNewTerm({ ...newTerm, days: Number(e.target.value) })}
                                    className={inputClasses}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClasses}>Anzeigetext (auf Rechnung)</label>
                                <input
                                    type="text"
                                    placeholder="zahlbar innerhalb von 14 Tagen ohne Abzug"
                                    value={newTerm.text || ''}
                                    onChange={(e) => setNewTerm({ ...newTerm, text: e.target.value })}
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-2">
                            {editingTermId && (
                                <button
                                    onClick={() => {
                                        setEditingTermId(null);
                                        setNewTerm({ name: '', text: '', days: 0 });
                                    }}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                >
                                    Abbrechen
                                </button>
                            )}
                            <button
                                onClick={handleAddTerm}
                                disabled={!newTerm.name || !newTerm.text}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {editingTermId ? 'Aktualisieren' : 'Hinzufügen'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className={labelClasses}>Standard-Kondition für neue Rechnungen</label>
                        <select
                            name="defaultPaymentTermId"
                            value={data.defaultPaymentTermId}
                            onChange={handleChange}
                            className={selectClasses}
                        >
                            {data.paymentTerms.map(term => (
                                <option key={term.id} value={term.id}>{term.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </AccordionSection>

            {/* Mahnwesen Einstellungen */}
            <AccordionSection
                title="Mahnwesen Einstellungen"
                icon={BellRing}
                isOpen={openSection === "dunning"}
                onToggle={() => toggleSection("dunning")}
            >
                <div className="space-y-2 mb-8">
                    <p className="text-sm font-medium text-slate-500">
                        Legen Sie die Gebühren und Zahlungsfristen für jede Mahnstufe fest.
                    </p>
                </div>

                <div className="space-y-2">
                    <DunningCard
                        title="Zahlungserinnerung (Stufe 1)"
                        level={data.dunningLevels.level1}
                        onChange={(d) => updateDunningLevel('level1', d)}
                        bgColor="bg-indigo-50/30"
                        borderColor="border-indigo-100"
                        textColor="text-indigo-900"
                    />
                    <DunningCard
                        title="1. Mahnung (Stufe 2)"
                        level={data.dunningLevels.level2}
                        onChange={(d) => updateDunningLevel('level2', d)}
                        bgColor="bg-orange-50/30"
                        borderColor="border-orange-100"
                        textColor="text-orange-900"
                    />
                    <DunningCard
                        title="2. Mahnung (Stufe 3)"
                        level={data.dunningLevels.level3}
                        onChange={(d) => updateDunningLevel('level3', d)}
                        bgColor="bg-red-50/30"
                        borderColor="border-red-100"
                        textColor="text-red-900"
                    />
                    <DunningCard
                        title="Letzte Mahnung (Stufe 4)"
                        level={data.dunningLevels.level4}
                        onChange={(d) => updateDunningLevel('level4', d)}
                        bgColor="bg-slate-50/50"
                        borderColor="border-slate-200"
                        textColor="text-slate-900"
                    />
                </div>
            </AccordionSection>

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
