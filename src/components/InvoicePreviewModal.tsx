"use client";

import React from "react";
import dynamic from "next/dynamic";
import { X, Download, Loader2, AlertTriangle, RotateCcw, Mail } from "lucide-react";
import { Invoice } from "@/types/invoice";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { DunningModal } from "@/components/DunningModal";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { invoicePdfFileName } from "@/lib/document-filenames";
import { LockedPdfPreview } from "@/components/LockedPdfPreview";
import { triggerMailto, replacePlaceholders } from "@/lib/email-helpers";
import { useEmailSettings } from "@/hooks/useEmailSettings";

const InvoicePDFPreview = dynamic(
    async () => {
        const [{ PDFViewer }, { InvoiceReactPDF }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/components/InvoiceReactPDF'),
        ]);
        return function InvoicePDFPreviewInner({ invoice, customer, companySettings }: any) {
            return (
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                    <InvoiceReactPDF
                        invoice={invoice}
                        customer={customer}
                        companySettings={companySettings}
                    />
                </PDFViewer>
            );
        };
    },
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Vorschau wird geladen ...</span>
            </div>
        ),
    }
);

interface InvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    customer?: Customer;
    companySettings: CompanyData;
}

async function fetchSignedInvoicePdfUrl(invoiceId: string) {
    const response = await fetch(`/api/invoices/pdf-url?id=${encodeURIComponent(invoiceId)}`);
    if (!response.ok) {
        throw new Error(await response.text());
    }
    const data = await response.json();
    return data.url as string;
}

