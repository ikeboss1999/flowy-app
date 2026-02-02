import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { CompanyData } from '@/types/company';
import { DunningPDF } from './DunningPDF';
import { InvoicePrintHandler } from './InvoicePrintHandler';
import { X, Printer, AlertTriangle } from 'lucide-react';

interface DunningModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    customer: Customer;
    companySettings: CompanyData;
    invoiceSettings: InvoiceSettings;
    onConfirm: (level: number, date: string) => void;
}

export function DunningModal({ isOpen, onClose, invoice, customer, companySettings, invoiceSettings, onConfirm }: DunningModalProps) {
    const [level, setLevel] = useState(1);
    const [dunningDate, setDunningDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPrinting, setIsPrinting] = useState(false);

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

    const handlePrint = () => {
        setIsPrinting(true);
    };

    const handleAfterPrint = () => {
        setIsPrinting(false);
        onConfirm(level, dunningDate);
        onClose();
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                            Mahnwesen
                        </h2>
                        <p className="text-slate-500 font-medium">Rechnung Nr. {invoice.invoiceNumber}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                            {[1, 2, 3, 4].map(l => {
                                const disabled = isLevelDisabled(l);
                                return (
                                    <button
                                        key={l}
                                        disabled={disabled}
                                        onClick={() => setLevel(l)}
                                        title={disabled ? "Diese Stufe kann aktuell nicht gewählt werden" : ""}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === l
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : disabled
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {getLevelName(l)}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Printer className="h-5 w-5" />
                            Mahnung erstellen & Drucken
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl scale-[0.85] origin-top transition-transform">
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

            {/* Print Handler */}
            {isPrinting && (
                <InvoicePrintHandler onAfterPrint={handleAfterPrint}>
                    <DunningPDF
                        invoice={invoice}
                        customer={customer}
                        companySettings={companySettings}
                        invoiceSettings={invoiceSettings}
                        dunningLevel={level}
                        dunningDate={dunningDate}
                    />
                </InvoicePrintHandler>
            )}
        </div>
    );
}
