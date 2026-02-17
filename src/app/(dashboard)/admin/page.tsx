"use client";

import { useEffect, useState } from "react";
import {
    Users,
    FileText,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    UserPlus,
    Activity
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch admin stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-12 animate-pulse space-y-8">
                <div className="h-12 w-64 bg-slate-200 rounded-xl" />
                <div className="grid grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    const cards = [
        { label: "Gesamtbenutzer", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Rechnungen", value: stats?.totalInvoices || 0, icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
        { label: "Kunden", value: stats?.totalCustomers || 0, icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "Gesamtumsatz", value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(stats?.totalRevenue || 0), icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50" },
    ];

    return (
        <div className="p-12 space-y-12">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 font-bold uppercase tracking-widest text-sm">
                        <ShieldCheck className="h-5 w-5" /> Admin Bereich
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Admin Dashboard
                    </h1>
                </div>
                <div className="flex gap-4">
                    <Link href="/admin/explorer" className="bg-primary-gradient text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg transition-all shadow-purple-900/40">
                        <Activity className="h-4 w-4" /> Global Explorer
                    </Link>
                    <Link href="/admin/users" className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
                        Nutzer verwalten <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            {/* Quick Stats */}
            <section className="grid grid-cols-4 gap-8">
                {cards.map((card, i) => (
                    <div key={i} className="glass-card p-10 space-y-6 hover:-translate-y-1 transition-all">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", card.bg)}>
                            <card.icon className={cn("h-7 w-7", card.color)} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                            <h2 className="text-3xl font-black text-slate-900 tabular-nums">{card.value}</h2>
                        </div>
                    </div>
                ))}
            </section>

            <div className="grid grid-cols-3 gap-12">
                {/* Recent Activity / Users */}
                <section className="col-span-2 glass-card p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Activity className="h-6 w-6 text-indigo-500" /> Neue Benutzer
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {stats?.recentUsers?.map((user: any, i: number) => (
                            <div key={i} className="py-5 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                        {user.name?.charAt(0) || user.email.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{user.name || 'Unbekannt'}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-400">Registriert am</p>
                                    <p className="text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="glass-card p-10 space-y-8 bg-primary-gradient relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                    <div className="relative z-10 space-y-6 text-white">
                        <h3 className="text-2xl font-black tracking-tight">System Info</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-white/10">
                                <span className="text-white/60 font-medium">Status</span>
                                <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">Online</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/10">
                                <span className="text-white/60 font-medium">DB Connection</span>
                                <span className="text-white font-bold">Aktiv (SQLite)</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-white/60 font-medium">Auto-Sync</span>
                                <span className="text-white font-bold">Enabled</span>
                            </div>
                        </div>
                        <button className="w-full bg-white/15 hover:bg-white/25 py-4 rounded-2xl font-bold transition-all mt-4 border border-white/10">
                            Systemprotokolle ansehen
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