export function InvoicePreviewModal({ isOpen, onClose, invoice, customer, companySettings }: InvoicePreviewModalProps) {
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isDunningModalOpen, setIsDunningModalOpen] = React.useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
    const [emailSubject, setEmailSubject] = React.useState("");
    const [emailMessage, setEmailMessage] = React.useState("");
    const [isSendingEmail, setIsSendingEmail] = React.useState(false);

    // Hooks for Dunning System
    const { data: invoiceSettings } = useInvoiceSettings();
    const { updateInvoice } = useInvoices();
    const { profile } = useAuth();
    const { showConfirm, showToast } = useNotification();
    const { delivery, refresh: refreshEmailSettings } = useEmailSettings();

    if (!isOpen || !invoice) return null;

    const isStoredInvoice = invoice.status !== 'draft' && (!!invoice.pdfPath || !!invoice.pdfUrl);
    const canReopenInvoice = profile?.role === 'admin' || profile?.role === 'developer';
    const isSmtpConfigured = !!delivery.smtpHost && !!delivery.smtpPort && !!delivery.smtpUser && !!delivery.fromEmail && !!delivery.hasSmtpPassword;

    const handleSendEmail = () => {
        const emailSubject = invoiceSettings?.emailSubject || "Rechnung {documentNumber}";
        const emailBody = invoiceSettings?.emailBody || "Sehr geehrte Kundin, Sehr geehrter Kunde,\n\nvielen Dank für Ihre Beauftragung. Hiermit erhalten Sie unsere Rechnung {documentNumber}.\n\nMit freundlichen Grüßen";

        const subject = replacePlaceholders(emailSubject, {
            documentNumber: invoice.invoiceNumber,
            customerName: customer?.name || invoice.customerName,
            contactPerson: customer?.contactPerson
        });
        const body = replacePlaceholders(emailBody, {
            documentNumber: invoice.invoiceNumber,
            customerName: customer?.name || invoice.customerName,
            contactPerson: customer?.contactPerson
        });

        if (isSmtpConfigured && isStoredInvoice) {
            setEmailSubject(subject);
            setEmailMessage(body);
            setIsEmailModalOpen(true);
            return;
        }

        const bodyWithSignature = [body, delivery.signature].filter(Boolean).join('\n\n');
        triggerMailto(customer?.email, subject, bodyWithSignature);
        handlePrint();
        showToast("E-Mail geöffnet. PDF wurde erstellt/heruntergeladen - bitte hängen Sie diese im E-Mail-Programm an.", "info");
    };

    const handleSendEmailViaSmtp = async () => {
        if (!customer?.email) {
            showToast("Beim Kunden ist keine E-Mail-Adresse hinterlegt.", "error");
            return;
        }

        setIsSendingEmail(true);
        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType: 'invoice',
                    documentId: invoice.id,
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

    const handlePrint = async () => {
        if (isStoredInvoice) {
            setIsPrinting(true);
            try {
                const url = await fetchSignedInvoicePdfUrl(invoice.id);
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (e) {
                console.error('[InvoicePDFUrl]', e);
                showToast("Die gespeicherte PDF konnte nicht geöffnet werden.", "error");
            } finally {
                setIsPrinting(false);
            }
            return;
        }

        setIsPrinting(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { InvoiceReactPDF } = await import('@/components/InvoiceReactPDF');
            const blob = await pdf(
                React.createElement(InvoiceReactPDF, { 
                    invoice, 
                    customer, 
                    companySettings: invoice.performancePeriod?.companySnapshot || companySettings 
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = invoicePdfFileName({ ...invoice, customerName: customer?.name || invoice.customerName });
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[PDF]', e);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleReopenAsDraft = () => {
        if (!canReopenInvoice) return;

        showConfirm({
            title: "Rechnung wieder als Entwurf öffnen?",
            message: "Die gespeicherte PDF bleibt bis zur erneuten Finalisierung erhalten. Beim erneuten Finalisieren wird die sichtbare PDF der Rechnung ersetzt.",
            confirmLabel: "In Entwurf öffnen",
            variant: "danger",
            onConfirm: async () => {
                await updateInvoice(invoice.id, { status: 'draft' });
                showToast("Rechnung wurde wieder als Entwurf geöffnet.", "success");
                onClose();
            }
        });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200 no-print">
                {/* Header */}
                <div className="grid gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-6 py-5 text-white shrink-0 no-print lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center sm:px-8">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Rechnungsvorschau</p>
                        <h2 className="mt-1 truncate text-2xl font-black tracking-tight">
                            Rechnung #{invoice.invoiceNumber}
                        </h2>
                        <p className="mt-1 truncate text-sm text-white/60 font-medium">
                            {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                        {/* Dunning Button */}
                        {/* Dunning Button */}
                        {invoice.status !== 'draft' && invoice.status !== 'paid' && (
                            <button
                                onClick={() => setIsDunningModalOpen(true)}
                                className="whitespace-nowrap px-4 py-3 bg-orange-500/15 text-orange-100 border border-orange-300/20 rounded-xl font-bold hover:bg-orange-500/25 transition-all flex items-center gap-2"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                Mahnung
                            </button>
                        )}

                        {invoice.status !== 'draft' && canReopenInvoice && (
                            <button
                                onClick={handleReopenAsDraft}
                                className="whitespace-nowrap px-4 py-3 bg-amber-500/15 text-amber-100 border border-amber-300/20 rounded-xl font-bold hover:bg-amber-500/25 transition-all flex items-center gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                In Entwurf
                            </button>
                        )}

                        <button
                            onClick={handleSendEmail}
                            className="whitespace-nowrap px-4 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-bold hover:bg-white/15 transition-all flex items-center gap-2"
                            title="Dokument per E-Mail senden"
                        >
                            <Mail className="h-4 w-4" />
                            Per Mail senden
                        </button>

                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="whitespace-nowrap px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isPrinting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> PDF wird erstellt...</>
                            ) : (
                                <><Download className="h-4 w-4" /> {isStoredInvoice ? 'PDF öffnen' : 'PDF Erstellen'}</>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 min-h-0 bg-slate-100 no-print">
                    <LockedPdfPreview
                        isStored={isStoredInvoice}
                        pdfUrlEndpoint={isStoredInvoice ? `/api/invoices/pdf-url?id=${encodeURIComponent(invoice.id)}` : undefined}
                        title={`Rechnung ${invoice.invoiceNumber}`}
                        fallback={
                            <InvoicePDFPreview
                                invoice={invoice}
                                customer={customer}
                                companySettings={invoice.performancePeriod?.companySnapshot || companySettings}
                            />
                        }
                    />
                </div>
            </div>

                {/* No Print Handler needed anymore as we use real PDFs */}

            {isEmailModalOpen && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-8 py-5 text-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">E-Mail Versand</p>
                                <h3 className="mt-1 text-2xl font-black tracking-tight">Rechnung per Mail senden</h3>
                                <p className="mt-1 text-sm font-semibold text-white/60">{customer?.email || "Keine E-Mail-Adresse"}</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} disabled={isSendingEmail} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition-all hover:bg-white/15 hover:text-white disabled:opacity-50">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)]">
                            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto border-r border-slate-100 p-6 custom-scrollbar">
                                <div>
                                    <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-slate-500">Empfaenger</label>
                                    <input value={customer?.email || ""} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500" />
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
                                <button onClick={handleSendEmailViaSmtp} disabled={isSendingEmail || !customer?.email || !emailSubject.trim() || !emailMessage.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                                    {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                    {isSendingEmail ? "Wird gesendet..." : "E-Mail senden"}
                                </button>
                            </div>
                            <div className="min-h-0 bg-slate-100">
                                <LockedPdfPreview
                                    isStored={isStoredInvoice}
                                    pdfUrlEndpoint={`/api/invoices/pdf-url?id=${encodeURIComponent(invoice.id)}`}
                                    title={`Rechnung ${invoice.invoiceNumber}`}
                                    fallback={
                                        <InvoicePDFPreview
                                            invoice={invoice}
                                            customer={customer}
                                            companySettings={invoice.performancePeriod?.companySnapshot || companySettings}
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
