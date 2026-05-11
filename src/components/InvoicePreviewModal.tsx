"use client";

import React, { useRef } from "react";
import { X, Download, Loader2, AlertTriangle } from "lucide-react";
import { Invoice } from "@/types/invoice";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { InvoicePDF } from "@/components/InvoicePDF";
import { DunningModal } from "@/components/DunningModal";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { useInvoices } from "@/hooks/useInvoices";

interface InvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    customer?: Customer;
    companySettings: CompanyData;
}

export function InvoicePreviewModal({ isOpen, onClose, invoice, customer, companySettings }: InvoicePreviewModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isDunningModalOpen, setIsDunningModalOpen] = React.useState(false);

    // Hooks for Dunning System
    const { data: invoiceSettings } = useInvoiceSettings();
    const { updateInvoice } = useInvoices();

    if (!isOpen || !invoice) return null;

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { InvoiceReactPDF } = await import('@/components/InvoiceReactPDF');
            const blob = await pdf(
                React.createElement(InvoiceReactPDF, { invoice, customer, companySettings }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            console.error('[PDF]', e);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDunningConfirm = (level: number, date: string) => {
        const historyEntry = {
            level,
            date,
            fee: invoiceSettings.dunningLevels[`level${level}` as keyof typeof invoiceSettings.dunningLevels]?.fee || 0
        };

        updateInvoice(invoice.id, {
            dunningLevel: level,
            lastDunningDate: date,
            dunningHistory: [...(invoice.dunningHistory || []), historyEntry],
            status: 'overdue' // Auto-set to overdue when dunning starts
        });
        setIsDunningModalOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200 no-print">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0 no-print">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Rechnung #{invoice.invoiceNumber}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Dunning Button */}
                        {/* Dunning Button */}
                        {invoice.status !== 'paid' && (
                            <button
                                onClick={() => setIsDunningModalOpen(true)}
                                className="px-4 py-3 bg-orange-50 text-orange-600 rounded-xl font-bold hover:bg-orange-100 transition-all flex items-center gap-2 mr-2"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                Mahnung
                            </button>
                        )}

                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isPrinting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> PDF wird erstellt...</>
                            ) : (
                                <><Download className="h-4 w-4" /> PDF Erstellen</>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 no-print">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl">
                        <InvoicePDF
                            ref={pdfRef}
                            invoice={invoice}
                            customer={customer}
                            companySettings={companySettings}
                        />
                    </div>
                </div>
            </div>

                {/* No Print Handler needed anymore as we use real PDFs */}

            {/* Dunning Modal */}
            {isDunningModalOpen && customer && (
                <DunningModal
                    isOpen={isDunningModalOpen}
                    onClose={() => setIsDunningModalOpen(false)}
                    invoice={invoice}
                    customer={customer}
                    companySettings={companySettings}
                    invoiceSettings={invoiceSettings}
                    onConfirm={handleDunningConfirm}
                />
            )}
        </div>
    );
}
