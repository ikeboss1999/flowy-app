"use client";

import React from "react";
import dynamic from "next/dynamic";
import { X, Download, Loader2, FileSignature, CheckCircle2, Receipt } from "lucide-react";
import { Offer } from "@/types/offer";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { cn } from "@/lib/utils";
import { useOfferSettings } from "@/hooks/useOfferSettings";
import { useOrderSettings } from "@/hooks/useOrderSettings";
import { useOrders } from "@/hooks/useOrders";
import { useOffers } from "@/hooks/useOffers";
import { useInvoices } from "@/hooks/useInvoices";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { useNotification } from "@/context/NotificationContext";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";

const OfferPDFPreview = dynamic(
    async () => {
        const [{ PDFViewer }, { OfferReactPDF }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/components/OfferReactPDF'),
        ]);
        return function OfferPDFPreviewInner({ offer, customer, companySettings, offerSettings }: any) {
            return (
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                    <OfferReactPDF
                        offer={offer}
                        customer={customer}
                        companySettings={companySettings}
                        offerSettings={offerSettings}
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

interface OfferPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    offer: Offer | null;
    customer?: Customer;
    companySettings: CompanyData;
}

export function OfferPreviewModal({ isOpen, onClose, offer, customer, companySettings }: OfferPreviewModalProps) {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isConverting, setIsConverting] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);
    const [isConvertingInvoice, setIsConvertingInvoice] = React.useState(false);
    const [showInvoiceSuccess, setShowInvoiceSuccess] = React.useState(false);

    const { data: offerSettings } = useOfferSettings();
    const { data: orderSettings, updateData: updateOrderSettings } = useOrderSettings();
    const { addOrder } = useOrders();
    const { updateOffer } = useOffers();
    const { invoices, addInvoice } = useInvoices();
    const { data: invoiceSettings, updateData: updateInvoiceSettings } = useInvoiceSettings();
    const { showToast } = useNotification();
    const router = useRouter();

    const alreadyInvoiced = React.useMemo(() => {
        if (!offer || !invoices) return false;
        return invoices.some(inv => inv.notes?.includes(`Bezug auf Angebot: ${offer.offerNumber}`));
    }, [offer, invoices]);

    if (!isOpen || !offer) return null;

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';

    const generatePDF = async () => {
        const { pdf } = await import('@react-pdf/renderer');
        const { OfferReactPDF } = await import('@/components/OfferReactPDF');
        return pdf(
            React.createElement(OfferReactPDF, { offer, customer, companySettings, offerSettings }) as any
        ).toBlob();
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const blob = await generatePDF();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const prefix = offer.documentType === 'estimate' ? 'Kostenvoranschlag' : 'Angebot';
            a.download = `${prefix}_${offer.offerNumber.replace(/\//g, '-')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[PDF Download]', e);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!offer || isConverting) return;
        setIsConverting(true);
        try {
            const orderNum = `${orderSettings.prefix}${String(orderSettings.nextOrderNumber).padStart(3, '0')}`;

            const newOrder = {
                id: nanoid(),
                orderNumber: orderNum,
                offerId: offer.id,
                offerNumber: offer.offerNumber,
                projectId: offer.projectId,
                customerId: offer.customerId,
                customerName: offer.customerName,
                issueDate: new Date().toISOString().split('T')[0],
                processor: offer.processor,
                introText: orderSettings.defaultIntroText,
                items: offer.items.map(item => ({
                    ...item,
                    id: nanoid(),
                    itemType: (item.itemType === 'info' ? 'standard' : item.itemType) as 'title' | 'standard' | 'detailed' | undefined,
                })),
                subtotal: offer.subtotal,
                taxRate: offer.taxRate,
                taxAmount: offer.taxAmount,
                totalAmount: offer.totalAmount,
                isReverseCharge: offer.isReverseCharge,
                status: 'confirmed' as const,
                terms: orderSettings.defaultTerms,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                constructionProject: offer.constructionProject,
                subjectExtra: offer.subjectExtra,
            };

            await addOrder(newOrder);
            await updateOffer(offer.id, { status: 'accepted' });
            await updateOrderSettings({ nextOrderNumber: orderSettings.nextOrderNumber + 1 });

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 2000);
        } catch (e) {
            console.error('[Order Creation]', e);
        } finally {
            setIsConverting(false);
        }
    };

    const handleCreateInvoice = async () => {
        if (!offer || isConvertingInvoice) return;
        setIsConvertingInvoice(true);
        try {
            const invoiceNum = `${new Date().getFullYear()}/${String(invoiceSettings.nextInvoiceNumber || 1).padStart(2, "0")}`;
            const defaultPaymentTerm = invoiceSettings.paymentTerms.find((pt: any) => pt.id === invoiceSettings.defaultPaymentTermId) || invoiceSettings.paymentTerms[0];
            const paymentTermsText = defaultPaymentTerm ? defaultPaymentTerm.text : "sofort nach Rechnungserhalt";

            const newInvoice = {
                id: nanoid(),
                invoiceNumber: invoiceNum,
                subjectExtra: offer.subjectExtra || "",
                constructionProject: offer.constructionProject || "",
                issueDate: new Date().toISOString().split('T')[0],
                paymentTerms: paymentTermsText,
                performancePeriod: { from: "", to: "" },
                customerId: offer.customerId,
                customerName: offer.customerName,
                processor: offer.processor,
                items: offer.items.map(item => ({
                    id: nanoid(),
                    title: item.title || "",
                    description: item.description || "",
                    itemType: item.itemType || "standard",
                    quantity: item.quantity,
                    unit: item.unit as any,
                    pricePerUnit: item.pricePerUnit,
                    totalPrice: item.totalPrice,
                })),
                subtotal: offer.subtotal,
                taxRate: offer.isReverseCharge ? 0 : invoiceSettings.defaultTaxRate || 20,
                taxAmount: offer.isReverseCharge ? 0 : offer.taxAmount,
                totalAmount: offer.isReverseCharge ? offer.subtotal : offer.totalAmount,
                isReverseCharge: offer.isReverseCharge || false,
                status: 'draft' as const,
                projectId: offer.projectId || "",
                notes: offer.notes
                    ? `${offer.notes}\n\nBezug auf Angebot: ${offer.offerNumber}`
                    : `Bezug auf Angebot: ${offer.offerNumber}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await addInvoice(newInvoice);
            await updateInvoiceSettings({ nextInvoiceNumber: invoiceSettings.nextInvoiceNumber + 1 });

            showToast("Rechnung erfolgreich als Entwurf erstellt!", "success");
            setShowInvoiceSuccess(true);

            setTimeout(() => {
                setShowInvoiceSuccess(false);
                onClose();
                router.push(`/invoices/${newInvoice.id}/edit`);
            }, 1500);
        } catch (e) {
            console.error('[Invoice Creation]', e);
            showToast("Fehler beim Erstellen der Rechnung.", "error");
        } finally {
            setIsConvertingInvoice(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">

                {/* ── Modal Header (Toolbar) ── */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            {offer.documentType === 'estimate' ? 'Kostenvoranschlag' : 'Angebot'} #{offer.offerNumber}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium mt-0.5">
                            {offer.customerName} · {fmt(offer.issueDate)}
                            {offer.validUntil ? ` · Gültig bis ${fmt(offer.validUntil)}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {showSuccess ? (
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 animate-in zoom-in duration-300">
                                <CheckCircle2 className="h-4 w-4" />
                                Auftrag erstellt!
                            </div>
                        ) : (
                            <button
                                onClick={handleCreateOrder}
                                disabled={isConverting}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-50",
                                    offer.status === 'accepted'
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-indigo-600 text-white shadow-indigo-200 hover:scale-[1.02] active:scale-95"
                                )}
                            >
                                {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                                {offer.status === 'accepted' ? 'Bereits bestätigt' : 'Auftrag bestätigen'}
                            </button>
                        )}

                        {showInvoiceSuccess ? (
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 animate-in zoom-in duration-300">
                                <CheckCircle2 className="h-4 w-4" />
                                Rechnung erstellt!
                            </div>
                        ) : (
                            <button
                                onClick={handleCreateInvoice}
                                disabled={offer.status !== 'accepted' || alreadyInvoiced || isConvertingInvoice}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-50",
                                    (offer.status !== 'accepted' || alreadyInvoiced)
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-emerald-600 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-95"
                                )}
                                title={
                                    alreadyInvoiced
                                        ? "Es wurde bereits eine Rechnung für dieses Angebot erstellt."
                                        : offer.status !== 'accepted'
                                            ? "Rechnung kann erst erstellt werden, wenn das Angebot angenommen wurde."
                                            : "Rechnung aus diesem Angebot erstellen"
                                }
                            >
                                {isConvertingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                                {alreadyInvoiced ? "Rechnung bereits erstellt" : "Rechnung erstellen"}
                            </button>
                        )}
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

                {/* ── Document Preview (echtes PDF-Rendering) ── */}
                <div className="flex-1 min-h-0 bg-slate-100">
                    <OfferPDFPreview
                        offer={offer}
                        customer={customer}
                        companySettings={companySettings}
                        offerSettings={offerSettings}
                    />
                </div>

            </div>
        </div>
    );
}
