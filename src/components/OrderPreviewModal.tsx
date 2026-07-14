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
    const { data: orderSettings } = useOrderSettings();
    const { showToast } = useNotification();

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

        triggerMailto(customer?.email, subject, body);
        handleDownloadPDF();
        showToast("E-Mail geöffnet. PDF wurde erstellt/heruntergeladen - bitte hängen Sie diese im E-Mail-Programm an.", "info");
    };

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const isStoredOrder = !!order.pdfUrl;

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
        </div>
    );
}
