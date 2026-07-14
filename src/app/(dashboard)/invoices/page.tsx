"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Filter,
    FileText,
    Eye,
    Download,
    Calendar,
    User,
    Euro,
    Trash2,
    ChevronDown,
    ArrowUpDown,
    Edit2,
    Loader2,
    Plus
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import nextDynamic from "next/dynamic";

const InvoicePreviewModal = nextDynamic(
    () => import("@/components/InvoicePreviewModal").then((mod) => mod.InvoicePreviewModal),
    { ssr: false, loading: () => null }
);
import { cn } from "@/lib/utils";
import { Invoice, InvoiceStatus } from "@/types/invoice";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { invoicePdfFileName } from "@/lib/document-filenames";

export const dynamic = 'force-dynamic';

export default function InvoicesPage() {
    usePermissionGuard("invoices_read");
    const router = useRouter();
    const { invoices, updateInvoice, deleteInvoice, isLoading } = useInvoices();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "all">("all");
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Sorting State
    const [sortBy, setSortBy] = useState<string>("number");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

    const handleDownload = async (invoice: Invoice, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingIds(prev => new Set(prev).add(invoice.id));
        try {
            const customer = customers.find(c => c.id === invoice.customerId);

            if (invoice.status !== 'draft' && (invoice.pdfPath || invoice.pdfUrl)) {
                const response = await fetch(`/api/invoices/pdf-url?id=${encodeURIComponent(invoice.id)}`);
                if (!response.ok) throw new Error(await response.text());
                const { url: pdfUrl } = await response.json();
                const pdfResponse = await fetch(pdfUrl);
                if (!pdfResponse.ok) throw new Error(`PDF download failed: ${pdfResponse.status}`);
                const blob = await pdfResponse.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = invoicePdfFileName({ ...invoice, customerName: customer?.name || invoice.customerName });
                a.click();
                URL.revokeObjectURL(url);
                return;
            }

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
        } catch (err) {
            console.error('[PDF Download]', err);
        } finally {
            setDownloadingIds(prev => { const n = new Set(prev); n.delete(invoice.id); return n; });
        }
    };

    const processedInvoices = useMemo(() => {
        // First filter
        const filtered = invoices.filter(invoice => {
            const matchesSearch =
                (invoice.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (invoice.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;

            const matchesYear = new Date(invoice.issueDate).getFullYear() === selectedYear;

            return matchesSearch && matchesStatus && matchesYear;
        });

        // Then sort
        return filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'number':
                    comparison = (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "", undefined, { numeric: true });
                    break;
                case 'customer':
                    comparison = (a.customerName || "").localeCompare(b.customerName || "");
                    break;
                case 'amount':
                    comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
                    break;
                case 'date':
                default:
                    comparison = new Date(a.issueDate || 0).getTime() - new Date(b.issueDate || 0).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [invoices, searchQuery, filterStatus, sortBy, sortOrder, selectedYear]);

    const stats = useMemo(() => {
        return {
            total: invoices.length,
            paid: invoices.filter(i => i.status === 'paid' && new Date(i.issueDate).getFullYear() === selectedYear).length,
            pending: invoices.filter(i => i.status === 'pending' && new Date(i.issueDate).getFullYear() === selectedYear).length,
            overdue: invoices.filter(i => i.status === 'overdue' && new Date(i.issueDate).getFullYear() === selectedYear).length,
        };
    }, [invoices, selectedYear]);

    const availableYears = useMemo(() => {
        const years = new Set(invoices.map(inv => new Date(inv.issueDate).getFullYear()));
        if (years.size === 0) years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices]);

    if (isLoading) {
        return <div className="dashboard-page text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <div className="dashboard-page">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-20 left-1/2 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                    <div>
                        <div className="mb-4 flex items-center gap-3 text-cyan-200">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.35em]">Archiv</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Rechnungen</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold text-white/70">Alle erstellten Rechnungen im Überblick.</p>
                    </div>

                    {/* Actions: Year Selector & New Invoice Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Year Selector */}
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-white/60" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-6 py-3 bg-white/10 border border-white/10 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Neue Rechnung Button */}
                    <button
                        onClick={() => router.push("/invoices/new")}
                        className="bg-white text-indigo-700 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
                    >
                        <Plus className="h-5 w-5" /> Rechnung erstellen
                    </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="dashboard-stat-grid">
                {[
                    { label: "Gesamt", count: stats.total, color: "text-slate-600", bg: "bg-slate-100", icon: FileText },
                    { label: "Bezahlt", count: stats.paid, color: "text-emerald-600", bg: "bg-emerald-50", icon: FileText },
                    { label: "Offen", count: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: FileText },
                    { label: "Fällig", count: stats.overdue, color: "text-rose-600", bg: "bg-rose-50", icon: FileText },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-4 2xl:p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                                    <Icon className={cn("h-6 w-6", stat.color)} />
                                </div>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <span className={cn("font-black text-3xl px-4 py-2 rounded-2xl", stat.color, stat.bg)}>{stat.count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Filters & Search & Sorting */}
            <div className="flex flex-col gap-6">
                <div className="dashboard-toolbar">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechnungen suchen nach Nummer oder Kunde..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                        />
                    </div>

                    <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm dashboard-filter-strip">
                        {[
                            { id: "all", label: "Alle", icon: Filter },
                            { id: "paid", label: "Bezahlt", icon: FileText },
                            { id: "pending", label: "Offen", icon: FileText },
                            { id: "overdue", label: "Fällig", icon: FileText }
                        ].map((btn) => {
                            const Icon = btn.icon;
                            const active = filterStatus === btn.id;
                            return (
                                <button
                                    key={btn.id}
                                    onClick={() => setFilterStatus(btn.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                        active
                                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                            : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {btn.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end">
                    <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <ArrowUpDown className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sortieren nach:</span>
                        </div>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [key, order] = e.target.value.split('-');
                                setSortBy(key);
                                setSortOrder(order as "asc" | "desc");
                            }}
                            className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
                        >
                            <option value="number-desc">Rechnungsnummer (Z-A)</option>
                            <option value="number-asc">Rechnungsnummer (A-Z)</option>
                            <option value="customer-asc">Kunde (A-Z)</option>
                            <option value="customer-desc">Kunde (Z-A)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            {processedInvoices.length > 0 ? (
                <div className="dashboard-table-card">
                    <table className="w-full min-w-[920px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Rechnung</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Betrag</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {processedInvoices.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="group hover:bg-slate-50/30 transition-colors cursor-pointer"
                                    onClick={() => setPreviewInvoice(invoice)}
                                >
                                    <td className="px-6 py-5">
                                        <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            #{invoice.invoiceNumber}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-300" />
                                            <p className="text-base font-medium text-slate-800">{invoice.customerName}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-300" />
                                            <p className="text-sm font-medium text-slate-600">
                                                {new Date(invoice.issueDate).toLocaleDateString('de-DE')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative w-fit">
                                            <select
                                                value={invoice.status}
                                                onChange={(e) => {
                                                    const nextStatus = e.target.value as any;
                                                    const updatedInvoice = { ...invoice, status: nextStatus };
                                                    if (nextStatus !== 'draft' && !invoice.performancePeriod?.companySnapshot) {
                                                        updatedInvoice.performancePeriod = {
                                                            ...invoice.performancePeriod,
                                                            companySnapshot: companySettings
                                                        };
                                                    }
                                                    updateInvoice(invoice.id, updatedInvoice);
                                                }}
                                                className={cn(
                                                    "appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all",
                                                    invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100 focus:ring-emerald-500" :
                                                        invoice.status === 'overdue' ? "bg-rose-50 text-rose-600 border-rose-100 focus:ring-rose-500" :
                                                            invoice.status === 'draft' ? "bg-slate-50 text-slate-600 border-slate-100 focus:ring-slate-500" :
                                                                "bg-amber-50 text-amber-600 border-amber-100 focus:ring-amber-500"
                                                )}
                                            >
                                                <option value="paid">Bezahlt</option>
                                                <option value="pending">Offen</option>
                                                <option value="overdue">Fällig</option>
                                                <option value="draft">Entwurf</option>
                                                <option value="canceled">Storniert</option>
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ChevronDown className={cn(
                                                    "h-3 w-3",
                                                    invoice.status === 'paid' ? "text-emerald-600" :
                                                        invoice.status === 'overdue' ? "text-rose-600" :
                                                            invoice.status === 'draft' ? "text-slate-600" : "text-amber-600"
                                                )} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Euro className="h-4 w-4 text-slate-300" />
                                            <p className="text-base font-black text-slate-900">
                                                {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewInvoice(invoice);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                                            >
                                                <Eye className="h-4 w-4" />
                                                Vorschau
                                            </button>
                                            <button
                                                onClick={(e) => handleDownload(invoice, e)}
                                                disabled={downloadingIds.has(invoice.id)}
                                                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
                                                title="PDF herunterladen"
                                            >
                                                {downloadingIds.has(invoice.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                            </button>
                                            {invoice.status === 'draft' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/invoices/${invoice.id}/edit`);
                                                    }}
                                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"
                                                    title="Entwurf bearbeiten"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            {invoice.status === 'draft' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showConfirm({
                                                            title: "Entwurf löschen?",
                                                            message: "Möchten Sie diesen Rechnungsentwurf wirklich unwiderruflich löschen?",
                                                            variant: "danger",
                                                            confirmLabel: "Jetzt löschen",
                                                            onConfirm: () => {
                                                                deleteInvoice(invoice.id);
                                                                showToast("Entwurf gelöscht.", "success");
                                                            }
                                                        });
                                                    }}
                                                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                                    title="Entwurf löschen"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                        <FileText className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Rechnungen gefunden</h4>
                        <p className="text-slate-500 font-medium">Erstellen Sie Ihre erste Rechnung.</p>
                    </div>
                </div>
            )}

            <InvoicePreviewModal
                isOpen={!!previewInvoice}
                onClose={() => setPreviewInvoice(null)}
                invoice={previewInvoice}
                customer={customers.find(c => c.id === previewInvoice?.customerId)}
                companySettings={companySettings}
            />

        </div>
    );
}
