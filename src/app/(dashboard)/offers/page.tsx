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
    Edit2,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    PlusCircle,
    ArrowUpDown,
    ChevronDown
} from "lucide-react";
import { useOffers } from "@/hooks/useOffers";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { OfferPreviewModal } from "@/components/OfferPreviewModal";
import { cn } from "@/lib/utils";
import { Offer, OfferStatus } from "@/types/offer";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string; border: string }> = {
    draft:    { label: 'Entwurf',    color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-100' },
    sent:     { label: 'Gesendet',   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    accepted: { label: 'Angenommen', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    rejected: { label: 'Abgelehnt', color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-100' },
    expired:  { label: 'Abgelaufen', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
};

export default function OffersPage() {
    const router = useRouter();
    const { offers, updateOffer, deleteOffer, isLoading } = useOffers();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { showToast, showConfirm } = useNotification();

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<OfferStatus | "all">("all");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

    // Sorting State
    const [sortBy, setSortBy] = useState<string>("number");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const handleDownload = async (offer: Offer, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingIds(prev => new Set(prev).add(offer.id));
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { OfferReactPDF } = await import('@/components/OfferReactPDF');
            const customer = customers.find(c => c.id === offer.customerId);
            const blob = await pdf(
                React.createElement(OfferReactPDF, { offer, customer, companySettings }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Angebot_${offer.offerNumber.replace(/\//g, '-')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[PDF Download]', err);
        } finally {
            setDownloadingIds(prev => { const n = new Set(prev); n.delete(offer.id); return n; });
        }
    };

    const processedOffers = useMemo(() => {
        const filtered = offers.filter(offer => {
            const matchesSearch =
                (offer.offerNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (offer.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "all" || offer.status === filterStatus;
            const matchesYear = new Date(offer.issueDate).getFullYear() === selectedYear;
            return matchesSearch && matchesStatus && matchesYear;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'number':
                    comparison = (a.offerNumber || "").localeCompare(b.offerNumber || "", undefined, { numeric: true });
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
    }, [offers, searchQuery, filterStatus, selectedYear, sortBy, sortOrder]);

    const stats = useMemo(() => ({
        total: offers.filter(o => new Date(o.issueDate).getFullYear() === selectedYear).length,
        accepted: offers.filter(o => o.status === 'accepted' && new Date(o.issueDate).getFullYear() === selectedYear).length,
        sent: offers.filter(o => o.status === 'sent' && new Date(o.issueDate).getFullYear() === selectedYear).length,
        rejected: offers.filter(o => o.status === 'rejected' && new Date(o.issueDate).getFullYear() === selectedYear).length,
    }), [offers, selectedYear]);

    const availableYears = useMemo(() => {
        const years = new Set(offers.map(o => new Date(o.issueDate).getFullYear()));
        if (years.size === 0) years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [offers]);

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Archiv</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Angebote <span className="text-slate-300 font-light">Verwalten</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Alle erstellten Angebote im Überblick.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => router.push('/offers/new')}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Neues Angebot
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: "Gesamt",     count: stats.total,    color: "text-slate-600",   bg: "bg-slate-100",   icon: FileText },
                    { label: "Angenommen", count: stats.accepted, color: "text-emerald-600", bg: "bg-emerald-50",  icon: CheckCircle2 },
                    { label: "Gesendet",   count: stats.sent,     color: "text-blue-600",    bg: "bg-blue-50",     icon: Send },
                    { label: "Abgelehnt",  count: stats.rejected, color: "text-rose-600",    bg: "bg-rose-50",     icon: XCircle },
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

            {/* Filters & Search */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Angebote suchen nach Nummer oder Kunde..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>
                <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                    {([
                        { id: "all",      label: "Alle" },
                        { id: "draft",    label: "Entwurf" },
                        { id: "sent",     label: "Gesendet" },
                        { id: "accepted", label: "Angenommen" },
                        { id: "rejected", label: "Abgelehnt" },
                        { id: "expired",  label: "Abgelaufen" },
                    ] as { id: string; label: string }[]).map((btn) => {
                        const active = filterStatus === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={() => setFilterStatus(btn.id as any)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                                    active
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                )}
                            >
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
                        <option value="number-desc">Angebotsnummer (Z-A)</option>
                        <option value="number-asc">Angebotsnummer (A-Z)</option>
                        <option value="customer-asc">Kunde (A-Z)</option>
                        <option value="customer-desc">Kunde (Z-A)</option>
                    </select>
                </div>
            </div>


            {/* Offers List */}
            {processedOffers.length > 0 ? (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Angebot</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Gültig bis</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Betrag</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {processedOffers.map((offer) => {
                                const sc = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;
                                return (
                                    <tr
                                        key={offer.id}
                                        className="group hover:bg-slate-50/30 transition-colors cursor-pointer"
                                        onClick={() => setPreviewOffer(offer)}
                                    >
                                        <td className="px-6 py-5">
                                            <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                #{offer.offerNumber}
                                            </p>
                                            {offer.constructionProject && (
                                                <p className="text-xs text-slate-400 mt-0.5">{offer.constructionProject}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-300" />
                                                <p className="text-base font-medium text-slate-800">{offer.customerName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-300" />
                                                <p className="text-sm font-medium text-slate-600">
                                                    {new Date(offer.issueDate).toLocaleDateString('de-DE')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-medium text-slate-600">
                                                {offer.validUntil
                                                    ? new Date(offer.validUntil).toLocaleDateString('de-DE')
                                                    : <span className="text-slate-300">–</span>
                                                }
                                            </p>
                                        </td>
                                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={offer.status}
                                                onChange={(e) => updateOffer(offer.id, { status: e.target.value as OfferStatus })}
                                                className={cn(
                                                    "appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all",
                                                    sc.color, sc.bg, sc.border
                                                )}
                                            >
                                                <option value="draft">Entwurf</option>
                                                <option value="sent">Gesendet</option>
                                                <option value="accepted">Angenommen</option>
                                                <option value="rejected">Abgelehnt</option>
                                                <option value="expired">Abgelaufen</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Euro className="h-4 w-4 text-slate-300" />
                                                <p className="text-base font-black text-slate-900">
                                                    {offer.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPreviewOffer(offer); }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Vorschau
                                                </button>
                                                <button
                                                    onClick={(e) => handleDownload(offer, e)}
                                                    disabled={downloadingIds.has(offer.id)}
                                                    className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
                                                    title="PDF herunterladen"
                                                >
                                                    {downloadingIds.has(offer.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                </button>
                                                {offer.status === 'draft' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/offers/${offer.id}/edit`); }}
                                                        className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"
                                                        title="Entwurf bearbeiten"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {offer.status === 'draft' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showConfirm({
                                                                title: "Angebot löschen?",
                                                                message: "Möchten Sie diesen Angebotsentwurf wirklich löschen?",
                                                                variant: "danger",
                                                                confirmLabel: "Jetzt löschen",
                                                                onConfirm: () => {
                                                                    deleteOffer(offer.id);
                                                                    showToast("Angebot gelöscht.", "success");
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                        <FileText className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Angebote gefunden</h4>
                        <p className="text-slate-500 font-medium">Erstellen Sie Ihr erstes Angebot.</p>
                    </div>
                    <button
                        onClick={() => router.push('/offers/new')}
                        className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Neues Angebot erstellen
                    </button>
                </div>
            )}

            <OfferPreviewModal
                isOpen={!!previewOffer}
                onClose={() => setPreviewOffer(null)}
                offer={offers.find(o => o.id === previewOffer?.id) ?? previewOffer}
                customer={customers.find(c => c.id === previewOffer?.customerId)}
                companySettings={companySettings}
            />
        </div>
    );
}
