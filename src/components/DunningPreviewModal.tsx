import React, { useState } from 'react';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { CompanyData } from '@/types/company';
import { DunningPDF } from './DunningPDF';
import { InvoicePrintHandler } from './InvoicePrintHandler';
import { X, Printer, Eye } from 'lucide-react';

interface DunningPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    customer: Customer;
    companySettings: CompanyData;
    invoiceSettings: InvoiceSettings;
    level: number;
    date: string;
}

export function DunningPreviewModal({ isOpen, onClose, invoice, customer, companySettings, invoiceSettings, level, date }: DunningPreviewModalProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    if (!isOpen) return null;

    const handlePrint = () => {
        setIsPrinting(true);
    };

    const handleAfterPrint = () => {
        setIsPrinting(false);
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Eye className="h-6 w-6 text-indigo-500" />
                            Archivvorschau
                        </h2>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            {getLevelName(level)} vom {new Date(date).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Printer className="h-5 w-5" />
                            Drucken / Download
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
                            dunningDate={date}
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
                        dunningDate={date}
                    />
                </InvoicePrintHandler>
            )}
        </div>
    );
}
