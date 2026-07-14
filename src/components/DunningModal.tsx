import React, { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { CompanyData } from '@/types/company';
import { DunningPDF } from './DunningPDF';
import { X, AlertTriangle, CalendarDays, FileCheck2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DunningModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    customer: Customer;
    companySettings: CompanyData;
    invoiceSettings: InvoiceSettings;
    onConfirm: (level: number, date: string, pdfPath: string) => Promise<void> | void;
}

export function DunningModal({ isOpen, onClose, invoice, customer, companySettings, invoiceSettings, onConfirm }: DunningModalProps) {
    const [level, setLevel] = useState(1);
    const [dunningDate, setDunningDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    // Auto-suggest next level
    useEffect(() => {
        if (isOpen && invoice) {
            const nextLevel = (invoice.dunningLevel || 0) + 1;
            setLevel(Math.min(nextLevel, 4));
        }
    }, [isOpen, invoice]);

    const isLevelDisabled = (itemLevel: number) => {
        const currentLevel = invoice.dunningLevel || 0;

        // Cannot skip levels (must be next sequential)
        if (itemLevel > currentLevel + 1) return true;

        // Cannot re-create already existing or previous levels
        if (itemLevel <= currentLevel) return true;

        return false;
    };

    if (!isOpen) return null;

    const handleFinalize = async () => {
        if (!pdfRef.current || isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            const html2pdf = (await import("html2pdf.js")).default;
            const fileName = `Mahnung_${level}_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
            const worker = html2pdf().from(pdfRef.current).set({
                margin: 0,
                filename: fileName,
                image: { type: "jpeg" as any, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as any },
            });
            const blob = await worker.output("blob");
            const pdfFile = new File([blob], fileName, { type: "application/pdf" });

            const formData = new FormData();
            formData.append("file", pdfFile);
            formData.append("invoiceId", invoice.id);
            formData.append("invoiceNumber", invoice.invoiceNumber);
            formData.append("level", String(level));

            const uploadResponse = await fetch("/api/invoices/dunning-pdf-upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error(await uploadResponse.text());
            }

            const uploadData = await uploadResponse.json();
            if (!uploadData.pdfPath) {
                throw new Error("PDF wurde nicht gespeichert.");
            }

            await onConfirm(level, dunningDate, uploadData.pdfPath);
            onClose();
        } catch (saveError) {
            console.error("[DunningModal] PDF save failed:", saveError);
            setError("Die Mahnung konnte nicht finalisiert werden, weil die PDF nicht gespeichert wurde.");
        } finally {
            setIsSaving(false);
        }
    };

    const getLevelName = (l: number) => {
        switch (l) {
            case 1: return "Zahlungserinnerung";
            case 2: return "1. Mahnung";
            case 3: return "2. Mahnung";
            case 4: return "Letzte Mahnung";
            default: return "Mahnung";
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-7xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-8 py-6 text-white">
                    <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">
                                <AlertTriangle className="h-4 w-4" />
                                Mahnwesen
                            </div>
                            <h2 className="text-3xl font-black tracking-tight">
                                Mahnung erstellen
                            </h2>
                            <p className="mt-1 max-w-2xl truncate font-semibold text-white/60">
                                Rechnung Nr. {invoice.invoiceNumber} · {customer.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/70 shadow-sm transition-all hover:bg-white/15 hover:text-white"
                            aria-label="Schließen"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <label className="flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-sm">
                                <CalendarDays className="h-4 w-4 text-cyan-200" />
                                <input
                                    type="date"
                                    value={dunningDate}
                                    onChange={(event) => setDunningDate(event.target.value)}
                                    className="bg-transparent text-white outline-none [color-scheme:dark]"
                                />
                            </label>
                            <div className="flex flex-wrap gap-1 rounded-2xl bg-white/10 p-1">
                                {[1, 2, 3, 4].map(l => {
                                    const disabled = isLevelDisabled(l);
                                    return (
                                        <button
                                            key={l}
                                            disabled={disabled}
                                            onClick={() => setLevel(l)}
                                            title={disabled ? "Diese Stufe kann aktuell nicht gewählt werden" : ""}
                                            className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${level === l
                                                    ? 'bg-white text-slate-950 shadow-sm'
                                                    : disabled
                                                        ? 'cursor-not-allowed text-white/25'
                                                        : 'text-white/65 hover:text-white'
                                                }`}
                                        >
                                            {getLevelName(l)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={handleFinalize}
                            disabled={isSaving || !!(invoice.dunningLevel && invoice.dunningLevel >= 4)}
                            className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black shadow-lg transition-all sm:w-fit",
                                (isSaving || (invoice.dunningLevel && invoice.dunningLevel >= 4))
                                    ? "cursor-not-allowed bg-white/10 text-white/40 shadow-none"
                                    : "bg-primary-gradient text-white shadow-fuchsia-950/30 hover:shadow-xl active:scale-95"
                            )}
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
                            {invoice.dunningLevel && invoice.dunningLevel >= 4 ? "Maximalstufe erreicht" : isSaving ? "PDF wird gespeichert..." : "Finalisieren & Speichern"}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="border-b border-rose-100 bg-rose-50 px-8 py-3 text-sm font-bold text-rose-600">
                        {error}
                    </div>
                )}

                {/* Preview Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                    <div ref={pdfRef} className="max-w-[210mm] mx-auto bg-white shadow-xl transition-transform">
                        <DunningPDF
                            invoice={invoice}
                            customer={customer}
                            companySettings={companySettings}
                            invoiceSettings={invoiceSettings}
                            dunningLevel={level}
                            dunningDate={dunningDate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
