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
    ArrowUpDown
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { cn } from "@/lib/utils";
import { Invoice, InvoiceStatus } from "@/types/invoice";
import { useNotification } from "@/context/NotificationContext";

export default function InvoicesPage() {
    const { invoices, updateInvoice, deleteInvoice, isLoading } = useInvoices();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "all">("all");
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

    // Sorting State
    const [sortBy, setSortBy] = useState<string>("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const processedInvoices = useMemo(() => {
        // First filter
        const filtered = invoices.filter(invoice => {
            const matchesSearch =
                (invoice.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (invoice.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;

            return matchesSearch && matchesStatus;
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
    }, [invoices, searchQuery, filterStatus, sortBy, sortOrder]);

    const stats = useMemo(() => {
        return {
            total: invoices.length,
            paid: invoices.filter(i => i.status === 'paid').length,
            pending: invoices.filter(i => i.status === 'pending').length,
            overdue: invoices.filter(i => i.status === 'overdue').length,
        };
    }, [invoices]);

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Archiv</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Rechnungen <span className="text-slate-300 font-light">Verwalten</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Alle erstellten Rechnungen im Überblick.</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: "Gesamt", count: stats.total, color: "text-slate-600", bg: "bg-slate-100", icon: FileText },
                    { label: "Bezahlt", count: stats.paid, color: "text-emerald-600", bg: "bg-emerald-50", icon: FileText },
                    { label: "Offen", count: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: FileText },
                    { label: "Fällig", count: stats.overdue, color: "text-rose-600", bg: "bg-rose-50", icon: FileText },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
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
                <div className="flex gap-4 items-center">
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

                    <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
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
                            <option value="date-desc">Datum (Neu zuerst)</option>
                            <option value="date-asc">Datum (Alt zuerst)</option>
                            <option value="number-desc">Rechnungsnummer (Z-A)</option>
                            <option value="number-asc">Rechnungsnummer (A-Z)</option>
                            <option value="amount-desc">Betrag (Hoch zuerst)</option>
                            <option value="amount-asc">Betrag (Gering zuerst)</option>
                            <option value="customer-asc">Kunde (A-Z)</option>
                            <option value="customer-desc">Kunde (Z-A)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            {processedInvoices.length > 0 ? (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
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
                                                onChange={(e) => updateInvoice(invoice.id, { ...invoice, status: e.target.value as any })}
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
