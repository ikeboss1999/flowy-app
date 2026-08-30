"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { AdminNav } from './AdminNav';

type Section = 'sessions' | 'backups' | 'audit' | 'system';
type Row = Record<string, unknown>;

const config: Record<Exclude<Section, 'system'>, { title: string; description: string; columns: Array<{ key: string; label: string }> }> = {
    sessions: { title: 'Aktive Sitzungen', description: 'Web- und Mitarbeiteraktivität mit zuletzt gesehenem Zeitpunkt.', columns: [{ key: 'name', label: 'Nutzer' }, { key: 'email', label: 'E-Mail' }, { key: 'app_source', label: 'App' }, { key: 'last_seen_at', label: 'Zuletzt aktiv' }, { key: 'isActive', label: 'Status' }] },
    backups: { title: 'Sicherungsbackups', description: 'Verschlüsselte 30-Tage-Backups gelöschter Mandanten.', columns: [{ key: 'owner_email', label: 'Ursprünglicher Nutzer' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Erstellt' }, { key: 'expires_at', label: 'Endgültige Löschung' }, { key: 'file_count', label: 'Dateien' }, { key: 'total_bytes', label: 'Größe' }] },
    audit: { title: 'Audit-Protokoll', description: 'Nachvollziehbare Entwickleraktionen an Konten und Abrechnung.', columns: [{ key: 'created_at', label: 'Zeitpunkt' }, { key: 'action', label: 'Aktion' }, { key: 'target_type', label: 'Zieltyp' }, { key: 'target_id', label: 'Ziel' }, { key: 'developer_user_id', label: 'Entwickler' }] },
};

function valueFor(key: string, value: unknown) {
    if (key === 'total_bytes') return `${(Number(value || 0) / 1024 / 1024).toFixed(1)} MB`;
    if (key.endsWith('_at') && value) return new Date(String(value)).toLocaleString('de-AT');
    if (key === 'isActive') return value ? 'Aktiv' : 'Inaktiv';
    if (typeof value === 'object' && value) return JSON.stringify(value);
    return String(value ?? '–');
}

export function AdminDataView({ section }: { section: Section }) {
    const [data, setData] = useState<Row[] | { checks?: Row[]; checkedAt?: string; responseTimeMs?: number }>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = async () => {
        setLoading(true); setError('');
        try {
            const response = await fetch(`/api/admin/control-center?section=${section}`, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Daten konnten nicht geladen werden.');
            setData(payload);
        } catch (err) { setError(err instanceof Error ? err.message : 'Unbekannter Fehler'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [section]);

    const title = section === 'system' ? 'Systemzustand' : config[section].title;
    const description = section === 'system' ? 'Live-Prüfung zentraler FlowY-Dienste und Konfiguration.' : config[section].description;
    const rows = Array.isArray(data) ? data : (data.checks || []);

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
        <header className="flex items-end justify-between gap-4"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">{title}</h1><p className="mt-2 text-sm font-medium text-slate-500">{description}</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren</button></header>
        <AdminNav />
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">{error}</div>}
        {section === 'system' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row, index) => <article key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{String(row.name)}</h2>{row.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}</div><p className="mt-3 text-sm text-slate-500">{String(row.detail || '')}</p></article>)}</div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr>{config[section].columns.map(column => <th key={column.key} className="whitespace-nowrap px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={String(row.id || index)} className="hover:bg-slate-50/60">{config[section].columns.map(column => <td key={column.key} className="max-w-xs truncate px-6 py-4 text-sm font-medium text-slate-700">{valueFor(column.key, row[column.key])}</td>)}</tr>)}{!loading && rows.length === 0 && <tr><td colSpan={config[section].columns.length} className="px-6 py-16 text-center text-sm text-slate-400">Keine Einträge vorhanden.</td></tr>}</tbody></table></div></div>}
    </div>;
}
