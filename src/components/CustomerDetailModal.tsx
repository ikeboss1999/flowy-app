"use client";

import React from "react";
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Phone,
    Plus,
    ShieldCheck,
    Trash2,
    User,
    X,
} from "lucide-react";
import { Customer } from "@/types/customer";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";

interface CustomerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: Customer;
    onUpdateCustomer?: (customer: Customer) => void;
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
            <span className="text-right text-sm font-bold text-slate-800">{value || "-"}</span>
        </div>
    );
}

export function CustomerDetailModal({ isOpen, onClose, customer, onUpdateCustomer }: CustomerDetailModalProps) {
    const { data: invoiceSettings } = useInvoiceSettings();
    const [isEditingNotes, setIsEditingNotes] = React.useState(false);
    const [editedNotesText, setEditedNotesText] = React.useState("");

    React.useEffect(() => {
        if (customer) {
            setEditedNotesText(customer.notes || "");
            setIsEditingNotes(false);
        }
    }, [customer]);

    if (!isOpen || !customer) return null;

    const isBusiness = customer.type === "business";
    const paymentTerm = invoiceSettings?.paymentTerms?.find(term => term.id === customer.defaultPaymentTermId);

    const handleSaveNotes = () => {
        if (!onUpdateCustomer) return;
        onUpdateCustomer({
            ...customer,
            notes: editedNotesText,
            updatedAt: new Date().toISOString()
        });
        setIsEditingNotes(false);
    };

    const handleDeleteNotes = () => {
        if (!onUpdateCustomer) return;
        onUpdateCustomer({
            ...customer,
            notes: "",
            updatedAt: new Date().toISOString()
        });
        setEditedNotesText("");
        setIsEditingNotes(false);
    };

    const copyToClipboard = (value?: string) => {
        if (!value) return;
        navigator.clipboard.writeText(value);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 z-10 rounded-2xl border border-white/10 bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="relative flex flex-col gap-6 pr-12 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                            <div className={cn(
                                "flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-white shadow-xl",
                                isBusiness ? "text-emerald-600" : "text-purple-600"
                            )}>
                                {isBusiness ? <Briefcase className="h-10 w-10" /> : <User className="h-10 w-10" />}
                            </div>
                            <div className="min-w-0">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-100">
                                        {customer.customer_number || "Ohne Nummer"}
                                    </span>
                                    <span className={cn(
                                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                        isBusiness ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-purple-300/20 bg-purple-400/10 text-purple-100"
                                    )}>
                                        {isBusiness ? "Geschäftskunde" : "Privatkunde"}
                                    </span>
                                    <span className={cn(
                                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                        customer.status === "active" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" :
                                            customer.status === "inactive" ? "border-amber-300/20 bg-amber-400/10 text-amber-100" :
                                                "border-rose-300/20 bg-rose-400/10 text-rose-100"
                                    )}>
                                        {customer.status === "active" ? "Aktiv" : customer.status === "inactive" ? "Inaktiv" : "Gesperrt"}
                                    </span>
                                </div>
                                <p className="text-sm font-black uppercase tracking-[0.3em] text-white/45">{customer.salutation || "Kunde"}</p>
                                <h2 className="mt-1 max-w-3xl break-words text-4xl font-black leading-tight tracking-tight text-white">
                                    {customer.name}
                                </h2>
                                <p className="mt-3 flex max-w-2xl items-center gap-2 text-sm font-semibold text-white/65">
                                    <MapPin className="h-4 w-4 shrink-0 text-cyan-200" />
                                    {[customer.address?.street, `${customer.address?.zip || ""} ${customer.address?.city || ""}`.trim()].filter(Boolean).join(", ") || "Keine Adresse"}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <a
                                href={customer.email ? `mailto:${customer.email}` : undefined}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5",
                                    !customer.email && "pointer-events-none opacity-50"
                                )}
                            >
                                <Mail className="h-4 w-4" /> E-Mail
                            </a>
                            <a
                                href={customer.phone ? `tel:${customer.phone}` : undefined}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition-all hover:bg-white/15",
                                    !customer.phone && "pointer-events-none opacity-50"
                                )}
                            >
                                <Phone className="h-4 w-4" /> Anrufen
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/70 p-5 sm:p-6">
                    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-5 lg:grid-cols-2">
                            <InfoCard icon={MapPin} title="Postanschrift">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-base font-black text-slate-900">{customer.address?.street || "Keine Straße angegeben"}</p>
                                    <p className="mt-1 text-sm font-bold text-slate-500">
                                        {customer.address?.zip || ""} {customer.address?.city || "Kein Ort angegeben"}
                                    </p>
                                </div>
                            </InfoCard>

                            <InfoCard icon={Mail} title="Kontakt">
                                <div className="space-y-1">
                                    <DetailRow
                                        label="E-Mail"
                                        value={customer.email ? (
                                            <span className="inline-flex items-center gap-2">
                                                {customer.email}
                                                <button onClick={() => copyToClipboard(customer.email)} className="text-slate-400 hover:text-indigo-600">
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                <a href={`mailto:${customer.email}`} className="text-slate-400 hover:text-indigo-600">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </span>
                                        ) : "-"}
                                    />
                                    <DetailRow label="Telefon" value={customer.phone || "-"} />
                                </div>
                            </InfoCard>

                            <InfoCard icon={Clock} title="Zahlung">
                                <DetailRow label="Standard" value={paymentTerm ? `${paymentTerm.name} (${paymentTerm.days} Tage)` : "Globaler Standard"} />
                                <DetailRow label="Aktualisiert" value={customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString("de-DE") : "-"} />
                            </InfoCard>

                            {isBusiness ? (
                                <InfoCard icon={ShieldCheck} title="Geschäftsdaten">
                                    <DetailRow label="UID" value={customer.taxId || "-"} />
                                    <DetailRow label="Firmenbuch" value={customer.commercialRegisterNumber || "-"} />
                                    <DetailRow
                                        label="Reverse Charge"
                                        value={(
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                                                customer.reverseChargeEnabled ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {customer.reverseChargeEnabled && <CheckCircle2 className="h-3 w-3" />}
                                                {customer.reverseChargeEnabled ? "Aktiv" : "Inaktiv"}
                                            </span>
                                        )}
                                    />
                                </InfoCard>
                            ) : (
                                <InfoCard icon={Calendar} title="Systemdaten">
                                    <DetailRow label="Kunde seit" value={new Date(customer.createdAt).toLocaleDateString("de-DE")} />
                                    <DetailRow label="Aktivität" value={customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString("de-DE") : "Keine"} />
                                </InfoCard>
                            )}
                        </div>

                        <div className="space-y-5">
                            <InfoCard icon={Calendar} title="Kundenstatus">
                                <div className="space-y-3">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kunde seit</p>
                                        <p className="mt-1 text-lg font-black text-slate-900">{new Date(customer.createdAt).toLocaleDateString("de-DE")}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Letzte Aktivität</p>
                                        <p className="mt-1 text-lg font-black text-slate-900">{customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString("de-DE") : "Keine"}</p>
                                    </div>
                                </div>
                            </InfoCard>

                            <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Interne Notizen</h4>
                                    </div>
                                    {!isEditingNotes && customer.notes && (
                                        <button onClick={handleDeleteNotes} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {isEditingNotes ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editedNotesText}
                                            onChange={(event) => setEditedNotesText(event.target.value)}
                                            rows={5}
                                            placeholder="Notiz eingeben..."
                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsEditingNotes(false);
                                                    setEditedNotesText(customer.notes || "");
                                                }}
                                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                onClick={handleSaveNotes}
                                                className="bg-primary-gradient flex-1 rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20"
                                            >
                                                Speichern
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="min-h-[88px] whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-600">
                                            {customer.notes || "Keine Notizen zu diesem Kunden hinterlegt."}
                                        </p>
                                        <button
                                            onClick={() => setIsEditingNotes(true)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                                        >
                                            <Plus className="h-4 w-4" />
                                            {customer.notes ? "Notiz bearbeiten" : "Notiz hinzufügen"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
