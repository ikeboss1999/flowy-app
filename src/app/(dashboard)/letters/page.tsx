"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Mail, Plus, Search, Calendar, FileText, Trash2, Edit2, Download, Eye, ExternalLink } from "lucide-react";
import { useLetters } from "@/hooks/useLetters";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

export default function LettersPage() {
    const { letters, deleteLetter, isLoading } = useLetters();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLetters = useMemo(() => {
        return letters.filter(letter =>
            letter.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            letter.subject.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [letters, searchQuery]);

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Brief löschen?",
            message: "Möchten Sie diesen Brief wirklich dauerhaft löschen? Die PDF-Datei im Archiv bleibt erhalten.",
            variant: "danger",
            confirmLabel: "Brief löschen",
            onConfirm: async () => {
                try {
                    await deleteLetter(id);
                    showToast("Brief erfolgreich gelöscht.", "success");
                } catch (e) {
                    showToast("Löschen fehlgeschlagen.", "error");
                }
            }
        });
    };

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
                            <Mail className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Schriftverkehr</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Briefe <span className="text-slate-300 font-light">Schreiben</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Erstellen Sie professionelle DIN A4 Briefe im Firmenlayout und archivieren Sie diese direkt.</p>
                </div>
                <Link
                    href="/letters/new"
                    className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus className="h-5 w-5" /> Neuer Brief
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: "Briefe Gesamt", count: letters.length, color: "text-indigo-600", bg: "bg-indigo-50", icon: Mail },
                    { label: "Diesen Monat", count: letters.filter(l => {
                        const date = new Date(l.date);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length, color: "text-purple-600", bg: "bg-purple-50", icon: Calendar },
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

            {/* Filter / Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Briefe suchen nach Empfänger oder Betreff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                />
            </div>

            {/* Letters List / Grid */}
            {filteredLetters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLetters.map((letter) => (
                        <div key={letter.id} className="glass-card p-6 flex flex-col group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/5 transition-transform group-hover:scale-110">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-100">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                    {new Date(letter.date).toLocaleDateString('de-DE')}
                                </span>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Empfänger</span>
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                        {letter.recipientName}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-medium">{letter.city}</p>
                                </div>

                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Betreff</span>
                                    <p className="font-bold text-slate-700 text-sm line-clamp-2">{letter.subject}</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex gap-1.5">
                                    <Link
                                        href={`/letters/${letter.id}`}
                                        className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Brief bearbeiten"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(letter.id)}
                                        className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        title="Brief löschen"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <Link
                                    href={`/letters/${letter.id}/pdf`}
                                    target="_blank"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 group/btn"
                                >
                                    PDF ansehen <ExternalLink className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                        <Mail className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Briefe vorhanden</h4>
                        <p className="text-slate-500 font-medium">Erstellen Sie Ihren ersten DIN A4 Brief in wenigen Sekunden.</p>
                    </div>
                    <Link
                        href="/letters/new"
                        className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-100 transition-all inline-block shadow-sm"
                    >
                        Jetzt Brief schreiben
                    </Link>
                </div>
            )}
        </div>
    );
}
