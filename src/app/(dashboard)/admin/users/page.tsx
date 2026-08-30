"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useNotification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface UserRow {
    id: string; companyOwnerId: string; email: string; name: string; companyName: string; role: string; status: string;
    createdAt: string; lastSignInAt: string | null; lastSeenAt: string | null; verified: boolean;
    billing: null | { plan_name: string; payment_status: string; price_amount: number };
    access: null | { is_suspended: boolean; suspension_reason?: string; suspended_at?: string };
}

export default function UserManagement() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'companies' | 'employees' | 'suspended'>('companies');
    const { showPrompt, showConfirm, showToast } = useNotification();
    const load = async () => {
        setLoading(true);
        try { const response = await fetch('/api/admin/control-center?section=users', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); setUsers(payload); }
        catch (error) { showToast(error instanceof Error ? error.message : 'Nutzer konnten nicht geladen werden.', 'error'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const rows = useMemo(() => users.filter(user => {
        if (user.role === 'developer') return false;
        const owner = user.id === user.companyOwnerId;
        if (filter === 'companies' && !owner) return false;
        if (filter === 'employees' && owner) return false;
        if (filter === 'suspended' && !user.access?.is_suspended) return false;
        const haystack = `${user.name} ${user.companyName} ${user.email}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
    }), [users, filter, search]);

    const setSuspension = async (user: UserRow, suspended: boolean, reason?: string) => {
        const response = await fetch('/api/admin/control-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyOwnerId: user.companyOwnerId, suspended, reason: reason || null }) });
        const payload = await response.json();
        if (!response.ok) { showToast(payload.message || 'Aktion fehlgeschlagen.', 'error'); return; }
        showToast(suspended ? 'Firmenkonto wurde gesperrt.' : 'Firmenkonto wurde entsperrt.', 'success');
        load();
    };

    const suspend = (user: UserRow) => showPrompt({ title: 'Firmenkonto sperren', message: `Alle Zugriffe von ${user.companyName || user.name} und seinen Mitarbeitern werden blockiert. Bitte gib einen Grund an.`, placeholder: 'z. B. Zahlung überfällig', confirmLabel: 'Konto sperren', onConfirm: value => { if (!value.trim()) { showToast('Ein Sperrgrund ist erforderlich.', 'error'); return; } setSuspension(user, true, value.trim()); } });
    const unsuspend = (user: UserRow) => showConfirm({ title: 'Firmenkonto entsperren', message: `${user.companyName || user.name} und alle Mitarbeiter erhalten wieder Zugriff auf FlowY.`, confirmLabel: 'Entsperren', onConfirm: () => setSuspension(user, false), variant: 'primary' });

    return <div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
        <header><h1 className="text-4xl font-black tracking-tight text-slate-950">Firmen & Nutzer</h1><p className="mt-2 text-sm font-medium text-slate-500">Konten, Rollen, Zahlungsstatus und Zugriffsstatus kontrollieren.</p></header>
        <AdminNav />
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2">{([['companies','Firmenkonten'],['employees','Mitarbeiter'],['suspended','Gesperrt']] as const).map(item => <button key={item[0]} onClick={() => setFilter(item[0])} className={cn('rounded-xl px-4 py-2.5 text-sm font-bold', filter === item[0] ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}>{item[1]}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Firma, Name oder E-Mail suchen..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none lg:w-80" /></div></div>
        {filter !== 'employees' && rows.length > 0 && <div className="flex flex-wrap gap-2">{rows.filter(user => user.id === user.companyOwnerId).map(user => <Link key={user.id} href={`/admin/users/${user.companyOwnerId}`} className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">Mandantenakte: {user.companyName || user.name}</Link>)}</div>}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead className="border-b bg-slate-50"><tr>{['Firma / Nutzer','Rolle','Aktivität','Tarif & Zahlung','Zugriff','Aktionen'].map(label => <th key={label} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(user => { const suspended = !!user.access?.is_suspended; return <tr key={user.id} className={cn('hover:bg-slate-50/60', suspended && 'bg-rose-50/40')}><td className="px-6 py-5"><div className="flex items-center gap-3"><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl font-black', suspended ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600')}>{(user.companyName || user.name || user.email)[0]?.toUpperCase()}</div><div><p className="font-black text-slate-900">{user.companyName || user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td><td className="px-6 py-5 text-sm font-bold text-slate-600">{user.role}</td><td className="px-6 py-5"><p className="text-sm font-bold text-slate-700">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('de-AT') : 'Noch nicht erfasst'}</p><p className="mt-1 text-xs text-slate-400">Letzter Login: {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString('de-AT') : '–'}</p></td><td className="px-6 py-5"><p className="text-sm font-bold text-slate-800">{user.billing?.plan_name || 'Nicht konfiguriert'}</p><p className={cn('mt-1 text-xs font-bold', ['overdue','failed'].includes(user.billing?.payment_status || '') ? 'text-rose-600' : 'text-slate-400')}>{user.billing?.payment_status || 'Zahlung unbekannt'}{user.billing ? ` · ${Number(user.billing.price_amount).toFixed(2)} €` : ''}</p></td><td className="px-6 py-5">{suspended ? <div><span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700"><ShieldAlert className="h-3.5 w-3.5" /> Gesperrt</span><p className="mt-2 max-w-xs truncate text-xs text-rose-500" title={user.access?.suspension_reason}>{user.access?.suspension_reason}</p></div> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Aktiv</span>}</td><td className="px-6 py-5"><div className="flex gap-2"><Link href={`/admin/explorer?userId=${user.companyOwnerId}`} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-indigo-600" title="Daten ansehen"><ExternalLink className="h-4 w-4" /></Link>{user.id === user.companyOwnerId && (suspended ? <button onClick={() => unsuspend(user)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Entsperren</button> : <button onClick={() => suspend(user)} className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white"><Ban className="h-3.5 w-3.5" /> Sperren</button>)}</div></td></tr>; })}{!loading && rows.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">Keine passenden Konten gefunden.</td></tr>}</tbody></table></div></div>
    </div>;
}
