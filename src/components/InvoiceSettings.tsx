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
    History
} from "lucide-react";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";
import { DunningLevel } from '@/types/invoice';

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
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Rechnungsnummer Präfix</label>
                            <input
                                type="text"
                                name="invoicePrefix"
                                value={data.invoicePrefix}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
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
                            <label className={labelClasses}>Mitarbeiternummer Präfix</label>
                            <input
                                type="text"
                                name="employeePrefix"
                                value={data.employeePrefix}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Nächste Mitarbeiternummer</label>
                            <input
                                type="number"
                                name="nextEmployeeNumber"
                                value={data.nextEmployeeNumber}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Standard Zahlungsfrist</label>
                            <select
                                name="defaultPaymentTerm"
                                value={data.defaultPaymentTerm}
                                onChange={handleChange}
                                className={selectClasses}
                            >
                                <option value="sofort nach Rechnungserhalt">sofort nach Rechnungserhalt</option>
                                <option value="7 Tage">7 Tage</option>
                                <option value="14 Tage">14 Tage</option>
                                <option value="30 Tage">30 Tage</option>
                            </select>
                        </div>
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
