"use client";

import React, { useState } from "react";
import {
    Briefcase,
    Calendar,
    Edit2,
    Euro,
    ExternalLink,
    FileText,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { Inquiry, InquiryChannel, InquiryStatus } from "@/types/crm";
import { useInquiryNotes } from "@/hooks/useCRM";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface InquiryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    inquiry: Inquiry;
    onStartEdit: (inquiry: Inquiry) => void;
    onDelete: () => void;
}

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

const formatDateTime = (date?: string) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return `${parsed.toLocaleDateString("de-AT")} um ${parsed.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}`;
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

export function InquiryDetailModal({ isOpen, onClose, inquiry, onStartEdit, onDelete }: InquiryDetailModalProps) {
    if (!isOpen || !inquiry) return null;

    const statusDef = STATUS_CONFIG[inquiry.status];
    const channelDef = CHANNELS.find((channel) => channel.id === inquiry.channel);
    const initials = initialsFor(inquiry.clientName);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-[92rem] overflow-hidden rounded-[34px] border border-white bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
                <aside className="hidden w-96 shrink-0 flex-col justify-between bg-gradient-to-br from-indigo-800 via-violet-800 to-fuchsia-600 p-8 text-white lg:flex">
                    <div>
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-3xl font-black text-indigo-700 shadow-xl">
                            {initials}
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                            <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", channelDef?.bg, channelDef?.color)}>
                                {channelDef?.label || inquiry.channel}
                            </span>
                            <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusDef.bg, statusDef.color)}>
                                {statusDef.label}
                            </span>
                        </div>

                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100">CRM Anfrage</p>
                        <h3 className="mt-3 text-3xl font-black leading-tight">{inquiry.clientName}</h3>

                        <div className="mt-8 space-y-5 border-t border-white/15 pt-6">
                            <a
                                href={inquiry.clientEmail ? `mailto:${inquiry.clientEmail}` : undefined}
                                className="flex min-w-0 items-center justify-between gap-3 text-sm font-bold text-white/80"
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    <Mail className="h-4 w-4 shrink-0 text-cyan-100" />
                                    <span className="truncate">{inquiry.clientEmail || "Keine E-Mail"}</span>
                                </span>
                                {inquiry.clientEmail && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/45" />}
                            </a>

                            <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-white/80">
                                <Phone className="h-4 w-4 shrink-0 text-cyan-100" />
                                <span className="truncate">{inquiry.clientPhone || "Keine Telefonnummer"}</span>
                            </div>

                            <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-white/80">
                                <MapPin className="h-4 w-4 shrink-0 text-cyan-100" />
                                <span className="truncate">{inquiry.location || "Kein Ort hinterlegt"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/55">
                            <span>Erfasst</span>
                            <span>{formatDate(inquiry.createdAt)}</span>
                        </div>
                        <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-widest text-white/55">
                            <span>Aktualisiert</span>
                            <span>{formatDate(inquiry.updatedAt)}</span>
                        </div>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Anfrage Details</p>
                            <h3 className="mt-1 truncate text-2xl font-black text-slate-950">{inquiry.clientName}</h3>
                            <p className="mt-1 text-sm font-bold text-slate-500 lg:hidden">
                                {channelDef?.label || inquiry.channel} · {statusDef.label}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onStartEdit(inquiry)}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                                title="Bearbeiten"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                title="Löschen"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onClose}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Schließen"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-8">
                        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-950">Bauvorhaben / Beschreibung</h4>
                                        <p className="text-sm font-semibold text-slate-500">Was soll umgesetzt werden?</p>
                                    </div>
                                </div>
                                <p className="min-h-40 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700">
                                    {inquiry.projectDescription || "Keine Projektbeschreibung angegeben."}
                                </p>
                            </div>

                            <div className="grid gap-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <h4 className="font-black text-slate-950">Projektdetails</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <InfoRow label="Baustelle / Ort" value={inquiry.location || "-"} icon={MapPin} />
                                        <InfoRow label="Budget" value={formatBudget(inquiry.budget)} icon={Euro} />
                                        <InfoRow label="Status" value={statusDef.label} />
                                        <InfoRow label="Kanal" value={channelDef?.label || inquiry.channel} />
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <h4 className="font-black text-slate-950">Zeitleiste</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <InfoRow label="Erfasst am" value={formatDateTime(inquiry.createdAt)} />
                                        <InfoRow label="Zuletzt aktualisiert" value={formatDateTime(inquiry.updatedAt)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <InquiryNotesTimeline inquiryId={inquiry.id} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
    return (
        <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <span className="flex max-w-[60%] items-center justify-end gap-2 text-right text-sm font-black text-slate-800">
                {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-300" />}
                {value}
            </span>
        </div>
    );
}

function InquiryNotesTimeline({ inquiryId }: { inquiryId: string }) {
    const { notes, addNote, deleteNote, isLoading } = useInquiryNotes(inquiryId);
    const { user } = useAuth();
    const [newNoteText, setNewNoteText] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    const handleAddNote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newNoteText.trim() || isSavingNote) return;
        setIsSavingNote(true);
        try {
            const userName = user?.email?.split("@")[0] || "Admin";
            await addNote(newNoteText.trim(), userName);
            setNewNoteText("");
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-950">Gesprächsverlauf & Notizen</h4>
                        <p className="text-sm font-semibold text-slate-500">{notes.length} Einträge</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleAddNote} className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                    type="text"
                    value={newNoteText}
                    onChange={(event) => setNewNoteText(event.target.value)}
                    disabled={isSavingNote}
                    placeholder="Neue Notiz hinzufügen..."
                    className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={!newNoteText.trim() || isSavingNote}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Hinzufügen
                </button>
            </form>

            {isLoading ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">Notizen werden geladen...</div>
            ) : notes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-black text-slate-800">Noch keine Notizen</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Schreibe die erste Notiz, um den Verlauf zu dokumentieren.</p>
                </div>
            ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {notes.map((note) => {
                        const dateValue = (note as any).createdAt || (note as any).created_at || (note as any).createdat;
                        const author = (note as any).createdBy || (note as any).created_by || (note as any).createdby || "Admin";

                        return (
                            <div key={note.id} className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>{author}</span>
                                    <span>{formatDateTime(dateValue)}</span>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">{note.content}</p>
                                <button
                                    onClick={() => deleteNote(note.id)}
                                    className="absolute right-3 top-3 rounded-xl bg-white p-1.5 text-slate-300 opacity-0 shadow-sm transition hover:text-rose-500 group-hover:opacity-100"
                                    title="Notiz löschen"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
