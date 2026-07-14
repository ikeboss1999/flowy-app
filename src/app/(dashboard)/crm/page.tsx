"use client";

import React, { useMemo, useState } from "react";
import {
    Calendar,
    ChevronRight,
    Euro,
    Inbox,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Plus,
    Search,
    Sparkles,
    TrendingUp,
    X,
} from "lucide-react";
import { useCRM } from "@/hooks/useCRM";
import { Inquiry, InquiryChannel, InquiryStatus } from "@/types/crm";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InquiryDetailModal } from "@/components/InquiryDetailModal";

const STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
    new: { label: "Neu", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", dot: "bg-blue-500" },
    contacted: { label: "In Kontakt", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", dot: "bg-amber-500" },
    offered: { label: "Angebot erstellt", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", dot: "bg-indigo-500" },
    won: { label: "Gewonnen", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", dot: "bg-emerald-500" },
    lost: { label: "Verloren", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", dot: "bg-rose-500" },
};

const CHANNELS: { id: InquiryChannel; label: string; color: string; bg: string }[] = [
    { id: "phone", label: "Telefon", color: "text-cyan-700", bg: "bg-cyan-50" },
    { id: "website", label: "Webseite", color: "text-indigo-700", bg: "bg-indigo-50" },
    { id: "instagram", label: "Instagram", color: "text-pink-700", bg: "bg-pink-50" },
    { id: "email", label: "E-Mail", color: "text-purple-700", bg: "bg-purple-50" },
    { id: "recommendation", label: "Empfehlung", color: "text-emerald-700", bg: "bg-emerald-50" },
    { id: "other", label: "Sonstiges", color: "text-slate-700", bg: "bg-slate-100" },
];

const formatDate = (date?: string) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("de-AT");
};

const formatBudget = (budget?: number) =>
    typeof budget === "number"
        ? new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(budget)
        : "-";

const initialsFor = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";

export default function CRMPage() {
    usePermissionGuard("crm_read");

    const { inquiries, addInquiry, updateInquiry, deleteInquiry, isLoading } = useCRM();
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeStatusFilter, setActiveStatusFilter] = useState<InquiryStatus | "all">("all");
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [channel, setChannel] = useState<InquiryChannel>("phone");
    const [projectDescription, setProjectDescription] = useState("");
    const [location, setLocation] = useState("");
    const [budget, setBudget] = useState("");
    const [status, setStatus] = useState<InquiryStatus>("new");
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const filteredInquiries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return inquiries
            .filter((inquiry) => {
                const matchesSearch =
                    !query ||
                    inquiry.clientName.toLowerCase().includes(query) ||
                    inquiry.clientPhone?.toLowerCase().includes(query) ||
                    inquiry.clientEmail?.toLowerCase().includes(query) ||
                    inquiry.projectDescription?.toLowerCase().includes(query) ||
                    inquiry.location?.toLowerCase().includes(query);
                const matchesStatus = activeStatusFilter === "all" || inquiry.status === activeStatusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activeStatusFilter, inquiries, searchQuery]);

    const stats = useMemo(() => {
        const total = inquiries.length;
        const channelCounts = CHANNELS.reduce((acc, channelOption) => {
            acc[channelOption.id] = inquiries.filter((inquiry) => inquiry.channel === channelOption.id).length;
            return acc;
        }, {} as Record<InquiryChannel, number>);

        return {
            total,
            newCount: inquiries.filter((inquiry) => inquiry.status === "new").length,
            wonCount: inquiries.filter((inquiry) => inquiry.status === "won").length,
            offeredCount: inquiries.filter((inquiry) => inquiry.status === "offered").length,
            totalBudget: inquiries.reduce((sum, inquiry) => sum + (inquiry.budget || 0), 0),
            channels: channelCounts,
        };
    }, [inquiries]);

    const resetForm = () => {
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setChannel("phone");
        setProjectDescription("");
        setLocation("");
        setBudget("");
        setStatus("new");
        setIsEditMode(false);
    };

    const handleCreateInquiry = async () => {
        if (!clientName.trim()) return;

        await addInquiry({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            channel,
            projectDescription: projectDescription.trim(),
            location: location.trim(),
            budget: budget ? parseFloat(budget) : undefined,
            status: "new",
        });
        resetForm();
        setIsCreateModalOpen(false);
    };

    const handleStartEdit = (inquiry: Inquiry) => {
        setClientName(inquiry.clientName);
        setClientPhone(inquiry.clientPhone || "");
        setClientEmail(inquiry.clientEmail || "");
        setChannel(inquiry.channel);
        setProjectDescription(inquiry.projectDescription || "");
        setLocation(inquiry.location || "");
        setBudget(inquiry.budget?.toString() || "");
        setStatus(inquiry.status);
        setIsEditMode(true);
    };

    const handleSaveInquiryEdit = async () => {
        if (!selectedInquiry || !clientName.trim()) return;

        const updated = {
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            channel,
            projectDescription: projectDescription.trim(),
            location: location.trim(),
            budget: budget ? parseFloat(budget) : undefined,
            status,
        };

        await updateInquiry(selectedInquiry.id, updated);
        setSelectedInquiry((prev) => (prev ? { ...prev, ...updated } : null));
        setIsEditMode(false);
    };

    const handleDeleteInquiryConfirm = async () => {
        if (!selectedInquiry) return;
        await deleteInquiry(selectedInquiry.id);
        setSelectedInquiry(null);
        setConfirmDeleteOpen(false);
    };

    if (isLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-sm font-black text-slate-500 shadow-sm">
                    <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-indigo-600" />
                    CRM-Daten werden geladen...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2 ring-1 ring-white/20">
                            <Inbox className="h-5 w-5 text-cyan-100" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100">Vertrieb & CRM</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Anfragen</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-white/75">
                            Neue Anfragen, Kontakte, Status und Chancen schnell erfassen und weiterverfolgen.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-xl shadow-indigo-950/20 transition hover:-translate-y-0.5"
                    >
                        <Plus className="h-5 w-5" />
                        Neue Anfrage
                    </button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Gesamt", value: stats.total, icon: Inbox, tone: "slate" },
                    { label: "Neu", value: stats.newCount, icon: Sparkles, tone: "blue" },
                    { label: "Angebote", value: stats.offeredCount, icon: MessageSquare, tone: "indigo" },
                    { label: "Gewonnen", value: stats.wonCount, icon: TrendingUp, tone: "emerald" },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                                    stat.tone === "slate" && "bg-slate-100 text-slate-600",
                                    stat.tone === "blue" && "bg-blue-50 text-blue-600",
                                    stat.tone === "indigo" && "bg-indigo-50 text-indigo-600",
                                    stat.tone === "emerald" && "bg-emerald-50 text-emerald-600"
                                )}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <span className="text-3xl font-black text-slate-950">{stat.value}</span>
                            </div>
                            <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                        </div>
                    );
                })}
            </section>

            {stats.total > 0 && (
                <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-950">Herkunft der Anfragen</h3>
                            <p className="text-sm font-semibold text-slate-500">Budget gesamt: {formatBudget(stats.totalBudget)}</p>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {CHANNELS.map((channelOption) => {
                            const count = stats.channels[channelOption.id] || 0;
                            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;

                            return (
                                <div key={channelOption.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest", channelOption.bg, channelOption.color)}>
                                            {channelOption.label}
                                        </span>
                                        <span className="text-lg font-black text-slate-950">{count}</span>
                                    </div>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="mt-2 text-xs font-bold text-slate-400">{pct}% Anteil</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Anfragen suchen nach Name, Telefon, E-Mail, Vorhaben oder Ort..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
                        <button
                            onClick={() => setActiveStatusFilter("all")}
                            className={cn(
                                "rounded-xl px-4 py-3 text-xs font-black transition",
                                activeStatusFilter === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Alle ({inquiries.length})
                        </button>
                        {(Object.keys(STATUS_CONFIG) as InquiryStatus[]).map((statusKey) => (
                            <button
                                key={statusKey}
                                onClick={() => setActiveStatusFilter(statusKey)}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition",
                                    activeStatusFilter === statusKey ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <span className={cn("h-2 w-2 rounded-full", STATUS_CONFIG[statusKey].dot)} />
                                {STATUS_CONFIG[statusKey].label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {filteredInquiries.length > 0 ? (
                <section className="grid gap-4">
                    {filteredInquiries.map((inquiry) => {
                        const statusDef = STATUS_CONFIG[inquiry.status];
                        const channelDef = CHANNELS.find((entry) => entry.id === inquiry.channel);

                        return (
                            <article
                                key={inquiry.id}
                                onClick={() => {
                                    setSelectedInquiry(inquiry);
                                    setIsEditMode(false);
                                }}
                                className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70"
                            >
                                <div className="grid gap-5 xl:grid-cols-[1.25fr_1.4fr_0.8fr_0.8fr_auto] xl:items-center">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-600 ring-1 ring-indigo-100">
                                            {initialsFor(inquiry.clientName)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", channelDef?.bg, channelDef?.color)}>
                                                    {channelDef?.label || inquiry.channel}
                                                </span>
                                                <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusDef.bg, statusDef.color)}>
                                                    {statusDef.label}
                                                </span>
                                            </div>
                                            <h3 className="truncate text-xl font-black text-slate-950 group-hover:text-indigo-700">{inquiry.clientName}</h3>
                                            <div className="mt-2 grid gap-1 text-xs font-bold text-slate-500">
                                                {inquiry.clientPhone && (
                                                    <span className="flex items-center gap-2">
                                                        <Phone className="h-3.5 w-3.5 text-slate-300" />
                                                        {inquiry.clientPhone}
                                                    </span>
                                                )}
                                                {inquiry.clientEmail && (
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                        <span className="truncate">{inquiry.clientEmail}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bauvorhaben</p>
                                        <p className="mt-1 line-clamp-2 font-black leading-6 text-slate-900">
                                            {inquiry.projectDescription || "Keine Beschreibung hinterlegt."}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ort</p>
                                        <p className="mt-1 flex items-center gap-2 font-bold text-slate-700">
                                            <MapPin className="h-4 w-4 text-slate-300" />
                                            {inquiry.location || "-"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget</p>
                                        <p className="mt-1 flex items-center gap-2 font-black text-slate-950">
                                            <Euro className="h-4 w-4 text-slate-300" />
                                            {formatBudget(inquiry.budget)}
                                        </p>
                                        <p className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formatDate(inquiry.createdAt)}
                                        </p>
                                    </div>

                                    <ChevronRight className="hidden h-5 w-5 justify-self-end text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500 xl:block" />
                                </div>
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                        <Inbox className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-950">Keine Anfragen gefunden</h3>
                    <p className="mt-2 font-semibold text-slate-500">Passe Suche oder Statusfilter an.</p>
                </section>
            )}

            {isCreateModalOpen && (
                <InquiryFormModal
                    title="Neue Anfrage erfassen"
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateInquiry}
                    clientName={clientName}
                    setClientName={setClientName}
                    clientPhone={clientPhone}
                    setClientPhone={setClientPhone}
                    clientEmail={clientEmail}
                    setClientEmail={setClientEmail}
                    channel={channel}
                    setChannel={setChannel}
                    projectDescription={projectDescription}
                    setProjectDescription={setProjectDescription}
                    location={location}
                    setLocation={setLocation}
                    budget={budget}
                    setBudget={setBudget}
                />
            )}

            {selectedInquiry && !isEditMode && (
                <InquiryDetailModal
                    isOpen={!!selectedInquiry}
                    onClose={() => setSelectedInquiry(null)}
                    inquiry={selectedInquiry}
                    onStartEdit={(inquiry) => handleStartEdit(inquiry)}
                    onDelete={() => setConfirmDeleteOpen(true)}
                />
            )}

            {selectedInquiry && isEditMode && (
                <InquiryFormModal
                    title="Anfrage bearbeiten"
                    onClose={() => setIsEditMode(false)}
                    onSave={handleSaveInquiryEdit}
                    clientName={clientName}
                    setClientName={setClientName}
                    clientPhone={clientPhone}
                    setClientPhone={setClientPhone}
                    clientEmail={clientEmail}
                    setClientEmail={setClientEmail}
                    channel={channel}
                    setChannel={setChannel}
                    projectDescription={projectDescription}
                    setProjectDescription={setProjectDescription}
                    location={location}
                    setLocation={setLocation}
                    budget={budget}
                    setBudget={setBudget}
                    status={status}
                    setStatus={setStatus}
                    showStatus
                />
            )}

            <ConfirmDialog
                isOpen={confirmDeleteOpen}
                title="Anfrage löschen"
                message="Möchtest du diese Anfrage wirklich unwiderruflich löschen? Alle zugehörigen Notizen werden ebenfalls gelöscht."
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                variant="danger"
                onConfirm={handleDeleteInquiryConfirm}
                onCancel={() => setConfirmDeleteOpen(false)}
            />
        </div>
    );
}

interface InquiryFormModalProps {
    title: string;
    onClose: () => void;
    onSave: () => void;
    clientName: string;
    setClientName: (value: string) => void;
    clientPhone: string;
    setClientPhone: (value: string) => void;
    clientEmail: string;
    setClientEmail: (value: string) => void;
    channel: InquiryChannel;
    setChannel: (value: InquiryChannel) => void;
    projectDescription: string;
    setProjectDescription: (value: string) => void;
    location: string;
    setLocation: (value: string) => void;
    budget: string;
    setBudget: (value: string) => void;
    status?: InquiryStatus;
    setStatus?: (value: InquiryStatus) => void;
    showStatus?: boolean;
}

function InquiryFormModal({
    title,
    onClose,
    onSave,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    clientEmail,
    setClientEmail,
    channel,
    setChannel,
    projectDescription,
    setProjectDescription,
    location,
    setLocation,
    budget,
    setBudget,
    status = "new",
    setStatus,
    showStatus = false,
}: InquiryFormModalProps) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/30 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-[34px] border border-white bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
                <div className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-500 px-7 py-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100">CRM</p>
                            <h3 className="mt-1 text-3xl font-black">{title}</h3>
                            <p className="mt-2 text-sm font-semibold text-white/70">Kontakt, Vorhaben und Status sauber erfassen.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 bg-slate-50/70 p-6 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kundenname *</span>
                        <input
                            value={clientName}
                            onChange={(event) => setClientName(event.target.value)}
                            placeholder="z.B. Max Mustermann"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefon</span>
                        <input
                            value={clientPhone}
                            onChange={(event) => setClientPhone(event.target.value)}
                            placeholder="z.B. 0664 1234567"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-Mail</span>
                        <input
                            type="email"
                            value={clientEmail}
                            onChange={(event) => setClientEmail(event.target.value)}
                            placeholder="z.B. max@email.at"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ort / PLZ</span>
                        <input
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                            placeholder="z.B. Graz"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kanal</span>
                        <select
                            value={channel}
                            onChange={(event) => setChannel(event.target.value as InquiryChannel)}
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        >
                            {CHANNELS.map((channelOption) => (
                                <option key={channelOption.id} value={channelOption.id}>{channelOption.label}</option>
                            ))}
                        </select>
                    </label>

                    {showStatus && setStatus && (
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                                className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                            >
                                {(Object.keys(STATUS_CONFIG) as InquiryStatus[]).map((statusKey) => (
                                    <option key={statusKey} value={statusKey}>{STATUS_CONFIG[statusKey].label}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget</span>
                        <input
                            type="number"
                            value={budget}
                            onChange={(event) => setBudget(event.target.value)}
                            placeholder="z.B. 15000"
                            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>

                    <label className="block sm:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bauvorhaben / Beschreibung</span>
                        <textarea
                            rows={4}
                            value={projectDescription}
                            onChange={(event) => setProjectDescription(event.target.value)}
                            placeholder="z.B. Pflasterarbeiten im Hof..."
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                    </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!clientName.trim()}
                        className="rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-7 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
}
