"use client";

import React, { useState, useRef } from 'react';
import {
    Building2,
    MapPin,
    User,
    Link as LinkIcon,
    CreditCard,
    ChevronDown,
    ChevronUp,
    Upload,
    Trash2,
    Phone,
    Globe,
    FileText,
    Gavel,
    CheckCircle2
} from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
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
                isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-8 border-t border-slate-100">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function CompanySettings() {
    const { data, updateData, isLoading } = useCompanySettings();
    const [openSection, setOpenSection] = useState<string | null>("firmendaten");
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isLoading) return <div className="p-8">Laden...</div>;

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                updateData({ logo: result });
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        updateData({ logo: undefined });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
    };

    const handleSave = async () => {
        // Data is already updated on change in this implementation, 
        // but we trigger the visual feedback here.
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Building2 className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Unternehmensdaten</h2>
            </div>

            {/* Firmendaten & Logo */}
            <AccordionSection
                title="Firmendaten & Logo"
                icon={Building2}
                isOpen={openSection === "firmendaten"}
                onToggle={() => toggleSection("firmendaten")}
            >
                <div className="space-y-8">
                    <div>
                        <p className="text-base font-bold text-slate-800 mb-6">Firmenlogo</p>
                        <div className="flex items-start gap-8">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="h-32 w-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 text-center group hover:border-indigo-500 transition-colors cursor-pointer relative overflow-hidden"
                            >
                                {data.logo ? (
                                    <img src={data.logo} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="h-8 w-8 text-slate-300 mb-2 group-hover:text-indigo-500 transition-colors" />
                                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Hochladen</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <Upload className="h-4 w-4" /> Logo hochladen
                                </button>
                                <button
                                    onClick={removeLogo}
                                    className="flex items-center gap-3 px-6 py-3 bg-white border border-red-100 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" /> Logo entfernen
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Firmenname *</label>
                            <input
                                type="text"
                                name="companyName"
                                value={data.companyName}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>E-Mail (optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={data.email || ""}
                                onChange={handleChange}
                                className={inputClasses}
                                placeholder="office@firma.at"
                            />
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Adresse */}
            <AccordionSection
                title="Adresse"
                icon={MapPin}
                isOpen={openSection === "adresse"}
                onToggle={() => toggleSection("adresse")}
            >
                <div className="space-y-8">
                    <div>
                        <label className={labelClasses}>Straße und Hausnummer *</label>
                        <input
                            type="text"
                            name="street"
                            value={data.street}
                            onChange={handleChange}
                            className={inputClasses}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <label className={labelClasses}>PLZ *</label>
                            <input
                                type="text"
                                name="zipCode"
                                value={data.zipCode}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Stadt *</label>
                            <input
                                type="text"
                                name="city"
                                value={data.city}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Land *</label>
                            <input
                                type="text"
                                name="country"
                                value={data.country}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Geschäftsführung */}
            <AccordionSection
                title="Geschäftsführung"
                icon={User}
                isOpen={openSection === "führung"}
                onToggle={() => toggleSection("führung")}
            >
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className={labelClasses}>Vorname Geschäftsführer *</label>
                        <input
                            type="text"
                            name="ceoFirstName"
                            value={data.ceoFirstName}
                            onChange={handleChange}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Nachname Geschäftsführer *</label>
                        <input
                            type="text"
                            name="ceoLastName"
                            value={data.ceoLastName}
                            onChange={handleChange}
                            className={inputClasses}
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* Kontakt & Steuern */}
            <AccordionSection
                title="Kontakt & Steuern"
                icon={FileText}
                isOpen={openSection === "steuern"}
                onToggle={() => toggleSection("steuern")}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Telefon</label>
                            <input
                                type="text"
                                name="phone"
                                value={data.phone}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Website</label>
                            <input
                                type="text"
                                name="website"
                                value={data.website || ""}
                                onChange={handleChange}
                                className={inputClasses}
                                placeholder="www.firma.at"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>UID-Nummer</label>
                            <input
                                type="text"
                                name="vatId"
                                value={data.vatId || ""}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Firmenbuchnummer</label>
                            <input
                                type="text"
                                name="commercialRegisterNumber"
                                value={data.commercialRegisterNumber || ""}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Firmenbuchgericht</label>
                            <input
                                type="text"
                                name="commercialCourt"
                                value={data.commercialCourt || ""}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Dienstgebernummer</label>
                            <input
                                type="text"
                                name="employerNumber"
                                value={data.employerNumber || ""}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Bankverbindung */}
            <AccordionSection
                title="Bankverbindung"
                icon={CreditCard}
                isOpen={openSection === "bank"}
                onToggle={() => toggleSection("bank")}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Bank</label>
                            <input
                                type="text"
                                name="bankName"
                                value={data.bankName}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>BIC</label>
                            <input
                                type="text"
                                name="bic"
                                value={data.bic}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>IBAN</label>
                        <input
                            type="text"
                            name="iban"
                            value={data.iban}
                            onChange={handleChange}
                            className={inputClasses}
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
                            Änderungen gespeichert!
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-6 w-6" />
                            Änderungen speichern
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
