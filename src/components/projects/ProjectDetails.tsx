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

    React.useEffect(() => {
        if (financials.hasActiveFinalInvoice && project.status !== 'completed') {
            updateProject(project.id, { status: 'completed' });
        }
    }, [financials.hasActiveFinalInvoice, project.id, project.status]);

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

            <div className="overflow-hidden rounded-[36px] border border-indigo-100/70 bg-white shadow-sm">
                <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                    <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                            <button
                                onClick={onBack}
                                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white/80 transition-all hover:bg-white/15 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4" /> Zurueck zur Projektuebersicht
                            </button>

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider", getStatusStyle(project.status))}>
                                    {getStatusLabel(project.status)}
                                </span>
                                {project.projectNumber && (
                                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
                                        {project.projectNumber}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                                    <Calendar className="h-3.5 w-3.5" /> {new Date(project.createdAt).toLocaleDateString('de-DE')}
                                </span>
                            </div>

                            <h1 className="max-w-4xl truncate text-3xl font-black tracking-tight sm:text-4xl xl:text-5xl">{project.name}</h1>

                            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-white/70">
                                {customer && (
                                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2">
                                        <Building className="h-4 w-4 text-cyan-200" />
                                        {customer.name}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2">
                                    <MapPin className="h-4 w-4 text-cyan-200" />
                                    {[project.address.street, `${project.address.zip} ${project.address.city}`].filter(Boolean).join(", ")}
                                </div>
                            </div>
                        </div>

                        <div className="relative flex flex-wrap gap-3 xl:justify-end">
                            <button
                                onClick={onEdit}
                                className="rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5"
                            >
                                Bearbeiten
                            </button>
                            {financials.hasActiveFinalInvoice && (
                                <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-100">
                                    <CheckCircle className="h-4 w-4" /> Projekt abgerechnet
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Budget Netto</p>
                            <p className="mt-2 text-2xl font-black">EUR {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60">Bezahlt Netto</p>
                            <p className="mt-2 text-2xl font-black text-emerald-100">EUR {(financials.totalPaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100/60">Offen Netto</p>
                            <p className="mt-2 text-2xl font-black text-cyan-100">EUR {(financials.openAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Dokumente</p>
                            <p className="mt-2 text-2xl font-black">{documents.length}</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/80 p-3">
                    <div className="grid gap-2 md:grid-cols-5">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const count =
                                id === 'documents' ? documents.length :
                                id === 'payment' ? (project.paymentPlan?.length || 0) :
                                id === 'diary' ? (project.diaryEntries?.length || 0) :
                                undefined;

                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all",
                                        activeTab === id
                                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                                            : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                    {count !== undefined && (
                                        <span className={cn(
                                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                                            activeTab === id ? "bg-indigo-50 text-indigo-600" : "bg-slate-200/70 text-slate-500"
                                        )}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── TAB: Übersicht ───────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300 xl:grid-cols-[1.1fr_0.9fr]">
                    {/* Projektinformationen */}
                    <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                        <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-900">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <LayoutGrid className="h-5 w-5" />
                            </div>
                            Projektinformationen
                        </h3>
                        <div className="divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-slate-50/50 px-5">
                            {project.projectNumber && (
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <span className="text-sm text-slate-500 font-medium">Projektnummer</span>
                                    <span className="font-mono font-bold text-indigo-600 text-sm">{project.projectNumber}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4 py-3">
                                <span className="text-sm text-slate-500 font-medium">Status</span>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(project.status))}>
                                    {getStatusLabel(project.status)}
                                </span>
                            </div>
                            {customer && (
                                <>
                                    <div className="flex items-center justify-between gap-4 py-3">
                                        <span className="text-sm text-slate-500 font-medium">Kunde</span>
                                        <span className="font-bold text-slate-700 text-sm">{customer.name}</span>
                                    </div>
                                    {customer.email && (
                                        <div className="flex items-center justify-between gap-4 py-3">
                                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-Mail</span>
                                            <span className="text-slate-600 text-sm">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center justify-between gap-4 py-3">
                                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telefon</span>
                                            <span className="text-slate-600 text-sm">{customer.phone}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex items-center justify-between gap-4 py-3">
                                <span className="text-sm text-slate-500 font-medium">Angelegt am</span>
                                <span className="text-slate-700 text-sm font-medium">{new Date(project.createdAt).toLocaleDateString('de-DE')}</span>
                            </div>
                        </div>
                        {project.description && (
                            <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notizen</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Adresse + Finanzkurzinfo */}
                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                            <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-900">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                Baustellenadresse
                            </h3>
                            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5">
                                <p className="font-bold text-slate-800">{project.address.street}</p>
                                <p className="text-slate-600 font-medium">{project.address.zip} {project.address.city}</p>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                            <h3 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-900">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                    <Banknote className="h-5 w-5" />
                                </div>
                                Finanzen
                            </h3>
                            <div className="divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-slate-50/50 px-5">
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <span className="text-sm text-slate-500">Projekt-Summe (Netto)</span>
                                    <span className="font-bold text-slate-800">€ {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <span className="text-sm text-slate-500">Abgerechnet (Brutto)</span>
                                    <span className="font-medium text-slate-700">€ {(financials.totalBilled || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <span className="text-sm text-slate-500">Angebote</span>
                                    <span className="font-medium text-slate-700">{projectOffers.length} Stk.</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-3">
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
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-4 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Dokumente</h3>
                                <p className="text-sm font-medium text-slate-500">Angebote, Aufträge und Rechnungen zu diesem Projekt.</p>
                            </div>
                        </div>
                        <span className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">{documents.length} Dokumente</span>
                    </div>

                    {documents.length === 0 ? (
                        <div className="rounded-[32px] border border-dashed border-indigo-200 bg-indigo-50/40 p-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-indigo-500 shadow-sm">
                                <FileText className="h-8 w-8" />
                            </div>
                            <p className="text-slate-500 font-medium">Noch keine Dokumente für dieses Projekt.</p>
                            <p className="text-sm text-slate-400 mt-1">Erstellen Sie ein Angebot oder eine Rechnung und weisen Sie es diesem Projekt zu.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-100 bg-slate-50">
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
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Zahlungsplan ────────────────────────────────────────── */}
            {activeTab === 'payment' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* Financial summary cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Budget (Netto)</p>
                            <p className="text-xl font-black text-slate-900">€ {(financials.budget || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abgerechnet (Brutto)</p>
                            <p className="text-xl font-black text-slate-900">€ {(financials.totalBilled || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Bezahlt (Netto)</p>
                            <p className="text-xl font-black text-emerald-700">€ {(financials.totalPaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="rounded-[28px] border border-indigo-100 bg-indigo-50 p-5">
                            <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1">Offen (Netto)</p>
                            <p className="text-xl font-black text-indigo-700">€ {(financials.openAmount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    {/* Payment plan table */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                    <ListChecks className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Zahlungsplan</h3>
                                    <p className="text-sm font-medium text-slate-500">Teilrechnungen und Schlussrechnung zentral planen.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPaymentPlanModalOpen(true)}
                                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
                            >
                                Plan bearbeiten
                            </button>
                        </div>

                        {!project.paymentPlan || project.paymentPlan.length === 0 ? (
                            <div className="rounded-[32px] border border-dashed border-indigo-200 bg-indigo-50/40 p-12 text-center">
                                <p className="mb-4 font-black text-slate-800">Noch kein Zahlungsplan hinterlegt.</p>
                                <button
                                    onClick={() => setIsPaymentPlanModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100 transition-all hover:-translate-y-0.5"
                                >
                                    <Plus className="h-4 w-4" /> Zahlungsplan erstellen
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-100 bg-slate-50">
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
