"use client";

import React, { useState } from "react";
import { X, User, Briefcase, Mail, Phone, MapPin, FileText, Clock, Calendar, DollarSign, Plus, Trash2, Edit2, Loader2, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react";
import { Inquiry, InquiryStatus, InquiryChannel } from "@/types/crm";
import { useCRM, useInquiryNotes } from "@/hooks/useCRM";
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
    new: { label: 'Neu', color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100', dot: 'bg-blue-500' },
    contacted: { label: 'In Kontakt', color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100', dot: 'bg-amber-500' },
    offered: { label: 'Angebot erstellt', color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100', dot: 'bg-indigo-500' },
    won: { label: 'Gewonnen', color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', dot: 'bg-emerald-500' },
    lost: { label: 'Verloren', color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100', dot: 'bg-rose-500' }
};

const CHANNELS: { id: InquiryChannel; label: string; color: string; bg: string }[] = [
    { id: 'phone', label: 'Telefon', color: 'text-cyan-700', bg: 'bg-cyan-50' },
    { id: 'website', label: 'Webseite', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { id: 'instagram', label: 'Instagram', color: 'text-pink-700', bg: 'bg-pink-50' },
    { id: 'email', label: 'E-Mail', color: 'text-purple-700', bg: 'bg-purple-50' },
    { id: 'recommendation', label: 'Empfehlung', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { id: 'other', label: 'Sonstiges', color: 'text-slate-700', bg: 'bg-slate-50' }
];

export function InquiryDetailModal({ isOpen, onClose, inquiry, onStartEdit, onDelete }: InquiryDetailModalProps) {
    if (!isOpen || !inquiry) return null;

    const statusDef = STATUS_CONFIG[inquiry.status];
    const channelDef = CHANNELS.find(c => c.id === inquiry.channel);

    // Generate initials for avatar
    const initials = inquiry.clientName
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-[88rem] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row max-h-[95vh] md:max-h-[900px] animate-in zoom-in-95 duration-200">
                
                {/* Linkes Panel (Hero & Kontakt) - 30% Breite, Farbverlauf */}
                <div className="md:w-[30%] bg-gradient-to-br from-[#1e1b4b] via-[#3b0764] to-[#4f46e5] text-slate-100 border-r border-white/5 p-8 flex flex-col justify-between relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 left-6 md:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white shadow-sm border border-white/10 bg-white/5"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="space-y-8 mt-4 md:mt-0">
                        {/* Profile Avatar & Name */}
                        <div className="space-y-4">
                            <div className="h-16 w-16 rounded-2xl flex items-center justify-center border shadow-sm bg-white text-slate-800 font-black text-lg">
                                {initials}
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest block mb-1">
                                    CRM Anfrage
                                </span>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-snug break-words">
                                    {inquiry.clientName}
                                </h3>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                                channelDef ? `${channelDef.bg} ${channelDef.color}` : "bg-white/10 text-slate-300 border-white/20"
                            )}>
                                {channelDef?.label || inquiry.channel}
                            </span>
                            <span className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                statusDef.bg, statusDef.color, statusDef.border
                            )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusDef.dot)} />
                                {statusDef.label}
                            </span>
                        </div>

                        <hr className="border-white/10" />

                        {/* Quick Contacts */}
                        <div className="space-y-5">
                            <div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5">E-Mail-Adresse</span>
                                <div className="flex items-center gap-2 text-slate-200 justify-between">
                                    <div className="flex items-center gap-2.5 text-slate-200 min-w-0 flex-1">
                                        <Mail className="h-4.5 w-4.5 text-slate-350 shrink-0" />
                                        <span className="text-sm font-semibold truncate" title={inquiry.clientEmail}>{inquiry.clientEmail || "-"}</span>
                                    </div>
                                    {inquiry.clientEmail && (
                                        <a
                                            href={`mailto:${inquiry.clientEmail}`}
                                            className="p-1 text-slate-350 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
                                            title="E-Mail schreiben"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
                                <div className="flex items-center gap-2.5 text-slate-200">
                                    <Phone className="h-4.5 w-4.5 text-slate-350 shrink-0" />
                                    <span className="text-sm font-semibold">{inquiry.clientPhone || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata am Fuß */}
                    <div className="pt-6 border-t border-white/10 hidden md:block">
                        <div className="space-y-2 text-[11px] font-semibold text-slate-350">
                            <div className="flex justify-between">
                                <span>Erfasst am:</span>
                                <span className="text-slate-200">{new Date(inquiry.createdAt).toLocaleDateString('de-DE')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rechtes Panel (Detaillierte Infos) - 70% Breite */}
                <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto relative bg-white">
                    {/* Actions Header */}
                    <div className="absolute top-6 right-6 hidden md:flex items-center gap-2">
                        <button
                            onClick={() => onStartEdit(inquiry)}
                            className="p-2 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 rounded-xl transition-all"
                            title="Bearbeiten"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/50 rounded-xl transition-all"
                            title="Löschen"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all ml-2">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Raster-Layout */}
                    <div className="space-y-8 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Spalte 1: Bauvorhaben */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Bauvorhaben / Beschreibung
                                </h4>
                                <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[120px] flex flex-col justify-center">
                                    <p className="text-[14px] font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {inquiry.projectDescription || "Keine Projektbeschreibung angegeben."}
                                    </p>
                                </div>
                            </div>

                            {/* Spalte 2: Baustelle & Budget */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Projektdetails
                                </h4>
                                <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[120px] space-y-4 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-450 uppercase tracking-wider">Baustelle / Ort:</span>
                                        <span className="font-bold text-slate-700 flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            {inquiry.location || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                                        <span className="font-bold text-slate-450 uppercase tracking-wider">Geschätztes Budget:</span>
                                        <span className="font-black text-slate-700 text-sm flex items-center gap-0.5">
                                            <DollarSign className="h-3.5 w-3.5 text-slate-450" />
                                            {inquiry.budget ? `${inquiry.budget.toLocaleString('de-DE')} €` : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Gesprächsverlauf & Notizen Timeline */}
                        <div className="mt-4">
                            <InquiryNotesTimeline inquiryId={inquiry.id} />
                        </div>
                    </div>

                    {/* Footer Close Button */}
                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-primary-gradient text-white rounded-xl font-bold hover:opacity-95 transition-all text-xs tracking-wide shadow-md shadow-purple-500/20 active:scale-95 duration-150"
                        >
                            Schließen
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Inner component for the Notes Timeline
function InquiryNotesTimeline({ inquiryId }: { inquiryId: string }) {
    const { notes, addNote, deleteNote, isLoading } = useInquiryNotes(inquiryId);
    const { user } = useAuth();
    const [newNoteText, setNewNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteText.trim() || isSavingNote) return;
        setIsSavingNote(true);
        try {
            const userName = user?.email?.split('@')[0] || 'Admin';
            await addNote(newNoteText.trim(), userName);
            setNewNoteText('');
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500 animate-pulse" />
                Gesprächsverlauf & Notizen ({notes.length})
            </h4>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                    type="text"
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    disabled={isSavingNote}
                    placeholder="Neue Notiz hinzufügen..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700"
                />
                <button
                    type="submit"
                    disabled={!newNoteText.trim() || isSavingNote}
                    className="px-4 py-2.5 bg-primary-gradient disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shrink-0 flex items-center justify-center shadow-md active:scale-95 duration-100"
                >
                    {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hinzufügen'}
                </button>
            </form>

            {/* Note Timeline List */}
            {isLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">Notizen werden geladen...</div>
            ) : notes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                    Bisher keine Notizen erfasst. Schreibe die erste Notiz, um den Verlauf zu dokumentieren.
                </div>
            ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-5 py-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                    {notes.map(note => (
                        <div key={note.id} className="relative group/note">
                            <span className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                            
                            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 shadow-sm relative">
                                <div className="flex items-center justify-between text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                    <span>{(note as any).createdBy || (note as any).created_by || (note as any).createdby || 'Admin'}</span>
                                    <span>
                                        {(() => {
                                            const dateVal = (note as any).createdAt || (note as any).created_at || (note as any).createdat;
                                            if (!dateVal) return '—';
                                            const d = new Date(dateVal);
                                            if (isNaN(d.getTime())) return '—';
                                            return `${d.toLocaleDateString('de-DE')} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
                                        })()}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-700 mt-2 leading-relaxed break-words whitespace-pre-wrap">{note.content}</p>
                                
                                <button
                                    onClick={() => deleteNote(note.id)}
                                    className="absolute top-2 right-2 p-1 text-slate-350 hover:text-rose-500 opacity-0 group-hover/note:opacity-100 transition-opacity rounded-lg hover:bg-slate-100/50"
                                    title="Notiz löschen"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
