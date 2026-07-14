"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Briefcase,
    FileText,
    Folder,
    Layers,
    Package,
    Save,
    Type,
    Wrench,
    X,
} from "lucide-react";
import { Service } from "@/types/service";
import { cn } from "@/lib/utils";
import { InvoiceUnit } from "@/types/invoice";

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Service) => void;
    initialService?: Service;
    folders?: string[];
    mode?: "service" | "position";
}

const inputClasses = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";
const labelClasses = "px-1 text-[10px] font-black uppercase tracking-widest text-slate-400";

const unitOptions: Array<{ value: InvoiceUnit; label: string }> = [
    { value: "h", label: "Stunde (h)" },
    { value: "PA", label: "Pauschal (PA)" },
    { value: "Stk", label: "Stück (Stk)" },
    { value: "m", label: "Meter (m)" },
    { value: "m²", label: "Quadratmeter (m²)" },
    { value: "m³", label: "Kubikmeter (m³)" },
    { value: "Tag", label: "Tag" },
    { value: "kg", label: "Kilogramm (kg)" },
];

export function ServiceModal({ isOpen, onClose, onSave, initialService, folders, mode }: ServiceModalProps) {
    const resolvedMode = mode || (initialService?.category === "Position" ? "position" : "service");
    const isPositionMode = resolvedMode === "position";
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        unit: "h" as InvoiceUnit,
        price: 0,
        category: "Labor" as Service["category"],
        itemType: "standard" as "standard" | "detailed",
        folder: null as string | null
    });

    useEffect(() => {
        if (initialService) {
            setFormData({
                title: initialService.title,
                description: initialService.description || "",
                unit: initialService.unit,
                price: initialService.price,
                category: isPositionMode ? "Position" : (initialService.category || "Labor"),
                itemType: initialService.itemType || "standard",
                folder: initialService.folder || null
            });
        } else {
            setFormData({
                title: "",
                description: "",
                unit: isPositionMode ? "PA" : "h",
                price: 0,
                category: isPositionMode ? "Position" : "Labor",
                itemType: "standard",
                folder: null
            });
        }
    }, [initialService, isOpen, isPositionMode]);

    const previewMeta = useMemo(() => {
        if (isPositionMode) {
            return {
                title: "Positions-Vorlage",
                subtitle: "Wiederverwendbare Position für Angebote und Rechnungen.",
                icon: formData.itemType === "detailed" ? FileText : Layers,
                color: formData.itemType === "detailed" ? "text-emerald-600" : "text-indigo-600",
                bg: formData.itemType === "detailed" ? "bg-emerald-50" : "bg-indigo-50",
            };
        }

        if (formData.category === "Material") {
            return { title: "Material", subtitle: "Materialpreis oder Lieferposition.", icon: Package, color: "text-amber-600", bg: "bg-amber-50" };
        }
        if (formData.category === "FlatRate") {
            return { title: "Pauschale", subtitle: "Fixpreis für wiederkehrende Leistung.", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50" };
        }
        return { title: "Arbeitsleistung", subtitle: "Zeit- oder Leistungsposition.", icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50" };
    }, [formData.category, formData.itemType, isPositionMode]);

    if (!isOpen) return null;

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onSave({
            id: initialService?.id || Math.random().toString(36).slice(2, 11),
            userId: initialService?.userId || "",
            ...formData,
            category: isPositionMode ? "Position" : formData.category,
            folder: isPositionMode ? formData.folder || undefined : undefined,
            createdAt: initialService?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Service);
        onClose();
    };

    const PreviewIcon = previewMeta.icon;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-white/30 p-4 animate-in fade-in duration-200">
            <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-6 text-white sm:px-8">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/15">
                            <PreviewIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100">Katalog</p>
                            <h2 className="text-2xl font-black leading-tight text-white">
                                {initialService ? "Eintrag bearbeiten" : isPositionMode ? "Neue Positions-Vorlage" : "Neue Leistung"}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 p-2 text-white/70 shadow-sm transition-colors hover:bg-white hover:text-indigo-700">
                        <X className="h-5 w-5" />
                    </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid flex-1 overflow-y-auto bg-slate-50/60 xl:grid-cols-[340px_1fr]">
                    <aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                        <div className="relative space-y-5">
                            <div className="rounded-[32px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                                <div className={cn("mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white", previewMeta.color)}>
                                    <PreviewIcon className="h-8 w-8" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-cyan-100/70">{previewMeta.title}</p>
                                <h3 className="mt-2 break-words text-3xl font-black leading-tight">
                                    {formData.title || (isPositionMode ? "Positionsname" : "Leistungsname")}
                                </h3>
                                <p className="mt-3 text-sm font-semibold text-white/60">{previewMeta.subtitle}</p>
                            </div>

                            <div className="grid gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Einheit</p>
                                    <p className="mt-1 text-lg font-black text-white">{formData.unit}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Nettopreis</p>
                                    <p className="mt-1 text-2xl font-black text-white">
                                        € {(formData.price || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                {isPositionMode && (
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Ordner</p>
                                        <p className="mt-1 truncate text-sm font-black text-white">{formData.folder || "Hauptverzeichnis"}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="space-y-6 p-6 sm:p-8">
                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <Type className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Grunddaten</h3>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Bezeichnung *</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                                        className={inputClasses}
                                        placeholder={isPositionMode ? "z.B. Malerarbeiten Innenbereich" : "z.B. Regiestunde Facharbeiter"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Beschreibung</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                        rows={4}
                                        className={cn(inputClasses, "resize-none")}
                                        placeholder="Beschreibung, Hinweise oder Leistungsumfang..."
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <Wrench className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Preis & Einordnung</h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Einheit</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(event) => setFormData({ ...formData, unit: event.target.value as InvoiceUnit })}
                                        className={inputClasses}
                                    >
                                        {unitOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Preis netto *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">€</span>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={Number.isNaN(formData.price) ? "" : formData.price}
                                            onChange={(event) => setFormData({ ...formData, price: parseFloat(event.target.value) || 0 })}
                                            className={cn(inputClasses, "pl-10 text-right font-mono")}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {!isPositionMode && (
                                <div className="mt-5 space-y-2">
                                    <label className={labelClasses}>Kategorie</label>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        {[
                                            { id: "Labor", label: "Arbeit", icon: Briefcase },
                                            { id: "Material", label: "Material", icon: Package },
                                            { id: "FlatRate", label: "Pauschale", icon: Layers },
                                        ].map(({ id, label, icon: Icon }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: id as Service["category"] })}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all",
                                                    formData.category === id
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isPositionMode && (
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className={labelClasses}>Positionstyp</label>
                                        <div className="grid gap-2">
                                            {[
                                                { id: "standard", label: "Standard", description: "Eine kompakte Positionszeile" },
                                                { id: "detailed", label: "Detailliert", description: "Mit zusätzlicher Detailzeile" },
                                            ].map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, itemType: item.id as "standard" | "detailed" })}
                                                    className={cn(
                                                        "rounded-2xl border p-4 text-left transition-all",
                                                        formData.itemType === item.id
                                                            ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                                                    )}
                                                >
                                                    <p className="font-black">{item.label}</p>
                                                    <p className="text-xs font-semibold opacity-70">{item.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={labelClasses}>Ordner</label>
                                        <div className="relative">
                                            <Folder className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={formData.folder || ""}
                                                onChange={(event) => setFormData({ ...formData, folder: event.target.value || null })}
                                                className={cn(inputClasses, "pl-12")}
                                            >
                                                <option value="">Hauptverzeichnis</option>
                                                {folders?.map(folderName => (
                                                    <option key={folderName} value={folderName}>{folderName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-slate-100 bg-white/90 p-6 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                className="bg-primary-gradient flex-[2] rounded-2xl px-6 py-3.5 font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Save className="h-5 w-5" />
                                    {initialService ? "Änderungen speichern" : isPositionMode ? "Vorlage erstellen" : "Leistung erstellen"}
                                </span>
                            </button>
                        </div>
                    </main>
                </form>
            </div>
        </div>
    );
}
