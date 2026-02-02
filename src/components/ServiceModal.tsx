"use client";

import React, { useState, useEffect } from "react";
import { X, Wrench, Save } from "lucide-react";
import { Service } from "@/types/service";
import { cn } from "@/lib/utils";
import { InvoiceUnit } from "@/types/invoice";

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Service) => void;
    initialService?: Service;
}

export function ServiceModal({ isOpen, onClose, onSave, initialService }: ServiceModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        unit: "h" as InvoiceUnit,
        price: 0,
        category: "Labor" as Service['category']
    });

    useEffect(() => {
        if (initialService) {
            setFormData({
                title: initialService.title,
                description: initialService.description || "",
                unit: initialService.unit,
                price: initialService.price,
                category: initialService.category || "Labor"
            });
        } else {
            setFormData({
                title: "",
                description: "",
                unit: "h",
                price: 0,
                category: "Labor"
            });
        }
    }, [initialService, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: initialService?.id || Math.random().toString(36).substr(2, 9),
            userId: initialService?.userId || "", // The hook will overwrite this with the actual user.id
            ...formData,
            createdAt: initialService?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Service);
        onClose();
    };

    const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                                {initialService ? 'Bearbeiten' : 'Neu'}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {initialService ? 'Leistung bearbeiten' : 'Neue Leistung'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form id="service-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className={labelClasses}>Bezeichnung</label>
                            <div className="relative">
                                <Wrench className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className={cn(inputClasses, "pl-12")}
                                    placeholder="z.B. Regiestunde"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Beschreibung (Optional)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={cn(inputClasses, "min-h-[100px] resize-none")}
                                placeholder="Details zur Leistung..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Einheit</label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                                    className={cn(inputClasses, "appearance-none")}
                                >
                                    <option value="h">Stunde (h)</option>
                                    <option value="PA">Pauschal (PA)</option>
                                    <option value="Stk">Stück (Stk)</option>
                                    <option value="m">Meter (m)</option>
                                    <option value="m²">Quadratmeter (m²)</option>
                                    <option value="m³">Kubikmeter (m³)</option>
                                    <option value="Tag">Tag</option>
                                    <option value="kg">Kilogramm (kg)</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Preis (netto)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold">€</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        className={cn(inputClasses, "pl-10 text-right font-mono")}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Kategorie</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'Labor', label: 'Arbeit' },
                                    { id: 'Material', label: 'Material' },
                                    { id: 'FlatRate', label: 'Pauschale' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat.id as any })}
                                        className={cn(
                                            "py-3 rounded-xl text-sm font-bold border transition-all",
                                            formData.category === cat.id
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-white transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        form="service-form"
                        type="submit"
                        className="px-8 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {initialService ? 'Speichern' : 'Erstellen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
