"use client";

import React, { useMemo, useState } from "react";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Building,
    Banknote,
    FileText,
    Plus,
    CheckCircle,
    ListChecks,
    ArrowRight,
    LayoutGrid,
    BookOpen,
    FolderOpen,
    Phone,
    Mail,
} from "lucide-react";
import { Project, ProjectStatus, PaymentPlanItem, DiaryEntry } from "@/types/project";
import { Customer } from "@/types/customer";
import { Invoice } from "@/types/invoice";
import { Offer } from "@/types/offer";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PaymentPlanModal } from "./PaymentPlanModal";
import { ProjectDiary } from "./ProjectDiary";
import { ProjectFiles } from "./ProjectFiles";
import { DiaryPDF } from "./DiaryPDF";
import { InvoicePrintHandler } from "@/components/InvoicePrintHandler";
import { OrderConfirmation } from "@/types/order";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { OfferPreviewModal } from "@/components/OfferPreviewModal";
import { OrderPreviewModal } from "@/components/OrderPreviewModal";

type TabId = 'overview' | 'documents' | 'payment' | 'files' | 'diary';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Übersicht', icon: LayoutGrid },
    { id: 'documents', label: 'Dokumente', icon: FileText },
    { id: 'payment', label: 'Zahlungsplan', icon: ListChecks },
    { id: 'files', label: 'Dateien', icon: FolderOpen },
    { id: 'diary', label: 'Bautagebuch', icon: BookOpen },
];

interface ProjectDetailsProps {
    project: Project;
    customer?: Customer;
    invoices: Invoice[];
    offers: Offer[];
    orders: OrderConfirmation[];
    onBack: () => void;
    onEdit: () => void;
    onCreateInvoice: (type: 'partial' | 'final') => void;
}

