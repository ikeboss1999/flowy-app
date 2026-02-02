"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    FileText,
    Briefcase,
    Plus,
    Clock,
    ExternalLink,
    Edit2,
    Calendar,
    Download,
    TrendingUp
} from "lucide-react";
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";

// Mock data (matching the main page for consistency)
const MOCK_CUSTOMERS: Customer[] = [
    {
        id: "1",
        type: "private",
        status: "active",
        name: "Max Mustermann",
        email: "max@mustermann.at",
        phone: "+43 664 1234567",
        address: { street: "Stephansplatz 1", city: "Wien", zip: "1010" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    },
    {
        id: "2",
        type: "business",
        status: "active",
        name: "Alpenbau Graz GmbH",
        email: "office@alpenbau-graz.at",
        phone: "+43 316 987654",
        address: { street: "Gewerbestraße 5", city: "Graz", zip: "8010" },
        taxId: "ATU67890123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    }
];

export default function CustomerDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const customer = useMemo(() => {
        return MOCK_CUSTOMERS.find(c => c.id === id) || MOCK_CUSTOMERS[0];
    }, [id]);

    return (
        <div className="flex-1 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <Link
                    href="/customers"
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors group"
                >
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    Zurück zur Übersicht
                </Link>
                <div className="flex gap-3">
                    <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Edit2 className="h-4 w-4" /> Bearbeiten
                    </button>
                    <button className="bg-primary-gradient text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                        <Plus className="h-4 w-4" /> Neue Rechnung
                    </button>
                </div>
            </div>

            {/* Main Profile Header */}
            <div className="glass-card p-10 relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />

                <div className="flex items-start gap-10 relative z-10">
                    <div className={cn(
                        "h-32 w-32 rounded-[2.5rem] flex items-center justify-center text-4xl font-bold shadow-2xl",
                        customer.type === 'private' ? "bg-purple-50 text-purple-600 shadow-purple-500/10" : "bg-emerald-50 text-emerald-600 shadow-emerald-500/10"
                    )}>
                        {customer.name.charAt(0)}
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-outfit">
                                    {customer.name}
                                </h1>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    customer.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                        customer.status === 'inactive' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                            "bg-rose-50 text-rose-600 border border-rose-100"
                                )}>
                                    {customer.status === 'active' ? 'Aktiv' : customer.status === 'inactive' ? 'Inaktiv' : 'Gesperrt'}
                                </div>
                            </div>
                            <p className="text-lg text-slate-500 font-medium tracking-tight flex items-center gap-2">
                                {customer.type === 'private' ? 'Privatkunde' : 'Geschäftskunde'}
                                {customer.taxId && ` • ${customer.taxId}`}
                                {customer.reverseChargeEnabled && (
                                    <span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black border border-emerald-500/20">
                                        Reverse Charge
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-8 pt-4">
                            <div className="flex items-center gap-4 text-slate-600">
                                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-xl">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">E-Mail</p>
                                    <p className="font-bold">{customer.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-600">
                                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-xl">
                                    <Phone className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Telefon</p>
                                    <p className="font-bold">{customer.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-600">
                                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-xl">
                                    <MapPin className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Anschrift</p>
                                    <p className="font-bold">{customer.address.street}, {customer.address.zip} {customer.address.city}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-3 gap-8">
                {/* Stats */}
                <div className="col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="glass-card p-6 flex flex-col justify-between h-40 group hover:border-indigo-500/30 transition-all cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <TrendingUp className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div>
                                <h4 className="text-3xl font-bold text-slate-900">12.450,00 €</h4>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Umsatz Gesamt</p>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col justify-between h-40 group hover:border-emerald-500/30 transition-all cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <Plus className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div>
                                <h4 className="text-3xl font-bold text-slate-900">4 Aktive</h4>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Laufende Projekte</p>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder Table for Projects or Invoices */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" /> Letzte Rechnungen
                            </h3>
                            <button className="text-xs font-bold text-indigo-600 hover:underline">Alle ansehen</button>
                        </div>
                        <div className="p-0">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">REC-2024-00{i}</p>
                                            <p className="text-xs font-medium text-slate-400">1{i}. Januar 2024</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900">1.200,00 €</p>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Bezahlt</p>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Download className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    <div className="glass-card p-6 space-y-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-500" /> Aktivitäten Log
                        </h3>
                        <div className="space-y-6">
                            {[
                                { date: "Heute, 14:20", task: "Rechnung erstellt", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
                                { date: "Gestern", task: "Stammdaten geändert", icon: Edit2, color: "text-amber-500", bg: "bg-amber-50" },
                                { date: "12. Jan 2024", task: "Projekt abgeschlossen", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50" }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {i < 2 && <div className="absolute left-[19px] top-10 w-0.5 h-6 bg-slate-100" />}
                                    <div className={cn("h-10 w-10 flex items-center justify-center rounded-xl", item.bg)}>
                                        <item.icon className={cn("h-5 w-5", item.color)} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{item.task}</p>
                                        <p className="text-xs font-medium text-slate-400">{item.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-primary-gradient relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-white font-bold text-lg">Notizen</h3>
                            <p className="text-white/80 text-sm leading-relaxed italic">
                                "{customer.notes || 'Keine speziellen Notizen vorhanden.'}"
                            </p>
                            <button className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-2">
                                <Plus className="h-4 w-4" /> Notiz hinzufügen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
