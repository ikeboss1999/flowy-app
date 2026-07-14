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
    Loader2,
    FileSignature,
    Clock,
    CheckCircle2
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useOrderSettings } from "@/hooks/useOrderSettings";
import nextDynamic from "next/dynamic";

const OrderPreviewModal = nextDynamic(
    () => import("@/components/OrderPreviewModal").then((mod) => mod.OrderPreviewModal),
    { ssr: false, loading: () => null }
);
import { cn } from "@/lib/utils";
import { OrderConfirmation, OrderStatus } from "@/types/order";
import { useNotification } from "@/context/NotificationContext";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { orderPdfFileName } from "@/lib/document-filenames";

export const dynamic = 'force-dynamic';

async function fetchSignedOrderPdfUrl(orderId: string) {
    const response = await fetch(`/api/orders/pdf-url?id=${encodeURIComponent(orderId)}`);
    if (!response.ok) {
        throw new Error(await response.text());
    }
    const data = await response.json();
    return data.url as string;
}

export default function OrdersPage() {
    usePermissionGuard("orders_read");
    const { orders, updateOrder, isLoading } = useOrders();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { data: orderSettings } = useOrderSettings();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
    const [previewOrder, setPreviewOrder] = useState<OrderConfirmation | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [sortBy, setSortBy] = useState<string>("number");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

    const handleDownload = async (order: OrderConfirmation, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingIds(prev => new Set(prev).add(order.id));
        try {
            const customer = customers.find(c => c.id === order.customerId);
            const fileName = orderPdfFileName({ ...order, customerName: customer?.name || order.customerName });

            if (order.pdfUrl) {
                try {
                    const pdfUrl = await fetchSignedOrderPdfUrl(order.id);
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
                    const pdfUrl = await fetchSignedOrderPdfUrl(order.id);
                    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                }
                return;
            }

            const { pdf } = await import('@react-pdf/renderer');
            const { OrderReactPDF } = await import('@/components/OrderReactPDF');
            const blob = await pdf(
                React.createElement(OrderReactPDF, { order, customer, companySettings, orderSettings }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[PDF Download]', err);
        } finally {
            setDownloadingIds(prev => { const n = new Set(prev); n.delete(order.id); return n; });
        }
    };

    const processedOrders = useMemo(() => {
        const filtered = orders.filter(order => {
            const matchesSearch =
                (order.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "all" || order.status === filterStatus;
            const matchesYear = new Date(order.issueDate).getFullYear() === selectedYear;
            return matchesSearch && matchesStatus && matchesYear;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'number':
                    comparison = (a.orderNumber || "").localeCompare(b.orderNumber || "", undefined, { numeric: true });
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
    }, [orders, searchQuery, filterStatus, sortBy, sortOrder, selectedYear]);

    const stats = useMemo(() => {
        return {
            total: orders.length,
            confirmed: orders.filter(o => o.status === 'confirmed').length,
            completed: orders.filter(o => o.status === 'completed').length,
            pending: orders.filter(o => o.status === 'pending').length,
        };
    }, [orders]);

    const availableYears = useMemo(() => {
        const years = new Set(orders.map(o => new Date(o.issueDate).getFullYear()));
        if (years.size === 0) years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [orders]);

    if (isLoading) return <div className="dashboard-page text-slate-400 font-bold">Laden...</div>;

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-20 left-1/2 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                    <div>
                        <div className="mb-4 flex items-center gap-3 text-cyan-200">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm">
                                <FileSignature className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.35em]">Archiv</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Aufträge</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold text-white/70">Alle Auftragsbestätigungen im Überblick.</p>
                    </div>

                    <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-white/60" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-6 py-3 bg-white/10 border border-white/10 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="dashboard-stat-grid">
                {[
                    { label: "Gesamt", count: stats.total, color: "text-slate-600", bg: "bg-slate-100", icon: FileSignature },
                    { label: "Bestätigt", count: stats.confirmed, color: "text-indigo-600", bg: "bg-indigo-50", icon: CheckCircle2 },
                    { label: "In Arbeit", count: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
                    { label: "Abgeschlossen", count: stats.completed, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
                ].map((stat) => {
                    const Icon = stat.icon as any;
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

            {/* Filters */}
            <div className="flex flex-col gap-6">
                <div className="dashboard-toolbar">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Aufträge suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                        />
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
                            <option value="number-desc">Nummer (Z-A)</option>
                            <option value="number-asc">Nummer (A-Z)</option>
                            <option value="customer-asc">Kunde (A-Z)</option>
                            <option value="customer-desc">Kunde (Z-A)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            {processedOrders.length > 0 ? (
                <div className="dashboard-table-card">
                    <table className="w-full min-w-[920px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Auftrag</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Betrag</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {processedOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="group hover:bg-slate-50/30 transition-colors cursor-pointer"
                                    onClick={() => setPreviewOrder(order)}
                                >
                                    <td className="px-6 py-5">
                                        <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            #{order.orderNumber}
                                        </p>
                                        {order.offerNumber && (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ref: {order.offerNumber}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-300" />
                                            <p className="text-base font-medium text-slate-800">{order.customerName}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-300" />
                                            <p className="text-sm font-medium text-slate-600">
                                                {new Date(order.issueDate).toLocaleDateString('de-DE')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative w-fit">
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateOrder(order.id, { status: e.target.value as any })}
                                                className={cn(
                                                    "appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all",
                                                    order.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    order.status === 'confirmed' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                    order.status === 'cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                    "bg-amber-50 text-amber-600 border-amber-100"
                                                )}
                                            >
                                                <option value="confirmed">Bestätigt</option>
                                                <option value="pending">In Arbeit</option>
                                                <option value="completed">Abgeschlossen</option>
                                                <option value="cancelled">Storniert</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Euro className="h-4 w-4 text-slate-300" />
                                            <p className="text-base font-black text-slate-900">
                                                {order.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewOrder(order);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                                            >
                                                <Eye className="h-4 w-4" />
                                                Vorschau
                                            </button>
                                            <button
                                                onClick={(e) => handleDownload(order, e)}
                                                disabled={downloadingIds.has(order.id)}
                                                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
                                            >
                                                {downloadingIds.has(order.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                            </button>
                                            {order.status !== 'cancelled' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showConfirm({
                                                        title: "Auftrag stornieren?",
                                                        message: "Der Auftrag bleibt als gespeicherte PDF erhalten und wird als storniert markiert.",
                                                        variant: "danger",
                                                        onConfirm: () => {
                                                            updateOrder(order.id, { status: 'cancelled' });
                                                            showToast("Auftrag storniert.", "success");
                                                        }
                                                    });
                                                }}
                                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                                title="Auftrag stornieren"
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
                        <FileSignature className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Aufträge gefunden</h4>
                        <p className="text-slate-500 font-medium">Bestätigen Sie ein Angebot, um hier Aufträge zu sehen.</p>
                    </div>
                </div>
            )}

            <OrderPreviewModal
                isOpen={!!previewOrder}
                onClose={() => setPreviewOrder(null)}
                order={previewOrder}
                customer={customers.find(c => c.id === previewOrder?.customerId)}
                companySettings={companySettings}
            />
        </div>
    );
}
