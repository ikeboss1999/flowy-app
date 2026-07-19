"use client";

import React, { useState } from 'react';
import {
    FileText,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Hash,
    Type,
    AlignLeft,
    Mail
} from "lucide-react";
import { useOrderSettings } from "@/hooks/useOrderSettings";
import { cn } from "@/lib/utils";

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

export function OrderSettings() {
    const { data, updateData, isLoading } = useOrderSettings();
    const [openSection, setOpenSection] = useState<string | null>("general");
    const [showSuccess, setShowSuccess] = useState(false);

    if (isLoading) return <div className="p-8 text-slate-400 font-bold">Laden...</div>;

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const finalValue = e.target.type === 'number' ? Number(value) : value;
        updateData({ [name]: finalValue });
    };

    const handleSave = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <FileText className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Auftragseinstellungen</h2>
            </div>

            {/* Nummernkreis & Präfix */}
            <AccordionSection
                title="Nummernkreis & Präfix"
                icon={Hash}
                isOpen={openSection === "general"}
                onToggle={() => toggleSection("general")}
            >
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className={labelClasses}>Präfix (z.B. AB-2024-)</label>
                        <input
                            type="text"
                            name="prefix"
                            value={data.prefix}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder="AB-2024-"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Nächste Auftragsnummer</label>
                        <input
                            type="number"
                            name="nextOrderNumber"
                            value={data.nextOrderNumber}
                            onChange={handleChange}
                            className={inputClasses}
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* Standard Texte */}
            <AccordionSection
                title="Standard Texte"
                icon={Type}
                isOpen={openSection === "texts"}
                onToggle={() => toggleSection("texts")}
            >
                <div className="space-y-8">
                    <div>
                        <label className={labelClasses}>Einleitungstext (Standard)</label>
                        <textarea
                            name="defaultIntroText"
                            value={data.defaultIntroText}
                            onChange={handleChange}
                            rows={4}
                            className={cn(inputClasses, "resize-none")}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Geschäftsbedingungen / Abschluss</label>
                        <textarea
                            name="defaultTerms"
                            value={data.defaultTerms}
                            onChange={handleChange}
                            rows={4}
                            className={cn(inputClasses, "resize-none")}
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* E-Mail Vorlage */}
            <AccordionSection
                title="E-Mail Vorlage für Auftragsversand"
                icon={Mail}
                isOpen={openSection === "email"}
                onToggle={() => toggleSection("email")}
            >
                <div className="space-y-6">
                    <p className="text-sm font-medium text-slate-500 mb-2">
                        Legen Sie das Betreff- und Textmuster fest, das beim Klick auf &quot;Per Mail senden&quot; automatisch vorausgefüllt wird. Verwenden Sie den Platzhalter <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold text-xs">{`{documentNumber}`}</code> für die Auftragsnummer.
                    </p>
                    <div>
                        <label className={labelClasses}>Standard-Betreff</label>
                        <input
                            type="text"
                            name="emailSubject"
                            value={data.emailSubject || ""}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder="z.B. Auftragsbestätigung {documentNumber}"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Standard-Nachrichtentext</label>
                        <textarea
                            rows={6}
                            name="emailBody"
                            value={data.emailBody || ""}
                            onChange={handleChange}
                            className={cn(inputClasses, "resize-y font-medium")}
                            placeholder="Sehr geehrte Damen und Herren..."
                        />
                    </div>
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
                            Gespeichert!
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
