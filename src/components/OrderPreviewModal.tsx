"use client";

import React, { useRef } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { OrderConfirmation, OrderSettings } from "@/types/order";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { OrderPDF } from "@/components/OrderPDF";
import { useOrderSettings } from "@/hooks/useOrderSettings";

interface OrderPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderConfirmation | null;
    customer?: Customer;
    companySettings: CompanyData;
}

export function OrderPreviewModal({ isOpen, onClose, order, customer, companySettings }: OrderPreviewModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const { data: orderSettings } = useOrderSettings();

    if (!isOpen || !order) return null;

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';

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
            const blob = await generatePDF();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Auftrag_${order.orderNumber.replace(/\//g, '-')}.pdf`;
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
            <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">

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
                            className="px-5 py-2.5 bg-primary-gradient text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            PDF Herunterladen
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
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl">
                        <OrderPDF
                            ref={pdfRef}
                            order={order}
                            customer={customer}
                            companySettings={companySettings}
                            orderSettings={orderSettings}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
