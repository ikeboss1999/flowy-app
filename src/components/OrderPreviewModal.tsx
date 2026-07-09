"use client";

import React from "react";
import dynamic from "next/dynamic";
import { X, Download, Loader2 } from "lucide-react";
import { OrderConfirmation } from "@/types/order";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { useOrderSettings } from "@/hooks/useOrderSettings";
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

    if (!isOpen || !order) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">

                {/* Modal Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            Auftrag #{order.orderNumber}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium mt-0.5">
                            {order.customerName} · {fmt(order.issueDate)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
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
