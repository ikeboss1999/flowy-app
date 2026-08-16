import React, { useState } from 'react';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { CompanyData } from '@/types/company';
import { DunningPDF } from './DunningPDF';
import { InvoicePrintHandler } from './InvoicePrintHandler';
import { X, Eye, Download, Loader2, Mail } from 'lucide-react';
import { LockedPdfPreview } from './LockedPdfPreview';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { triggerMailto, replacePlaceholders } from '@/lib/email-helpers';
import { useNotification } from '@/context/NotificationContext';

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
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const { delivery, refresh: refreshEmailSettings } = useEmailSettings();
    const { showToast } = useNotification();

    if (!isOpen) return null;

    const pdfEndpoint = `/api/invoices/dunning-pdf-url?invoiceId=${encodeURIComponent(invoice.id)}&level=${encodeURIComponent(String(level))}&date=${encodeURIComponent(date)}`;
    const isStored = !!pdfPath;
    const isSmtpConfigured = !!delivery.smtpHost && !!delivery.smtpPort && !!delivery.smtpUser && !!delivery.fromEmail && !!delivery.hasSmtpPassword;

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

    const handleSendEmail = () => {
        const subject = replacePlaceholders(`${getLevelName(level)} zu Rechnung {documentNumber}`, {
            documentNumber: invoice.invoiceNumber,
            customerName: customer.name,
            contactPerson: customer.contactPerson
        });
        const body = replacePlaceholders(`Sehr geehrte Kundin, Sehr geehrter Kunde,\n\nanbei erhalten Sie ${getLevelName(level)} zu unserer Rechnung {documentNumber}.\n\nBitte pruefen Sie die offene Zahlung und melden Sie sich gerne bei Rueckfragen.`, {
            documentNumber: invoice.invoiceNumber,
            customerName: customer.name,
            contactPerson: customer.contactPerson
        });

        if (isSmtpConfigured && isStored) {
            setEmailSubject(subject);
            setEmailMessage(body);
            setIsEmailModalOpen(true);
            return;
        }

        const bodyWithSignature = [body, delivery.signature].filter(Boolean).join('\n\n');
        triggerMailto(customer.email, subject, bodyWithSignature);
        handleDownload();
        showToast("E-Mail geoeffnet. PDF wurde erstellt/heruntergeladen - bitte haengen Sie diese im E-Mail-Programm an.", "info");
    };

    const handleSendEmailViaSmtp = async () => {
        if (!customer.email) {
            showToast("Beim Kunden ist keine E-Mail-Adresse hinterlegt.", "error");
            return;
        }

        setIsSendingEmail(true);
        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType: 'dunning',
                    documentId: invoice.id,
                    level,
                    date,
                    subject: emailSubject,
                    message: emailMessage,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'E-Mail konnte nicht gesendet werden.');
            }

            showToast("E-Mail wurde erfolgreich gesendet.", "success");
            setIsEmailModalOpen(false);
            refreshEmailSettings();
        } catch (error: any) {
            showToast(error?.message || "E-Mail konnte nicht gesendet werden.", "error");
        } finally {
            setIsSendingEmail(false);
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
                            onClick={handleSendEmail}
                            className="px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-bold hover:bg-white/15 transition-all flex items-center gap-2"
                        >
                            <Mail className="h-5 w-5" />
                            Per Mail senden
                        </button>
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

            {isEmailModalOpen && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-8 py-5 text-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">E-Mail Versand</p>
                                <h3 className="mt-1 text-2xl font-black tracking-tight">Mahnung per Mail senden</h3>
                                <p className="mt-1 text-sm font-semibold text-white/60">{customer.email || "Keine E-Mail-Adresse"}</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} disabled={isSendingEmail} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition-all hover:bg-white/15 hover:text-white disabled:opacity-50">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)]">
                            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto border-r border-slate-100 p-6 custom-scrollbar">
                                <div>
                                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-slate-500">Empfaenger</label>
                                    <input value={customer.email || ""} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500" />
                                </div>
                                <div>
                                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-slate-500">Betreff</label>
                                    <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                                </div>
                                <div className="flex min-h-[340px] flex-1 flex-col">
                                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-slate-500">Nachricht</label>
                                    <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} className="min-h-[340px] flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                                </div>
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-900">PDF und persoenliche Signatur werden automatisch mitgesendet.</div>
                                <button onClick={handleSendEmailViaSmtp} disabled={isSendingEmail || !customer.email || !emailSubject.trim() || !emailMessage.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                                    {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                    {isSendingEmail ? "Wird gesendet..." : "E-Mail senden"}
                                </button>
                            </div>
                            <div className="min-h-0 bg-slate-100">
                                <LockedPdfPreview isStored={isStored} pdfUrlEndpoint={pdfEndpoint} title={`${getLevelName(level)} ${invoice.invoiceNumber}`} fallback={<DunningPDF invoice={invoice} customer={customer} companySettings={companySettings} invoiceSettings={invoiceSettings} dunningLevel={level} dunningDate={date} />} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
