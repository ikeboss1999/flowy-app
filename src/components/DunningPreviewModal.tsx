import React, { useState } from 'react';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { CompanyData } from '@/types/company';
import { DunningPDF } from './DunningPDF';
import { InvoicePrintHandler } from './InvoicePrintHandler';
import { X, Eye, Download, Loader2 } from 'lucide-react';
import { LockedPdfPreview } from './LockedPdfPreview';

interface DunningPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    customer: Customer;
    companySettings: CompanyData;
    invoiceSettings: InvoiceSettings;
    level: number;
    date: string;
    pdfPath?: string;
}

export function DunningPreviewModal({ isOpen, onClose, invoice, customer, companySettings, invoiceSettings, level, date, pdfPath }: DunningPreviewModalProps) {
    const [isPrinting, setIsPrinting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen) return null;

    const pdfEndpoint = `/api/invoices/dunning-pdf-url?invoiceId=${encodeURIComponent(invoice.id)}&level=${encodeURIComponent(String(level))}&date=${encodeURIComponent(date)}`;
    const isStored = !!pdfPath;

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

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            if (isStored) {
                const response = await fetch(`${pdfEndpoint}&download=1`);
                if (!response.ok) throw new Error(await response.text());
                const { url } = await response.json();
                const pdfResponse = await fetch(url);
                const blob = await pdfResponse.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `Mahnung_${level}_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(blobUrl);
                return;
            }

            handlePrint();
        } catch (error) {
            console.error("[DunningPreviewModal] Download failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 sm:px-8 flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Mahnarchiv</p>
                        <h2 className="text-2xl font-black flex items-center gap-3 mt-1">
                            <Eye className="h-6 w-6 text-cyan-200" />
                            Archivvorschau
                        </h2>
                        <p className="text-white/60 font-medium flex items-center gap-2">
                            {getLevelName(level)} vom {new Date(date).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                    <div className="mx-auto h-full max-w-[210mm] overflow-hidden rounded-2xl bg-white shadow-xl">
                        <LockedPdfPreview
                            isStored={isStored}
                            pdfUrlEndpoint={isStored ? pdfEndpoint : undefined}
                            title={`${getLevelName(level)} ${invoice.invoiceNumber}`}
                            fallback={
                                <DunningPDF
                                    invoice={invoice}
                                    customer={customer}
                                    companySettings={companySettings}
                                    invoiceSettings={invoiceSettings}
                                    dunningLevel={level}
                                    dunningDate={date}
                                />
                            }
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
