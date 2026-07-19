"use client";

import React, { useState } from 'react';
import {
    FileSignature,
    Hash,
    AlignLeft,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Mail,
    Percent,
} from "lucide-react";
import { useOfferSettings } from "@/hooks/useOfferSettings";
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

export function OfferSettings() {
    const { data, updateData, isLoading } = useOfferSettings();
    const [openSection, setOpenSection] = useState<string | null>("general");
    const [showSuccess, setShowSuccess] = useState(false);

    if (isLoading) return <div className="p-8 text-slate-400 font-bold">Laden...</div>;

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
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
                    <FileSignature className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Angebotseinstellungen</h2>
            </div>

            {/* Allgemeine Einstellungen */}
            <AccordionSection
                title="Allgemeine Angebotseinstellungen"
                icon={Hash}
                isOpen={openSection === "general"}
                onToggle={() => toggleSection("general")}
            >
                <div className="space-y-6">
                    <div>
                        <label className={labelClasses}>Nächste Angebotsnummer</label>
                        <p className="text-xs text-slate-400 font-medium mb-3 ml-1">
                            Die Angebotsnummer wird als <span className="font-black text-slate-600">JJJJ/A-XX</span> formatiert (z.B. 2026/A-04).
                        </p>
                        <input
                            type="number"
                            min="1"
                            value={data.nextOfferNumber}
                            onChange={(e) => updateData({ nextOfferNumber: Number(e.target.value) })}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Standard-Angebotsgültigkeit (in Tagen)</label>
                        <p className="text-xs text-slate-400 font-medium mb-3 ml-1">
                            Wenn in der Angebotserstellung kein festes Gültigkeitsdatum gewählt wird, greift dieser Standardwert (z.B. &quot;20 Tage ab Ausstellungsdatum&quot;).
                        </p>
                        <input
                            type="number"
                            min="1"
                            value={data.defaultValidityDays}
                            onChange={(e) => updateData({ defaultValidityDays: Number(e.target.value) })}
                            className={inputClasses}
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* Textbausteine */}
            <AccordionSection
                title="Textbausteine"
                icon={AlignLeft}
                isOpen={openSection === "texts"}
                onToggle={() => toggleSection("texts")}
            >
                <div className="space-y-6">
                    <div>
                        <label className={labelClasses}>Standard-Einleitungstext</label>
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-4 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                                <span className="font-bold">Hinweis zur Anrede:</span> Sie müssen hier keine Anrede (wie &quot;Sehr geehrte Damen und Herren&quot;) eintragen! 
                                Das System generiert die korrekte Anrede <span className="font-bold">vollautomatisch</span> basierend auf dem ausgewählten Kunden. 
                                Tragen Sie hier nur den eigentlichen Text ein (z.B. &quot;vielen Dank für Ihre Anfrage...&quot;).
                            </p>
                        </div>
                        <textarea
                            rows={6}
                            value={data.defaultIntroText}
                            onChange={(e) => updateData({ defaultIntroText: e.target.value })}
                            className={cn(inputClasses, "resize-y")}
                            placeholder="vielen Dank für Ihre Anfrage..."
                        />
                    </div>

                    {/* Preview */}
                    {data.defaultIntroText && (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Vorschau im PDF:</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                {data.defaultIntroText}
                            </p>
                        </div>
                    )}
                </div>
            </AccordionSection>

            <AccordionSection
                title="Skonto"
                icon={Percent}
                isOpen={openSection === "discount"}
                onToggle={() => toggleSection("discount")}
            >
                <div className="space-y-6">
                    <label className="flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                        <div>
                            <p className="text-sm font-black text-slate-800">Skonto standardmäßig anbieten</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                Diese Werte werden bei neuen Angeboten automatisch vorgeschlagen.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!data.defaultDiscountEnabled}
                            onChange={(e) => updateData({ defaultDiscountEnabled: e.target.checked })}
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </label>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelClasses}>Skontotage</label>
                            <input
                                type="number"
                                min="1"
                                value={data.defaultDiscountDays || 5}
                                onChange={(e) => updateData({ defaultDiscountDays: Number(e.target.value) })}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Skonto in %</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={data.defaultDiscountPercent || 3}
                                onChange={(e) => updateData({ defaultDiscountPercent: Number(e.target.value) })}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Vorschau im Angebot</p>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                            Bei Zahlung innerhalb von {data.defaultDiscountDays || 5} Tagen ab Rechnungsdatum gewähren wir {data.defaultDiscountPercent || 3} % Skonto.
                        </p>
                    </div>
                </div>
            </AccordionSection>

            {/* E-Mail Vorlage */}
            <AccordionSection
                title="E-Mail Vorlage für Angebotsversand"
                icon={Mail}
                isOpen={openSection === "email"}
                onToggle={() => toggleSection("email")}
            >
                <div className="space-y-6">
                    <p className="text-sm font-medium text-slate-500 mb-2">
                        Legen Sie das Betreff- und Textmuster fest, das beim Klick auf &quot;Per Mail senden&quot; automatisch vorausgefüllt wird. Verwenden Sie den Platzhalter <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold text-xs">{`{documentNumber}`}</code> für die Angebotsnummer.
                    </p>
                    <div>
                        <label className={labelClasses}>Standard-Betreff</label>
                        <input
                            type="text"
                            value={data.emailSubject || ""}
                            onChange={(e) => updateData({ emailSubject: e.target.value })}
                            className={inputClasses}
                            placeholder="z.B. Angebot {documentNumber}"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Standard-Nachrichtentext</label>
                        <textarea
                            rows={6}
                            value={data.emailBody || ""}
                            onChange={(e) => updateData({ emailBody: e.target.value })}
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
