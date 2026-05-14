"use client";

import React, { useRef } from "react";

import { X, Download, Loader2, FileSignature, CheckCircle2 } from "lucide-react";
import { Offer } from "@/types/offer";
import { Customer } from "@/types/customer";
import { CompanyData } from "@/types/company";
import { cn } from "@/lib/utils";
import { OfferPDF } from "@/components/OfferPDF";
import { useOfferSettings } from "@/hooks/useOfferSettings";
import { useOrderSettings } from "@/hooks/useOrderSettings";
import { useOrders } from "@/hooks/useOrders";
import { useOffers } from "@/hooks/useOffers";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";

interface OfferPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    offer: Offer | null;
    customer?: Customer;
    companySettings: CompanyData;
}



export function OfferPreviewModal({ isOpen, onClose, offer, customer, companySettings }: OfferPreviewModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isConverting, setIsConverting] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);
    const { data: offerSettings } = useOfferSettings();
    const { data: orderSettings, updateData: updateOrderSettings } = useOrderSettings();
    const { addOrder } = useOrders();
    const { updateOffer } = useOffers();
    const router = useRouter();

    if (!isOpen || !offer) return null;

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const ceoName = `${companySettings?.ceoFirstName || ''} ${companySettings?.ceoLastName || ''}`.trim();
    const processorName = (offer.processor && offer.processor !== 'Max Mustermann') ? offer.processor : ceoName || '-';
    const isRC = offer.isReverseCharge || (customer?.type === 'business' && (customer as any)?.reverseChargeEnabled);

    const getSalutation = () => {
        if (customer?.type === 'business') return 'Sehr geehrte Damen und Herren,';
        const lastName = customer?.name?.split(' ').pop() || '';
        if (customer?.salutation === 'Frau') return `Sehr geehrte Frau ${lastName},`;
        if (customer?.salutation === 'Herr') return `Sehr geehrter Herr ${lastName},`;
        return 'Sehr geehrte Damen und Herren,'; // Fallback
    };

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
            a.download = `Angebot_${offer.offerNumber.replace(/\//g, '-')}.pdf`;
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
                items: offer.items.map(item => ({ ...item, id: nanoid() })),
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
                subjectExtra: offer.subjectExtra
            };

            await addOrder(newOrder);
            await updateOffer(offer.id, { status: 'accepted' });
            await updateOrderSettings({ nextOrderNumber: orderSettings.nextOrderNumber + 1 });
            
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                // Optionally redirect to the new order or a orders archive
                // router.push('/orders');
            }, 2000);
        } catch (e) {
            console.error('[Order Creation]', e);
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">

                {/* ── Modal Header (Toolbar) ── */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            Angebot #{offer.offerNumber}
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

                {/* ── Document Preview ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 no-print">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl">
                        <OfferPDF
                            ref={pdfRef}
                            offer={offer}
                            customer={customer}
                            companySettings={companySettings}
                            offerSettings={offerSettings}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
