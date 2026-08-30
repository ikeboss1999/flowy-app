"use client";

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';

type AuditRow = { id: string; created_at: string; action: string; target_type?: string; target_id?: string; developer_email?: string; details?: Record<string, unknown> };

const actionNames: Record<string, string> = {
    'billing.updated': 'Zahlung aktualisiert', 'tenant.suspended': 'Firmenkonto gesperrt',
    'tenant.unsuspended': 'Firmenkonto entsperrt', 'session.revoked': 'Sitzung beendet',
    'tenant.sessions_revoked': 'Alle Sitzungen beendet', 'usage.refreshed': 'Nutzung aktualisiert',
    'backup.restore_started': 'Wiederherstellung gestartet', 'backup.restored': 'Backup wiederhergestellt',
    'backup.action_failed': 'Backup-Aktion fehlgeschlagen', 'backup.extended': 'Backup verlängert',
    'backup.deleted_permanently': 'Backup endgültig gelöscht',
};
const actionName = (action: string) => actionNames[action] || action.replaceAll('.', ' › ');

export default function AuditPage() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [action, setAction] = useState('all');
    const [expanded, setExpanded] = useState('');
    const load = async () => { setLoading(true); setError(''); try { const response = await fetch('/api/admin/control-center?section=audit', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setRows(payload); } catch (err) { setError(err instanceof Error ? err.message : 'Audit-Protokoll konnte nicht geladen werden.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);
    const actions = useMemo(() => Array.from(new Set(rows.map(row => row.action))).sort(), [rows]);
    const filtered = useMemo(() => rows.filter(row => (action === 'all' || row.action === action) && `${actionName(row.action)} ${row.developer_email || ''} ${row.target_type || ''} ${row.target_id || ''}`.toLowerCase().includes(search.toLowerCase())), [rows, action, search]);

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">Audit-Protokoll</h1><p className="mt-2 text-sm font-medium text-slate-500">Nachvollziehbare Entwickleraktionen an Konten, Zahlungen und Backups.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren</button></header>
        <AdminNav />
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">{error}</div>}
        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Aktion, Entwickler oder Ziel suchen …" className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm" /></div><select value={action} onChange={event => setAction(event.target.value)} className="rounded-xl border px-4 py-2.5 text-sm font-bold"><option value="all">Alle Aktionen</option>{actions.map(value => <option key={value} value={value}>{actionName(value)}</option>)}</select></div>
        <div className="space-y-3">{filtered.map(row => <article key={row.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><button onClick={() => setExpanded(expanded === row.id ? '' : row.id)} className="grid w-full items-center gap-4 p-5 text-left md:grid-cols-[auto_1.4fr_1fr_1fr_auto]"><ShieldCheck className="h-5 w-5 text-indigo-500" /><div><p className="font-black text-slate-900">{actionName(row.action)}</p><p className="text-xs text-slate-400">{row.action}</p></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Entwickler</p><p className="mt-1 text-sm text-slate-700">{row.developer_email || 'Unbekannt'}</p></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Zeitpunkt</p><p className="mt-1 text-sm text-slate-700">{new Date(row.created_at).toLocaleString('de-AT')}</p></div>{expanded === row.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{expanded === row.id && <div className="grid gap-4 border-t bg-slate-50 p-5 md:grid-cols-2"><div><p className="text-xs font-black uppercase text-slate-400">Ziel</p><p className="mt-2 break-all text-sm font-medium">{row.target_type || '–'} · {row.target_id || '–'}</p></div><div><p className="text-xs font-black uppercase text-slate-400">Details</p><pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(row.details || {}, null, 2)}</pre></div></div>}</article>)}{!loading && filtered.length === 0 && <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-400">Keine passenden Einträge vorhanden.</div>}</div>
    </div>;
}