export function ProjectDetails({ project, customer, invoices, offers, orders, onBack, onEdit, onCreateInvoice }: ProjectDetailsProps) {
    const router = useRouter();
    const { updateProject } = useProjects();
    const { data: companySettings } = useCompanySettings();
    const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = useState(false);
    const [isPrintingDiary, setIsPrintingDiary] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    // Preview States
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);
    const [previewOrder, setPreviewOrder] = useState<OrderConfirmation | null>(null);

    const financials = useMemo(() => {
        const planItemIds = (project.paymentPlan || []).map(p => String(p.id));
        const planTotalNet = (project.paymentPlan || []).reduce((acc, item) => acc + (item.amount || 0), 0);
        const projectInvoices = invoices.filter(inv => {
            if (inv.projectId && String(inv.projectId) === String(project.id)) return true;
            if (inv.paymentPlanItemId && planItemIds.includes(String(inv.paymentPlanItemId))) return true;
            return false;
        }).filter(inv => inv.status !== 'canceled');

        const totalNetPaid = projectInvoices.reduce((acc, inv) => {
            if (inv.status === 'paid') {
                const grossAmount = inv.totalAmount || 0;
                const netAmount = inv.subtotal || 0;
                const actuallyPaidGross = inv.paidAmount !== undefined ? inv.paidAmount : grossAmount;
                const ratio = grossAmount > 0 ? (netAmount / grossAmount) : 1;
                return acc + (actuallyPaidGross * ratio);
            }
            return acc;
        }, 0);

        const budget = project.budget || planTotalNet || 0;
        const openAmount = Math.max(0, budget - totalNetPaid);
        const activeFinalInvoice = projectInvoices.find(inv => inv.billingType === 'final' && !['draft', 'canceled'].includes(inv.status));
        const totalBilled = projectInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
        const totalNet = projectInvoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0);

        return {
            totalBilled, totalNet,
            totalPaid: totalNetPaid,
            budget, openAmount,
            invoiceCount: projectInvoices.length,
            hasActiveFinalInvoice: !!activeFinalInvoice,
            invoices: projectInvoices,
        };
    }, [invoices, project.id, project.budget, project.paymentPlan]);

    const projectOffers = useMemo(
        () => offers.filter(o => o.projectId === project.id),
        [offers, project.id]
    );

    // Combined, chronologically sorted document list (newest first)
    const documents = useMemo(() => {
        type Row = 
            | { kind: 'offer'; data: Offer } 
            | { kind: 'invoice'; data: Invoice }
            | { kind: 'order'; data: OrderConfirmation };

        const rows: Row[] = [
            ...projectOffers.map(o => ({ kind: 'offer' as const, data: o })),
            ...financials.invoices.map(i => ({ kind: 'invoice' as const, data: i })),
            ...orders.filter(o => o.projectId === project.id).map(o => ({ kind: 'order' as const, data: o })),
        ];
        return rows.sort((a, b) =>
            new Date(b.data.issueDate).getTime() - new Date(a.data.issueDate).getTime()
        );
    }, [projectOffers, financials.invoices, orders, project.id]);

    const handleSavePaymentPlan = (plan: PaymentPlanItem[]) => {
        updateProject(project.id, { paymentPlan: plan });
    };

    const handleCreateInvoiceFromPlan = (item: PaymentPlanItem) => {
        const index = project.paymentPlan?.findIndex(p => p.id === item.id) ?? -1;
        const partialNumber = index !== -1 ? index + 1 : undefined;
        const type = item.type || (item.name.toLowerCase().includes('schluss') ? 'final' : 'partial');
        const params = new URLSearchParams({
            projectId: project.id,
            customerId: project.customerId,
            billingType: type,
            paymentPlanItemId: item.id,
            amount: item.amount.toString(),
            subjectExtra: item.description || item.name,
            partialNumber: partialNumber?.toString() || ""
        });
        router.push(`/invoices/new?${params.toString()}`);
    };

    const handleUpdateDiary = (entries: DiaryEntry[]) => {
        updateProject(project.id, { diaryEntries: entries });
    };

    // ─── Status helpers ───────────────────────────────────────────────────────

    const getStatusStyle = (status: ProjectStatus) => {
        switch (status) {
            case "active": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "completed": return "bg-slate-50 text-slate-600 border-slate-100";
            case "planned": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "on_hold": return "bg-amber-50 text-amber-600 border-amber-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getStatusLabel = (status: ProjectStatus) => {
        switch (status) {
            case "active": return "Laufend";
            case "completed": return "Abgeschlossen";
            case "planned": return "Geplant";
            case "on_hold": return "Pausiert";
            default: return status;
        }
    };

    const getInvoiceStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'overdue': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'draft': return 'bg-slate-50 text-slate-600 border-slate-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getInvoiceStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Bezahlt';
            case 'pending': return 'Offen';
            case 'overdue': return 'Überfällig';
            case 'draft': return 'Entwurf';
            default: return status;
        }
    };

    const getOfferStatusStyle = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-slate-50 text-slate-600 border-slate-100';
            case 'sent': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'expired': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getOfferStatusLabel = (status: string) => {
        switch (status) {
            case 'draft': return 'Entwurf';
            case 'sent': return 'Versendet';
            case 'accepted': return 'Angenommen';
            case 'confirmed': return 'Bestätigt';
            case 'rejected': return 'Abgelehnt';
            case 'expired': return 'Abgelaufen';
            default: return status;
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

            {/* Top bar */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-medium">
                    <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
                </button>
                <div className="flex gap-3">
                    <button onClick={onEdit} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        Bearbeiten
                    </button>
                    {financials.hasActiveFinalInvoice && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100">
                            <CheckCircle className="h-4 w-4" /> Projekt abgerechnet
                        </div>
                    )}
                </div>
            </div>

            {/* ── Title card — always visible ───────────────────────────────── */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between gap-8">
                    {/* Identity */}
                    <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(project.status))}>
                                {getStatusLabel(project.status)}
                            </span>
                            {project.projectNumber && (
                                <span className="text-indigo-500 font-mono font-bold text-sm bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                    {project.projectNumber}
                                </span>
                            )}
                            <span className="text-slate-400 text-sm font-medium flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> {new Date(project.createdAt).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                        <div className="flex flex-wrap gap-5 text-slate-500 font-medium text-sm">
                            {customer && (
                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-slate-400" />
                                    {customer.name}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                {project.address.street}, {project.address.zip} {project.address.city}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats — pinned to header */}
                    <div className="flex gap-3 flex-shrink-0 flex-wrap">
                        <div className="bg-slate-50 rounded-2xl p-4 min-w-[130px] border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Budget (Netto)</p>
                            <p className="text-lg font-black text-slate-900">€ {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-4 min-w-[130px] border border-emerald-100 text-center">
                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Bezahlt (Netto)</p>
                            <p className="text-lg font-black text-emerald-700">€ {(financials.totalPaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-2xl p-4 min-w-[130px] border border-indigo-100 text-center">
                            <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1">Offen (Netto)</p>
                            <p className="text-lg font-black text-indigo-700">€ {(financials.openAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab strip ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/60 rounded-2xl w-fit border border-slate-200/50">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all",
                            activeTab === id
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── TAB: Übersicht ───────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-300">
                    {/* Projektinformationen */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 space-y-1">
                        <h3 className="font-black text-slate-900 flex items-center gap-2 text-base mb-4">
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                            </div>
                            Projektinformationen
                        </h3>
                        <div className="divide-y divide-slate-50">
                            {project.projectNumber && (
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-sm text-slate-500 font-medium">Projektnummer</span>
                                    <span className="font-mono font-bold text-indigo-600 text-sm">{project.projectNumber}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-sm text-slate-500 font-medium">Status</span>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(project.status))}>
                                    {getStatusLabel(project.status)}
                                </span>
                            </div>
                            {customer && (
                                <>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-sm text-slate-500 font-medium">Kunde</span>
                                        <span className="font-bold text-slate-700 text-sm">{customer.name}</span>
                                    </div>
                                    {customer.email && (
                                        <div className="flex justify-between items-center py-2.5">
                                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-Mail</span>
                                            <span className="text-slate-600 text-sm">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex justify-between items-center py-2.5">
                                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telefon</span>
                                            <span className="text-slate-600 text-sm">{customer.phone}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-sm text-slate-500 font-medium">Angelegt am</span>
                                <span className="text-slate-700 text-sm font-medium">{new Date(project.createdAt).toLocaleDateString('de-DE')}</span>
                            </div>
                        </div>
                        {project.description && (
                            <div className="pt-3 border-t border-slate-50 mt-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notizen</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Adresse + Finanzkurzinfo */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 space-y-4">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                Baustellenadresse
                            </h3>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="font-bold text-slate-800">{project.address.street}</p>
                                <p className="text-slate-600 font-medium">{project.address.zip} {project.address.city}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 space-y-3">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
                                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                    <Banknote className="h-3.5 w-3.5 text-amber-500" />
                                </div>
                                Finanzen
                            </h3>
                            <div className="divide-y divide-slate-50">
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-sm text-slate-500">Projekt-Summe (Netto)</span>
                                    <span className="font-bold text-slate-800">€ {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-sm text-slate-500">Abgerechnet (Brutto)</span>
                                    <span className="font-medium text-slate-700">€ {(financials.totalBilled || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-sm text-slate-500">Angebote</span>
                                    <span className="font-medium text-slate-700">{projectOffers.length} Stk.</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-sm text-slate-500">Rechnungen</span>
                                    <span className="font-medium text-slate-700">{financials.invoiceCount} Stk.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Dokumente ───────────────────────────────────────────── */}
            {activeTab === 'documents' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            Alle Dokumente
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{documents.length}</span>
                        </h3>
                    </div>

                    {documents.length === 0 ? (
                        <div className="bg-slate-50 rounded-[24px] border border-dashed border-slate-200 p-12 text-center">
                            <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Noch keine Dokumente für dieses Projekt.</p>
                            <p className="text-sm text-slate-400 mt-1">Erstellen Sie ein Angebot oder eine Rechnung und weisen Sie es diesem Projekt zu.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-36">Typ</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nummer</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Betreff / Bezeichnung</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Betrag</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {documents.map(row => {
                                        if (row.kind === 'offer') {
                                            const o = row.data;
                                            return (
                                                <tr 
                                                    key={`offer-${o.id}`} 
                                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                                    onClick={() => setPreviewOffer(o)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-sky-50 text-sky-600 border-sky-100">
                                                            Angebot
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold font-mono text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{o.offerNumber}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700 text-sm">{o.subjectExtra || o.constructionProject || '—'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(o.issueDate).toLocaleDateString('de-DE')}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-700">
                                                        € {(o.totalAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        <span className="text-[10px] text-slate-400 ml-1">Brutto</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getOfferStatusStyle(o.status))}>
                                                            {getOfferStatusLabel(o.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        if (row.kind === 'order') {
                                            const oc = row.data;
                                            return (
                                                <tr 
                                                    key={`order-${oc.id}`} 
                                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                                    onClick={() => setPreviewOrder(oc)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-600 border-indigo-100">
                                                            Auftrag
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold font-mono text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{oc.orderNumber}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700 text-sm">{oc.constructionProject || '—'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(oc.issueDate).toLocaleDateString('de-DE')}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-700">
                                                        € {(oc.totalAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        <span className="text-[10px] text-slate-400 ml-1">Brutto</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                            Bestätigt
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const inv = row.data;
                                        const billingLabel =
                                            inv.billingType === 'final' ? 'Schlussrg.' :
                                            inv.billingType === 'partial' ? `${inv.partialPaymentNumber ?? ''}. Teilrg.` :
                                            'Rechnung';
                                        return (
                                            <tr 
                                                key={`inv-${inv.id}`} 
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer group" 
                                                onClick={() => setPreviewInvoice(inv)}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                        inv.billingType === 'final' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                        inv.billingType === 'partial' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                                        "bg-violet-50 text-violet-700 border-violet-100"
                                                    )}>
                                                        {billingLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold font-mono text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{inv.invoiceNumber}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700 text-sm">{inv.subjectExtra || inv.constructionProject || '—'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(inv.issueDate).toLocaleDateString('de-DE')}</td>
                                                <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-700">
                                                    € {(inv.subtotal || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                    <span className="text-[10px] text-slate-400 ml-1">Netto</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getInvoiceStatusStyle(inv.status))}>
                                                        {getInvoiceStatusLabel(inv.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Zahlungsplan ────────────────────────────────────────── */}
            {activeTab === 'payment' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* Financial summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Budget (Netto)</p>
                            <p className="text-xl font-black text-slate-900">€ {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abgerechnet (Brutto)</p>
                            <p className="text-xl font-black text-slate-900">€ {(financials.totalBilled || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Bezahlt (Netto)</p>
                            <p className="text-xl font-black text-emerald-700">€ {(financials.totalPaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                            <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1">Offen (Netto)</p>
                            <p className="text-xl font-black text-indigo-700">€ {(financials.openAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    {/* Payment plan table */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-indigo-500" /> Zahlungsplan
                            </h3>
                            <button
                                onClick={() => setIsPaymentPlanModalOpen(true)}
                                className="text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors text-sm"
                            >
                                Plan bearbeiten
                            </button>
                        </div>

                        {!project.paymentPlan || project.paymentPlan.length === 0 ? (
                            <div className="bg-slate-50 rounded-[24px] border border-dashed border-slate-200 p-10 text-center">
                                <p className="text-slate-500 font-medium mb-4">Noch kein Zahlungsplan hinterlegt.</p>
                                <button
                                    onClick={() => setIsPaymentPlanModalOpen(true)}
                                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm inline-flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" /> Zahlungsplan erstellen
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-12">Nr.</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Bezeichnung</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fällig am</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Betrag (Netto)</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                            <th className="px-6 py-4 w-44"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.paymentPlan.map((item, index) => {
                                            const linkedInvoice = invoices.find(inv =>
                                                (inv.paymentPlanItemId && String(inv.paymentPlanItemId) === String(item.id)) ||
                                                (inv.projectId && String(inv.projectId) === String(project.id) &&
                                                    inv.billingType === (item.type || 'partial') &&
                                                    (inv.billingType === 'final' || inv.partialPaymentNumber === (index + 1)))
                                            );
                                            const isLocked = linkedInvoice && !['draft', 'canceled'].includes(linkedInvoice.status);

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-700">{item.name}</div>
                                                        {item.description && <div className="text-xs text-slate-400 mt-0.5 font-medium">{item.description}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('de-DE') : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                        € {(item.amount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {linkedInvoice ? (
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                                linkedInvoice.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                                linkedInvoice.status === 'draft' ? "bg-slate-50 text-slate-600 border-slate-100" :
                                                                linkedInvoice.status === 'canceled' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                                "bg-amber-50 text-amber-700 border-amber-100"
                                                            )}>
                                                                {linkedInvoice.status === 'paid' && <CheckCircle className="h-3 w-3" />}
                                                                {linkedInvoice.status === 'draft' ? 'Entwurf' :
                                                                 linkedInvoice.status === 'paid' ? 'Bezahlt' :
                                                                 linkedInvoice.status === 'canceled' ? 'Storniert' : 'Erstellt'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                                Geplant
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {(!linkedInvoice || !isLocked) && (
                                                            <button
                                                                onClick={() => handleCreateInvoiceFromPlan(item)}
                                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1 ml-auto"
                                                            >
                                                                Rechnung erstellen <ArrowRight className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                        {isLocked && (
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5 justify-end">
                                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Abgerechnet
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: Dateien ─────────────────────────────────────────────── */}
            {activeTab === 'files' && (
                <div className="animate-in fade-in duration-300">
                    <ProjectFiles projectId={project.id} />
                </div>
            )}

            {/* ── TAB: Bautagebuch ─────────────────────────────────────────── */}
            {activeTab === 'diary' && (
                <div className="animate-in fade-in duration-300">
                    <ProjectDiary
                        project={project}
                        onUpdate={handleUpdateDiary}
                        onGeneratePDF={() => setIsPrintingDiary(true)}
                    />
                </div>
            )}

            {/* Diary print handler */}
            {isPrintingDiary && companySettings && (
                <InvoicePrintHandler
                    onAfterPrint={() => setIsPrintingDiary(false)}
                    documentTitle={`Bautagebuch_${project.name.replace(/\s+/g, '_')}`}
                >
                    <DiaryPDF project={project} customer={customer} companySettings={companySettings} />
                </InvoicePrintHandler>
            )}

            <PaymentPlanModal
                isOpen={isPaymentPlanModalOpen}
                onClose={() => setIsPaymentPlanModalOpen(false)}
                project={project}
                onSave={handleSavePaymentPlan}
            />

            {/* Document Preview Modals */}
            {previewInvoice && (
                <InvoicePreviewModal
                    isOpen={!!previewInvoice}
                    onClose={() => setPreviewInvoice(null)}
                    invoice={previewInvoice}
                    customer={customer}
                    companySettings={companySettings!}
                />
            )}

            {previewOffer && (
                <OfferPreviewModal
                    isOpen={!!previewOffer}
                    onClose={() => setPreviewOffer(null)}
                    offer={previewOffer}
                    customer={customer}
                    companySettings={companySettings!}
                />
            )}

            {previewOrder && (
                <OrderPreviewModal
                    isOpen={!!previewOrder}
                    onClose={() => setPreviewOrder(null)}
                    order={previewOrder}
                    customer={customer}
                    companySettings={companySettings!}
                />
            )}
        </div>
    );
}
