"use client";

import React from "react";
import dynamic from "next/dynamic";
import { X, Download, Loader2, Mail } from "lucide-react";
import { triggerMailto, replacePlaceholders } from "@/lib/email-helpers";
import { OrderConfirmation } from "@/types/order";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { useOrderSettings } from "@/hooks/useOrderSettings";
import { useNotification } from "@/context/NotificationContext";
import { orderPdfFileName } from "@/lib/document-filenames";
import { LockedPdfPreview } from "@/components/LockedPdfPreview";
import { useEmailSettings } from "@/hooks/useEmailSettings";

const OrderPDFPreview = dynamic(
    async () => {
        const [{ PDFViewer }, { OrderReactPDF }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/components/OrderReactPDF'),
        ]);
        return function OrderPDFPreviewInner({ order, customer, companySettings, orderSettings }: any) {
            return (
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                    <OrderReactPDF
                        order={order}
                        customer={customer}
                        companySettings={companySettings}
                        orderSettings={orderSettings}
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
                <span className="text-sm font-medium">Vorschau wird geladen …</span>
            </div>
        ),
    }
);

interface OrderPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderConfirmation | null;
    customer?: Customer;
    companySettings: CompanyData;
}

async function fetchSignedOrderPdfUrl(orderId: string) {
    const response = await fetch(`/api/orders/pdf-url?id=${encodeURIComponent(orderId)}`);
    if (!response.ok) {
        throw new Error(await response.text());
    }
    const data = await response.json();
    return data.url as string;
}

export function OrderPreviewModal({ isOpen, onClose, order, customer, companySettings }: OrderPreviewModalProps) {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
    const [emailSubject, setEmailSubject] = React.useState("");
    const [emailMessage, setEmailMessage] = React.useState("");
    const [isSendingEmail, setIsSendingEmail] = React.useState(false);
    const { data: orderSettings } = useOrderSettings();
    const { showToast } = useNotification();
    const { delivery, refresh: refreshEmailSettings } = useEmailSettings();

    if (!isOpen || !order) return null;

    const handleSendEmail = () => {
        const emailSubject = orderSettings?.emailSubject || "Auftragsbestätigung {documentNumber}";
        const emailBody = orderSettings?.emailBody || "Sehr geehrte Kundin, Sehr geehrter Kunde,\n\nvielen Dank für Ihre Beauftragung. Hiermit erhalten Sie unsere Auftragsbestätigung {documentNumber}.\n\nMit freundlichen Grüßen";

        const subject = replacePlaceholders(emailSubject, {
            documentNumber: order.orderNumber,
            customerName: customer?.name || order.customerName,
            contactPerson: customer?.contactPerson
        });
        const body = replacePlaceholders(emailBody, {
            documentNumber: order.orderNumber,
            customerName: customer?.name || order.customerName,
            contactPerson: customer?.contactPerson
        });

        if (isSmtpConfigured && isStoredOrder) {
            setEmailSubject(subject);
            setEmailMessage(body);
            setIsEmailModalOpen(true);
            return;
        }

        const bodyWithSignature = [body, delivery.signature].filter(Boolean).join('\n\n');
        triggerMailto(customer?.email, subject, bodyWithSignature);
        handleDownloadPDF();
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
                    documentType: 'order',
                    documentId: order.id,
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

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const isStoredOrder = !!order.pdfUrl;
    const isSmtpConfigured = !!delivery.smtpHost && !!delivery.smtpPort && !!delivery.smtpUser && !!delivery.fromEmail && !!delivery.hasSmtpPassword;

    const generatePDF = async () => {
        const { pdf } = await import('@react-pdf/renderer');
        const { OrderReactPDF } = await import('@/components/OrderReactPDF');
        return pdf(
            React.createElement(OrderReactPDF, { order, customer, companySettings, orderSettings }) as any
        ).toBlob();
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const fileName = orderPdfFileName({ ...order, customerName: customer?.name || order.customerName });

            if (isStoredOrder) {
                const pdfUrl = await fetchSignedOrderPdfUrl(order.id);
                try {
                    const response = await fetch(pdfUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                } catch {
                    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                }
                return;
            }

            const blob = await generatePDF();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[PDF Download]', e);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200">

                {/* Modal Header */}
                <div className="px-6 py-5 sm:px-8 flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 text-white shrink-0">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Auftragsvorschau</p>
                        <h2 className="text-2xl font-black tracking-tight mt-1">
                            Auftrag #{order.orderNumber}
                        </h2>
                        <p className="text-sm text-white/60 font-medium mt-1">
                            {order.customerName} · {fmt(order.issueDate)}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            onClick={handleSendEmail}
                            className="px-5 py-2.5 bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-white/15 transition-all flex items-center gap-2"
                            title="Auftragsbestätigung per E-Mail senden"
                        >
                            <Mail className="h-4 w-4" />
                            Per Mail senden
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="px-5 py-2.5 bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-white/15 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Document Preview */}
                <div className="flex-1 min-h-0 bg-slate-100">
                    <LockedPdfPreview
                        isStored={isStoredOrder}
                        pdfUrlEndpoint={isStoredOrder ? `/api/orders/pdf-url?id=${encodeURIComponent(order.id)}` : undefined}
                        title={`Auftrag ${order.orderNumber}`}
                        fallback={
                            <OrderPDFPreview
                                order={order}
                                customer={customer}
                                companySettings={companySettings}
                                orderSettings={orderSettings}
                            />
                        }
                    />
                </div>

            </div>
            {isEmailModalOpen && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-8 py-5 text-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">E-Mail Versand</p>
                                <h3 className="mt-1 text-2xl font-black tracking-tight">Auftrag per Mail senden</h3>
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
                                    isStored={isStoredOrder}
                                    pdfUrlEndpoint={`/api/orders/pdf-url?id=${encodeURIComponent(order.id)}`}
                                    title={`Auftrag ${order.orderNumber}`}
                                    fallback={
                                        <OrderPDFPreview
                                            order={order}
                                            customer={customer}
                                            companySettings={companySettings}
                                            orderSettings={orderSettings}
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
