"use client";

import React, { useState, useRef } from 'react';
import {
    Building2,
    MapPin,
    User,
    CreditCard,
    ChevronDown,
    ChevronUp,
    Upload,
    Trash2,
    FileText,
    CheckCircle2,
    Image as ImageIcon,
    RotateCcw,
    X
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
    const [logoEditor, setLogoEditor] = useState<{
        src: string;
        originalSrc: string;
        zoom: number;
        offsetX: number;
        offsetY: number;
        rotation: number;
    } | null>(null);
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
                setLogoEditor({
                    src: result,
                    originalSrc: result,
                    zoom: 1,
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const openLogoEditor = () => {
        if (!data.logo) return;
        setLogoEditor({
            src: data.logo,
            originalSrc: data.originalLogo || data.logo,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
        });
    };

    const removeLogo = () => {
        updateData({ logo: undefined, originalLogo: undefined });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const restoreOriginalLogo = () => {
        if (!data.originalLogo) return;
        updateData({ logo: data.originalLogo });
    };

    const resetLogoEditor = () => {
        setLogoEditor((prev) => prev ? {
            ...prev,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
        } : prev);
    };

    const saveEditedLogo = async () => {
        if (!logoEditor) return;

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = logoEditor.src;
        });

        const canvas = document.createElement("canvas");
        const outputWidth = 1300;
        const outputHeight = 360;
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, outputWidth, outputHeight);
        const baseScale = Math.max(outputWidth / image.width, outputHeight / image.height);
        const scale = baseScale * logoEditor.zoom;
        const offsetX = (logoEditor.offsetX / 100) * (outputWidth / 2);
        const offsetY = (logoEditor.offsetY / 100) * (outputHeight / 2);

        ctx.translate(outputWidth / 2 + offsetX, outputHeight / 2 + offsetY);
        ctx.rotate((logoEditor.rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        updateData({ logo: canvas.toDataURL("image/png"), originalLogo: logoEditor.originalSrc });
        setLogoEditor(null);

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
                                {data.logo && (
                                    <button
                                        onClick={openLogoEditor}
                                        className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <ImageIcon className="h-4 w-4" /> Logo bearbeiten
                                    </button>
                                )}
                                {data.logo && data.originalLogo && data.logo !== data.originalLogo && (
                                    <button
                                        onClick={restoreOriginalLogo}
                                        className="flex items-center gap-3 px-6 py-3 bg-white border border-emerald-100 rounded-xl font-bold text-sm text-emerald-700 hover:bg-emerald-50 transition-all"
                                    >
                                        <RotateCcw className="h-4 w-4" /> Original wiederherstellen
                                    </button>
                                )}
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
                    <div className="grid grid-cols-2 gap-8">
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
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Bundesland (Österreich) *</label>
                            <select
                                name="state"
                                value={data.state || ""}
                                onChange={(e) => updateData({ state: e.target.value })}
                                className={inputClasses}
                            >
                                <option value="">Bitte wählen...</option>
                                <option value="Burgenland">Burgenland</option>
                                <option value="Kärnten">Kärnten</option>
                                <option value="Niederösterreich">Niederösterreich</option>
                                <option value="Oberösterreich">Oberösterreich</option>
                                <option value="Salzburg">Salzburg</option>
                                <option value="Steiermark">Steiermark</option>
                                <option value="Tirol">Tirol</option>
                                <option value="Vorarlberg">Vorarlberg</option>
                                <option value="Wien">Wien</option>
                            </select>
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

            {logoEditor && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/30 p-6">
                    <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Logo bearbeiten</h3>
                                <p className="text-sm font-semibold text-slate-400">
                                    Zuschneiden, ausrichten und für PDF-Briefköpfe optimieren.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLogoEditor(null)}
                                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                                <div className="relative aspect-[13/4] overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-inner">
                                    <img
                                        src={logoEditor.src}
                                        alt="Logo Vorschau"
                                        className="absolute left-1/2 top-1/2 max-w-none select-none"
                                        style={{
                                            transform: `translate(calc(-50% + ${logoEditor.offsetX * 2}px), calc(-50% + ${logoEditor.offsetY}px)) rotate(${logoEditor.rotation}deg) scale(${logoEditor.zoom})`,
                                            maxHeight: "100%",
                                            maxWidth: "100%",
                                        }}
                                    />
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-indigo-500/20" />
                                </div>
                                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Dieser Rahmen entspricht ungefähr dem Logo-Bereich im Rechnungs-/Angebotskopf.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { key: "zoom", label: "Zoom", min: 0.6, max: 3, step: 0.05, value: logoEditor.zoom },
                                    { key: "offsetX", label: "Horizontal", min: -100, max: 100, step: 1, value: logoEditor.offsetX },
                                    { key: "offsetY", label: "Vertikal", min: -100, max: 100, step: 1, value: logoEditor.offsetY },
                                    { key: "rotation", label: "Drehung", min: -15, max: 15, step: 0.5, value: logoEditor.rotation },
                                ].map((control) => (
                                    <div key={control.key}>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="text-sm font-black text-slate-700">{control.label}</label>
                                            <span className="text-xs font-bold text-slate-400">
                                                {Number(control.value).toFixed(control.key === "zoom" ? 2 : 0)}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={control.min}
                                            max={control.max}
                                            step={control.step}
                                            value={control.value}
                                            onChange={(e) => {
                                                const value = Number(e.target.value);
                                                setLogoEditor((prev) => prev ? { ...prev, [control.key]: value } : prev);
                                            }}
                                            className="w-full accent-indigo-600"
                                        />
                                    </div>
                                ))}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={resetLogoEditor}
                                        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEditedLogo}
                                        className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.02]"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Speichern
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
