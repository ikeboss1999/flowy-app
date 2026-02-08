"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Calendar, CheckCircle, Flag } from "lucide-react";
import { PaymentPlanItem, Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/DatePicker";

interface PaymentPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSave: (updatedPlan: PaymentPlanItem[]) => void;
}

export function PaymentPlanModal({ isOpen, onClose, project, onSave }: PaymentPlanModalProps) {
    const [items, setItems] = useState<PaymentPlanItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setItems(project.paymentPlan || []);
        }
    }, [isOpen, project]);

    const handleAddItem = () => {
        const newItem: PaymentPlanItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: `${items.length + 1}. Teilrechnung`,
            amount: 0,
            status: 'planned',
            dueDate: ''
        };
        setItems([...items, newItem]);
    };

    const handleAddFinalItem = () => {
        const newItem: PaymentPlanItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Schlussrechnung',
            amount: remaining,
            status: 'planned',
            dueDate: '',
            type: 'final'
        };
        setItems([...items, newItem]);
    };

    const handleUpdateItem = (id: string, field: keyof PaymentPlanItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSave = () => {
        onSave(items);
        onClose();
    };

    const totalPlanned = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const budgetWrapper = project.budget || 0;
    const remaining = Math.max(0, budgetWrapper - totalPlanned);

    const hasFinalInvoice = items.some(item => item.type === 'final');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Zahlungsplan bearbeiten
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {project.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Budget Info */}
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Projekt Summe (Netto)</p>
                            <p className="text-xl font-black text-indigo-700">€ {budgetWrapper.toLocaleString('de-DE')}</p>
                        </div>
                        <div className="flex-1 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Verplant</p>
                            <p className="text-xl font-black text-emerald-700">€ {totalPlanned.toLocaleString('de-DE')}</p>
                        </div>
                        <div className={cn(
                            "flex-1 p-4 rounded-2xl border transition-colors",
                            remaining < 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
                        )}>
                            <p className={cn(
                                "text-xs font-bold uppercase tracking-widest mb-1",
                                remaining < 0 ? "text-rose-500" : "text-slate-400"
                            )}>
                                {remaining < 0 ? "Über Budget" : "Verfügbar"}
                            </p>
                            <p className={cn(
                                "text-xl font-black",
                                remaining < 0 ? "text-rose-600" : "text-slate-700"
                            )}>
                                {remaining < 0 ? '-' : ''} € {Math.abs(remaining).toLocaleString('de-DE')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex gap-4 items-start p-4 border rounded-2xl shadow-sm transition-all group",
                                    item.type === 'final'
                                        ? "bg-indigo-50/30 border-indigo-200 hover:border-indigo-300"
                                        : "bg-white border-slate-100 hover:border-indigo-100"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-2",
                                    item.type === 'final' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                                )}>
                                    {item.type === 'final' ? <Flag className="h-4 w-4" /> : index + 1}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Bezeichnung</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="z.B. 1. Teilrechnung"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Fälligkeit (Optional)</label>
                                            <DatePicker
                                                value={item.dueDate || ''}
                                                onChange={(val) => handleUpdateItem(item.id, 'dueDate', val)}
                                                placeholder="Datum wählen"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Leistungsbeschreibung (Was wird abgerechnet?)</label>
                                        <input
                                            type="text"
                                            value={item.description || ''}
                                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="z.B. Erdarbeiten, Fundament, etc."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Betrag (Netto)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={item.amount || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        handleUpdateItem(item.id, 'amount', isNaN(val) ? 0 : val);
                                                    }}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pl-8"
                                                />
                                                <span className="absolute left-3 top-2 text-slate-400 font-bold">€</span>
                                            </div>
                                        </div>
                                        <div className="flex items-end">
                                            {item.invoiceId ? (
                                                <div className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100 w-full justify-center h-[42px]">
                                                    <CheckCircle className="h-4 w-4" /> Rechnung erstellt
                                                </div>
                                            ) : (
                                                <div className="px-3 py-2 bg-slate-50 text-slate-400 rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-100 w-full justify-center h-[42px]">
                                                    Noch nicht erstellt
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={!!item.invoiceId}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all mt-2 disabled:opacity-0"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddItem}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        disabled={hasFinalInvoice}
                    >
                        <Plus className="h-5 w-5" /> Weitere Teilzahlung hinzufügen
                    </button>

                    <button
                        onClick={handleAddFinalItem}
                        disabled={hasFinalInvoice || remaining <= 0}
                        className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Flag className="h-5 w-5" /> Schlussrechnung hinzufügen
                    </button>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" /> Zahlungsplan speichern
                    </button>
                </div>
            </div>
        </div>
    );
}
