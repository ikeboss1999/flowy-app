"use client";

import { useEffect, useState } from 'react';
import { ArchiveRestore, ChevronDown, ChevronUp, Clock3, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useNotification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface BackupRow {
    id: string; owner_email: string; status: string; created_at: string; expires_at: string;
    file_count: number; total_bytes: number; table_counts: Record<string, number>; failure_reason?: string;
}

const size = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export default function BackupsPage() {
    const [backups, setBackups] = useState<BackupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [expanded, setExpanded] = useState('');
    const { showPrompt, showToast } = useNotification();
    const load = async () => {
        setLoading(true);
        try { const response = await fetch('/api/admin/control-center?section=backups', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setBackups(payload); }
        catch (error) { showToast(error instanceof Error ? error.message : 'Backups konnten nicht geladen werden.', 'error'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const action = async (backup: BackupRow, body: Record<string, unknown>) => {
        setBusy(backup.id);
        try {
            const response = await fetch(`/api/admin/backups/${backup.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Aktion fehlgeschlagen.');
            if (body.action === 'restore') showToast(payload.result?.passwordResetSent ? 'Konto vollständig wiederhergestellt. Passwort-E-Mail wurde versendet.' : 'Konto wiederhergestellt. Passwort-E-Mail muss manuell ausgelöst werden.', payload.result?.passwordResetSent ? 'success' : 'info');
            else showToast('Backup-Aufbewahrung wurde verlängert.', 'success');
            load();
        } catch (error) { showToast(error instanceof Error ? error.message : 'Aktion fehlgeschlagen.', 'error'); }
        finally { setBusy(''); }
    };

    const restore = (backup: BackupRow) => showPrompt({ title: 'Konto wiederherstellen', message: `Für ${backup.owner_email} wird ein neues Auth-Konto erstellt und das vollständige Backup eingespielt. Tippe WIEDERHERSTELLEN.`, placeholder: 'WIEDERHERSTELLEN', confirmLabel: 'Wiederherstellen', onConfirm: value => { if (value !== 'WIEDERHERSTELLEN') { showToast('Bestätigung stimmt nicht überein.', 'error'); return; } action(backup, { action: 'restore', confirmation: value }); } });
    const extend = (backup: BackupRow) => showPrompt({ title: 'Aufbewahrung verlängern', message: 'Um wie viele Tage soll das Backup verlängert werden? Maximal 30 Tage pro Vorgang.', placeholder: '30', initialValue: '30', confirmLabel: 'Verlängern', onConfirm: value => { const days = Number(value); if (!Number.isInteger(days) || days < 1 || days > 30) { showToast('Bitte 1 bis 30 Tage eingeben.', 'error'); return; } action(backup, { action: 'extend', days }); } });
    const remove = (backup: BackupRow) => showPrompt({ title: 'Backup endgültig löschen', message: `Das Backup von ${backup.owner_email} kann danach nicht wiederhergestellt werden. Tippe ENDGÜLTIG LÖSCHEN.`, placeholder: 'ENDGÜLTIG LÖSCHEN', confirmLabel: 'Endgültig löschen', onConfirm: async value => { if (value !== 'ENDGÜLTIG LÖSCHEN') { showToast('Bestätigung stimmt nicht überein.', 'error'); return; } setBusy(backup.id); try { const response = await fetch(`/api/admin/backups/${backup.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: value }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); showToast('Backup wurde endgültig gelöscht.', 'success'); load(); } catch (error) { showToast(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.', 'error'); } finally { setBusy(''); } } });

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10"><header className="flex items-end justify-between"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">Sicherungsbackups</h1><p className="mt-2 text-sm font-medium text-slate-500">Verschlüsselte Backups prüfen, verlängern, wiederherstellen oder endgültig löschen.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Aktualisieren</button></header><AdminNav /><div className="space-y-4">{backups.map(backup => { const ready = backup.status === 'ready'; const days = Math.max(0, Math.ceil((new Date(backup.expires_at).getTime() - Date.now()) / 86400000)); return <article key={backup.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><ArchiveRestore className="h-6 w-6" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-black text-slate-900">{backup.owner_email || 'Unbekanntes Konto'}</p><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', ready ? 'bg-emerald-50 text-emerald-700' : backup.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{backup.status}</span></div><p className="mt-1 text-xs font-mono text-slate-400">{backup.id}</p></div></div><div className="grid grid-cols-3 gap-6 text-sm"><div><p className="text-xs font-bold text-slate-400">Ablauf</p><p className="mt-1 flex items-center gap-1 font-black text-slate-700"><Clock3 className="h-3.5 w-3.5" /> {days} Tage</p></div><div><p className="text-xs font-bold text-slate-400">Dateien</p><p className="mt-1 font-black text-slate-700">{backup.file_count}</p></div><div><p className="text-xs font-bold text-slate-400">Größe</p><p className="mt-1 font-black text-slate-700">{size(Number(backup.total_bytes || 0))}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={() => setExpanded(expanded === backup.id ? '' : backup.id)} className="rounded-xl border p-3 text-slate-500">{expanded === backup.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{ready && <><button onClick={() => extend(backup)} disabled={busy === backup.id} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Verlängern</button><button onClick={() => restore(backup)} disabled={busy === backup.id} className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white"><ShieldCheck className="h-4 w-4" /> Wiederherstellen</button></>}<button onClick={() => remove(backup)} disabled={busy === backup.id || backup.status === 'restore_pending'} className="rounded-xl bg-rose-50 p-3 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div>{expanded === backup.id && <div className="border-t bg-slate-50/60 p-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(backup.table_counts || {}).sort(([a],[b]) => a.localeCompare(b)).map(([table,count]) => <div key={table} className="flex justify-between rounded-xl border bg-white px-4 py-3 text-xs"><span className="font-mono text-slate-500">{table}</span><span className="font-black text-slate-800">{count}</span></div>)}</div>{backup.failure_reason && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">Letzter Hinweis: {backup.failure_reason}</p>}</div>}</article>; })}{!loading && backups.length === 0 && <div className="rounded-3xl border border-dashed bg-white py-20 text-center text-sm text-slate-400">Keine Backups vorhanden.</div>}</div></div>;
}
