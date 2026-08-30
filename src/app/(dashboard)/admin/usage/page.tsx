"use client";

import { useEffect, useMemo, useState } from 'react';
import { Archive, BriefcaseBusiness, FileText, HardDrive, RefreshCw, Search, Users } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useNotification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface UsageRow {
    companyOwnerId: string; companyName: string; email: string; planName: string; suspended: boolean;
    snapshot: null | { counts: Record<string, number>; storage_bytes: number; storage_files: number; calculated_at: string; calculation_ms: number; last_error?: string };
}

const formatBytes = (bytes: number) => {
    if (!bytes) return '0 MB';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

export default function UsagePage() {
    const [rows, setRows] = useState<UsageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState('');
    const [search, setSearch] = useState('');
    const { showToast } = useNotification();
    const load = async () => {
        setLoading(true);
        try { const response = await fetch('/api/admin/control-center?section=usage', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setRows(payload); }
        catch (error) { showToast(error instanceof Error ? error.message : 'Nutzung konnte nicht geladen werden.', 'error'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const refresh = async (row: UsageRow) => {
        setRefreshing(row.companyOwnerId);
        try { const response = await fetch('/api/admin/control-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh_usage', companyOwnerId: row.companyOwnerId }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); showToast(`Nutzung von ${row.companyName} wurde aktualisiert.`, 'success'); await load(); }
        catch (error) { showToast(error instanceof Error ? error.message : 'Aktualisierung fehlgeschlagen.', 'error'); }
        finally { setRefreshing(''); }
    };

    const filtered = useMemo(() => rows.filter(row => `${row.companyName} ${row.email} ${row.planName}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
    const totals = rows.reduce((result, row) => ({
        storage: result.storage + Number(row.snapshot?.storage_bytes || 0),
        files: result.files + Number(row.snapshot?.storage_files || 0),
        projects: result.projects + Number(row.snapshot?.counts.projects || 0),
        employees: result.employees + Number(row.snapshot?.counts.employees || 0),
    }), { storage: 0, files: 0, projects: 0, employees: 0 });

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
        <header><h1 className="text-4xl font-black tracking-tight text-slate-950">Speicher & Nutzung</h1><p className="mt-2 text-sm font-medium text-slate-500">Täglich berechnete, belastungsarme Nutzungswerte je Firmenkonto.</p></header>
        <AdminNav />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: 'Storage gesamt', value: formatBytes(totals.storage), detail: `${totals.files} Dateien`, icon: HardDrive },
            { label: 'Projekte', value: totals.projects, detail: 'über alle Mandanten', icon: BriefcaseBusiness },
            { label: 'Mitarbeiter', value: totals.employees, detail: 'angelegte Datensätze', icon: Users },
            { label: 'Snapshots', value: rows.filter(row => row.snapshot).length, detail: `von ${rows.length} Firmen`, icon: Archive },
        ].map(card => <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><card.icon className="h-5 w-5 text-indigo-500" /><p className="mt-5 text-xs font-black uppercase tracking-widest text-slate-400">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs font-medium text-slate-500">{card.detail}</p></article>)}</section>
        <div className="flex justify-end"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Firma, E-Mail oder Tarif suchen..." className="w-80 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none" /></div></div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1350px] text-left"><thead className="border-b bg-slate-50"><tr>{['Firma','Kunden','Projekte','Dokumente','Mitarbeiter','Zeiteinträge','Bautagebuch','Storage','Berechnet',''].map(label => <th key={label} className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(row => { const c = row.snapshot?.counts || {}; const documents = Number(c.offers || 0) + Number(c.orders || 0) + Number(c.invoices || 0); return <tr key={row.companyOwnerId} className={cn('hover:bg-slate-50/60', row.suspended && 'bg-rose-50/30')}><td className="px-5 py-5"><p className="font-black text-slate-900">{row.companyName}</p><p className="text-xs text-slate-500">{row.email} · {row.planName}</p></td>{[c.customers,c.projects,documents,c.employees,c.time_entries,c.project_diary_entries].map((value,index) => <td key={index} className="px-5 py-5 text-sm font-black tabular-nums text-slate-700">{row.snapshot ? Number(value || 0) : '–'}</td>)}<td className="px-5 py-5"><p className="font-black text-slate-800">{row.snapshot ? formatBytes(Number(row.snapshot.storage_bytes)) : '–'}</p><p className="text-xs text-slate-400">{row.snapshot ? `${row.snapshot.storage_files} Dateien` : 'Noch nicht berechnet'}</p></td><td className="px-5 py-5"><p className="text-sm font-bold text-slate-700">{row.snapshot ? new Date(row.snapshot.calculated_at).toLocaleString('de-AT') : 'Ausstehend'}</p>{row.snapshot?.last_error && <p className="mt-1 max-w-xs truncate text-xs text-rose-600" title={row.snapshot.last_error}>{row.snapshot.last_error}</p>}</td><td className="px-5 py-5"><button onClick={() => refresh(row)} disabled={refreshing === row.companyOwnerId} className="rounded-xl border border-slate-200 p-3 text-slate-500 hover:text-indigo-600 disabled:opacity-50" title="Diesen Mandanten aktualisieren"><RefreshCw className={cn('h-4 w-4', refreshing === row.companyOwnerId && 'animate-spin')} /></button></td></tr>; })}{!loading && filtered.length === 0 && <tr><td colSpan={10} className="py-16 text-center text-sm text-slate-400">Keine Firmenkonten gefunden.</td></tr>}</tbody></table></div></div>
        <p className="flex items-center gap-2 text-xs font-medium text-slate-400"><FileText className="h-3.5 w-3.5" /> Dokumente entsprechen Angeboten + Aufträgen + Rechnungen. Die tägliche Berechnung läuft sequenziell und überträgt keine Geschäftsdaten.</p>
    </div>;
}
