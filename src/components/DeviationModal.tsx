"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Euro, AlertCircle } from "lucide-react";
import { Invoice } from "@/types/invoice";
import { cn } from "@/lib/utils";

interface DeviationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: Invoice) => void;
    invoice: Invoice | null;
}

export function DeviationModal({ isOpen, onClose, onSave, invoice }: DeviationModalProps) {
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [deviationReason, setDeviationReason] = useState("");

    useEffect(() => {
        if (invoice) {
            setPaidAmount(invoice.paidAmount ?? invoice.totalAmount);
            setDeviationReason(invoice.paymentDeviation?.reason || "");
        }
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    const deviation = paidAmount - invoice.totalAmount;
    const hasDeviation = Math.abs(deviation) > 0.01;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const updatedInvoice: Invoice = {
            ...invoice,
            paidAmount,
            paymentDeviation: hasDeviation ? {
                amount: deviation,
                reason: deviationReason
            } : undefined
        };

        onSave(updatedInvoice);
        onClose();
    };

    const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Zahlung erfassen
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Rechnung #{invoice.invoiceNumber}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <form id="deviation-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Invoice Amount */}
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-indigo-900">Rechnungsbetrag</span>
                                <span className="text-2xl font-black text-indigo-600">
                                    € {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                                <div>
                                    <span className="text-indigo-600/70 font-medium">Netto:</span>
                                    <span className="ml-2 font-bold text-indigo-900">
                                        € {invoice.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-indigo-600/70 font-medium">Steuer ({invoice.taxRate}%):</span>
                                    <span className="ml-2 font-bold text-indigo-900">
                                        € {invoice.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Paid Amount */}
                        <div>
                            <label className={labelClasses}>Bezahlter Betrag</label>
                            <div className="relative">
                                <Euro className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                    className={cn(inputClasses, "pl-12 text-right font-mono text-lg")}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Deviation Display */}
                        {hasDeviation && (
                            <div className={cn(
                                "p-4 rounded-xl border-2 flex items-start gap-3",
                                deviation > 0
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-rose-50 border-rose-200"
                            )}>
                                <AlertCircle className={cn(
                                    "h-5 w-5 mt-0.5",
                                    deviation > 0 ? "text-emerald-600" : "text-rose-600"
                                )} />
                                <div className="flex-1">
                                    <p className={cn(
                                        "font-bold text-sm",
                                        deviation > 0 ? "text-emerald-900" : "text-rose-900"
                                    )}>
                                        {deviation > 0 ? "Überzahlung" : "Unterzahlung"} von € {Math.abs(deviation).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className={cn(
                                        "text-xs mt-1",
                                        deviation > 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        Bitte geben Sie einen Grund für die Abweichung an.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Deviation Reason */}
                        {hasDeviation && (
                            <div>
                                <label className={labelClasses}>Grund der Abweichung</label>
                                <textarea
                                    required={hasDeviation}
                                    value={deviationReason}
                                    onChange={(e) => setDeviationReason(e.target.value)}
                                    className={cn(inputClasses, "min-h-[100px] resize-none")}
                                    placeholder="z.B. Skonto, Teilzahlung, Kulanz..."
                                />
                            </div>
                        )}
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
                        form="deviation-form"
                        type="submit"
                        className="px-8 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
}
