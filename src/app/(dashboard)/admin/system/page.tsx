"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ServerCog, XCircle } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';

type Check = { name: string; ok: boolean; detail: string };
type Job = { job_name: string; status: 'running' | 'success' | 'failed'; started_at: string; completed_at?: string; result?: Record<string, unknown>; last_error?: string };
type FailedBackup = { id: string; owner_email?: string; failure_reason?: string; created_at: string };
type SystemData = { checkedAt: string; responseTimeMs: number; checks: Check[]; jobs: Job[]; failedBackups: FailedBackup[] };
const jobNames: Record<string, string> = { 'account-backup-cleanup': 'Backup-Bereinigung', 'tenant-usage-refresh': 'Nutzungsstatistik aktualisieren' };

export default function SystemPage() {
    const [data, setData] = useState<SystemData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = async () => { setLoading(true); setError(''); try { const response = await fetch('/api/admin/control-center?section=system', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setData(payload); } catch (err) { setError(err instanceof Error ? err.message : 'Systemzustand konnte nicht geladen werden.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);
    const healthy = data?.checks.filter(check => check.ok).length || 0;

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">Systemzustand</h1><p className="mt-2 text-sm font-medium text-slate-500">Live-Prüfung zentraler FlowY-Dienste, Konfiguration und Hintergrundaufgaben.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren</button></header>
        <AdminNav />
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">{error}</div>}
        {data && <><section className="grid gap-4 md:grid-cols-3"><article className="rounded-3xl border bg-white p-6 shadow-sm"><ServerCog className="h-5 w-5 text-indigo-500" /><p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Prüfungen bestanden</p><p className="mt-2 text-3xl font-black">{healthy} / {data.checks.length}</p></article><article className="rounded-3xl border bg-white p-6 shadow-sm"><Clock3 className="h-5 w-5 text-emerald-500" /><p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Antwortzeit</p><p className="mt-2 text-3xl font-black">{data.responseTimeMs} ms</p></article><article className="rounded-3xl border bg-white p-6 shadow-sm"><AlertTriangle className="h-5 w-5 text-amber-500" /><p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Fehlgeschlagene Backups</p><p className="mt-2 text-3xl font-black">{data.failedBackups.length}</p></article></section>
        <section><h2 className="mb-4 text-xl font-black">Systemprüfungen</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.checks.map(check => <article key={check.name} className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-black">{check.name}</h3>{check.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}</div><p className="mt-3 break-words text-sm text-slate-500">{check.detail}</p></article>)}</div></section>
        <section><h2 className="mb-4 text-xl font-black">Letzte Hintergrundaufgaben</h2><div className="overflow-hidden rounded-3xl border bg-white shadow-sm"><table className="w-full text-left"><thead className="border-b bg-slate-50"><tr>{['Aufgabe','Status','Gestartet','Ergebnis'].map(label => <th key={label} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y">{data.jobs.map(job => <tr key={job.job_name}><td className="px-6 py-4 font-bold">{jobNames[job.job_name] || job.job_name}</td><td className="px-6 py-4 text-sm font-bold">{job.status === 'success' ? 'Erfolgreich' : job.status === 'running' ? 'Läuft' : 'Fehlgeschlagen'}</td><td className="px-6 py-4 text-sm">{new Date(job.started_at).toLocaleString('de-AT')}</td><td className="max-w-md px-6 py-4 text-xs text-slate-500">{job.last_error || JSON.stringify(job.result || {})}</td></tr>)}{data.jobs.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-sm text-slate-400">Noch keine Cron-Ausführung protokolliert.</td></tr>}</tbody></table></div></section>
        {data.failedBackups.length > 0 && <section><h2 className="mb-4 text-xl font-black text-rose-700">Backupfehler</h2><div className="space-y-3">{data.failedBackups.map(backup => <article key={backup.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-black text-rose-900">{backup.owner_email || backup.id}</p><p className="mt-1 text-sm text-rose-700">{backup.failure_reason || 'Kein Fehlergrund gespeichert'} · {new Date(backup.created_at).toLocaleString('de-AT')}</p></article>)}</div></section>}
        <p className="text-right text-xs text-slate-400">Zuletzt geprüft: {new Date(data.checkedAt).toLocaleString('de-AT')}</p></>}
    </div>;
}
