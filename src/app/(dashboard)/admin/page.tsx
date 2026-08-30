"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArchiveRestore, ArrowUpRight, Building2, CheckCircle2, CircleDollarSign, Clock3, Database, HardDrive, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { cn } from '@/lib/utils';

interface AdminStats {
    generatedAt: string;
    responseTimeMs: number;
    totals: { companies: number; authUsers: number; activeSessions: number; invoices: number; customers: number; projects: number; documentRevenue: number; monthlyRecurringRevenue: number };
    billing: { configured: number; paid: number; overdue: number; trial: number; unknown: number };
    backups: { ready: number; failed: number; expiringSoon: number; totalBytes: number };
    recentUsers: Array<{ id: string; name: string; email: string; createdAt: string; lastSignInAt?: string; isNew: boolean }>;
    health: { database: string; auth: string; backupConfiguration: string; activityTracking: string };
}

const money = (value: number) => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
const bytes = (value: number) => value ? `${(value / 1024 / 1024).toFixed(value > 1024 ** 3 ? 0 : 1)} MB` : '0 MB';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/stats', { cache: 'no-store' });
            if (!response.ok) throw new Error('Dashboard-Daten konnten nicht geladen werden.');
            setStats(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
            <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                        <ShieldCheck className="h-4 w-4" /> FlowY Control Center
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">Entwicklerübersicht</h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">Nutzer, Zahlungen, Backups und Systemzustand zentral überwachen.</p>
                </div>
                <button onClick={load} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Aktualisieren
                </button>
            </header>

            <AdminNav />

            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">{error}</div>}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Firmenkonten', value: stats?.totals.companies ?? 0, detail: `${stats?.totals.authUsers ?? 0} Auth-Nutzer`, icon: Building2, tone: 'indigo' },
                    { label: 'Gerade aktiv', value: stats?.totals.activeSessions ?? 0, detail: 'Aktivität in 5 Minuten', icon: Activity, tone: 'emerald' },
                    { label: 'Monatlich wiederkehrend', value: money(stats?.totals.monthlyRecurringRevenue ?? 0), detail: `${stats?.billing.paid ?? 0} zahlende Konten`, icon: CircleDollarSign, tone: 'amber' },
                    { label: 'Sicherungsbackups', value: stats?.backups.ready ?? 0, detail: `${bytes(stats?.backups.totalBytes ?? 0)} verschlüsselt`, icon: ArchiveRestore, tone: 'sky' },
                ].map(card => (
                    <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className={cn('mb-5 flex h-11 w-11 items-center justify-center rounded-2xl', {
                            'bg-indigo-50 text-indigo-600': card.tone === 'indigo', 'bg-emerald-50 text-emerald-600': card.tone === 'emerald',
                            'bg-amber-50 text-amber-600': card.tone === 'amber', 'bg-sky-50 text-sky-600': card.tone === 'sky',
                        })}><card.icon className="h-5 w-5" /></div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                        <p className="mt-2 text-3xl font-black tabular-nums text-slate-950">{loading ? '–' : card.value}</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">{card.detail}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div><h2 className="text-xl font-black text-slate-950">Neue Firmenkonten</h2><p className="mt-1 text-sm text-slate-500">Zuletzt registrierte Mandanten</p></div>
                        <Link href="/admin/users" className="flex items-center gap-1 text-sm font-bold text-indigo-600">Alle ansehen <ArrowUpRight className="h-4 w-4" /></Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {(stats?.recentUsers || []).map(user => (
                            <div key={user.id} className="flex items-center justify-between gap-4 py-4">
                                <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-bold text-slate-900">{user.name}</p>{user.isNew && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-600">Neu</span>}</div><p className="truncate text-sm text-slate-500">{user.email}</p></div>
                                <div className="shrink-0 text-right text-xs text-slate-400"><p>Registriert</p><p className="mt-1 font-bold text-slate-600">{new Date(user.createdAt).toLocaleDateString('de-AT')}</p></div>
                            </div>
                        ))}
                        {!loading && !stats?.recentUsers.length && <p className="py-10 text-center text-sm text-slate-400">Keine Firmenkonten gefunden.</p>}
                    </div>
                </article>

                <article className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl shadow-slate-200">
                    <h2 className="text-xl font-black">Systemzustand</h2>
                    <p className="mt-1 text-sm text-slate-400">Echte Verbindungs- und Konfigurationsprüfungen</p>
                    <div className="mt-6 space-y-3">
                        {[
                            { label: 'Datenbank', status: stats?.health.database, icon: Database },
                            { label: 'Authentifizierung', status: stats?.health.auth, icon: ShieldCheck },
                            { label: 'Backup-System', status: stats?.health.backupConfiguration, icon: HardDrive },
                            { label: 'Aktivitätsmessung', status: stats?.health.activityTracking, icon: Activity },
                        ].map(item => {
                            const healthy = item.status === 'online';
                            return <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-3"><item.icon className="h-4 w-4 text-slate-400" /><span className="text-sm font-bold">{item.label}</span></div><span className={cn('flex items-center gap-1.5 text-xs font-black uppercase', healthy ? 'text-emerald-400' : 'text-amber-300')}>{healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{healthy ? 'Bereit' : 'Einrichtung nötig'}</span></div>;
                        })}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> API-Antwort</span><span className="font-mono">{stats?.responseTimeMs ?? '–'} ms</span></div>
                </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { href: '/admin/billing', label: 'Zahlungen prüfen', value: `${stats?.billing.overdue ?? 0} kritisch`, icon: CircleDollarSign },
                    { href: '/admin/backups', label: 'Backups verwalten', value: `${stats?.backups.expiringSoon ?? 0} laufen bald ab`, icon: ArchiveRestore },
                    { href: '/admin/sessions', label: 'Aktive Sitzungen', value: `${stats?.totals.activeSessions ?? 0} aktiv`, icon: Users },
                    { href: '/admin/usage', label: 'Mandantennutzung', value: `${stats?.totals.projects ?? 0} Projekte`, icon: Activity },
                ].map(item => <Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200"><div><p className="text-sm font-black text-slate-900">{item.label}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.value}</p></div><item.icon className="h-5 w-5 text-slate-300 transition group-hover:text-indigo-500" /></Link>)}
            </section>
        </div>
    );
}
