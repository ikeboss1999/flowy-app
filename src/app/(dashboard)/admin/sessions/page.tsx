"use client";

import { useEffect, useMemo, useState } from 'react';
import { Laptop, LogOut, RefreshCw, Search, Smartphone } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useNotification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface SessionRow {
    id: string; sessionType: 'web' | 'mobile'; user_id: string; company_owner_id: string; name: string; email: string;
    app_source: string; user_agent?: string; created_at: string; last_seen_at: string; revoked_at?: string; isActive: boolean;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'all' | 'revoked'>('active');
    const [search, setSearch] = useState('');
    const { showConfirm, showToast } = useNotification();
    const load = async () => {
        setLoading(true);
        try { const response = await fetch('/api/admin/control-center?section=sessions', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setSessions(payload); }
        catch (error) { showToast(error instanceof Error ? error.message : 'Sitzungen konnten nicht geladen werden.', 'error'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);
    const rows = useMemo(() => sessions.filter(session => {
        if (filter === 'active' && !session.isActive) return false;
        if (filter === 'revoked' && !session.revoked_at) return false;
        return `${session.name} ${session.email} ${session.user_agent || ''}`.toLowerCase().includes(search.toLowerCase());
    }), [sessions, filter, search]);

    const revoke = (session: SessionRow) => showConfirm({ title: 'Sitzung beenden', message: `Die ${session.sessionType === 'mobile' ? 'Mobile-' : 'Web-'}Sitzung von ${session.name} wird sofort serverseitig widerrufen.`, confirmLabel: 'Sitzung beenden', variant: 'danger', onConfirm: async () => { const response = await fetch('/api/admin/control-center', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke_session', sessionId: session.id, sessionType: session.sessionType }) }); const payload = await response.json(); if (!response.ok) { showToast(payload.message || 'Aktion fehlgeschlagen.', 'error'); return; } showToast('Sitzung wurde beendet.', 'success'); load(); } });
    const revokeTenant = (session: SessionRow) => showConfirm({ title: 'Alle Sitzungen beenden', message: `Alle Web- und Mitarbeiter-App-Sitzungen dieses Firmenkontos werden beendet. Das Konto bleibt aktiv und kann sich anschließend neu anmelden.`, confirmLabel: 'Alle abmelden', variant: 'danger', onConfirm: async () => { const response = await fetch('/api/admin/control-center', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke_tenant_sessions', companyOwnerId: session.company_owner_id }) }); const payload = await response.json(); if (!response.ok) { showToast(payload.message || 'Aktion fehlgeschlagen.', 'error'); return; } showToast('Alle Sitzungen des Firmenkontos wurden beendet.', 'success'); load(); } });

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10"><header className="flex items-end justify-between"><div><h1 className="text-4xl font-black tracking-tight text-slate-950">Sitzungen</h1><p className="mt-2 text-sm font-medium text-slate-500">Web- und Mitarbeiter-App-Zugriffe überwachen und serverseitig beenden.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Aktualisieren</button></header><AdminNav /><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2">{([['active','Aktiv'],['all','Alle'],['revoked','Widerrufen']] as const).map(item => <button key={item[0]} onClick={() => setFilter(item[0])} className={cn('rounded-xl px-4 py-2.5 text-sm font-bold', filter === item[0] ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}>{item[1]}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nutzer oder Gerät suchen..." className="w-80 rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none" /></div></div><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left"><thead className="border-b bg-slate-50"><tr>{['Nutzer','Anwendung & Gerät','Beginn','Letzte Aktivität','Status','Aktionen'].map(label => <th key={label} className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y">{rows.map(session => <tr key={`${session.sessionType}-${session.id}`} className="hover:bg-slate-50/60"><td className="px-6 py-5"><p className="font-black text-slate-900">{session.name}</p><p className="text-xs text-slate-500">{session.email || `Mitarbeiter-ID ${session.user_id}`}</p></td><td className="px-6 py-5"><div className="flex items-center gap-3">{session.sessionType === 'mobile' ? <Smartphone className="h-5 w-5 text-indigo-500" /> : <Laptop className="h-5 w-5 text-sky-500" />}<div><p className="text-sm font-bold text-slate-800">{session.sessionType === 'mobile' ? 'Mitarbeiter-App' : 'FlowY Web'}</p><p className="max-w-sm truncate text-xs text-slate-400" title={session.user_agent}>{session.user_agent || 'Gerät nicht bekannt'}</p></div></div></td><td className="px-6 py-5 text-sm text-slate-600">{new Date(session.created_at).toLocaleString('de-AT')}</td><td className="px-6 py-5 text-sm font-bold text-slate-700">{new Date(session.last_seen_at).toLocaleString('de-AT')}</td><td className="px-6 py-5"><span className={cn('rounded-full px-3 py-1 text-xs font-black', session.revoked_at ? 'bg-rose-50 text-rose-700' : session.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{session.revoked_at ? 'Widerrufen' : session.isActive ? 'Aktiv' : 'Inaktiv'}</span></td><td className="px-6 py-5"><div className="flex gap-2">{!session.revoked_at && <button onClick={() => revoke(session)} className="rounded-xl border border-rose-200 p-2.5 text-rose-600" title="Diese Sitzung beenden"><LogOut className="h-4 w-4" /></button>}<button onClick={() => revokeTenant(session)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white">Alle abmelden</button></div></td></tr>)}{!loading && rows.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">Keine passenden Sitzungen vorhanden.</td></tr>}</tbody></table></div></div><p className="text-xs font-medium text-slate-400">„Aktiv“ bedeutet: innerhalb der letzten fünf Minuten gesehen. „Alle abmelden“ sperrt das Konto nicht; eine spätere Neuanmeldung bleibt möglich.</p></div>;
}
