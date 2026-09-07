"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock3, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface LicenseResponse { assigned: boolean; billing?: { payment_status: string; plan_name: string; trial_started_at?: string; trial_ends_at?: string }; plan?: { name: string } | null }

export function TrialNotice() {
    const [license, setLicense] = useState<LicenseResponse | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const { signOut } = useAuth();
    useEffect(() => {
        let active = true;
        const load = () => fetch('/api/license', { cache: 'no-store' }).then(async response => { if (active && response.ok) setLicense(await response.json()); }).catch(() => undefined);
        void load();
        const interval = window.setInterval(load, 10_000);
        return () => { active = false; window.clearInterval(interval); };
    }, []);
    // Historical trial dates may remain on a billing record after an admin
    // unlocks or converts the account. Only an active `trial` status should
    // ever show (or block with) the trial notice.
    if (!license?.assigned || license.billing?.payment_status !== 'trial' || !license.billing.trial_started_at || !license.billing.trial_ends_at) return null;
    const end = new Date(license.billing.trial_ends_at);
    const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
    const expired = end.getTime() <= Date.now();
    if (expired) return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md"><div className="w-full max-w-lg rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><AlertTriangle className="h-7 w-7" /></div><h2 className="mt-5 text-2xl font-black text-slate-950">Ihre Testphase ist beendet</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">Der Testzeitraum für das Paket {license.plan?.name || license.billing.plan_name} ist abgelaufen oder wurde beendet. Bitte wenden Sie sich an FlowY, um Ihren Zugang freizuschalten.</p><button onClick={() => signOut().then(() => { window.location.href = '/login?reason=trial-expired'; })} className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Zur Anmeldung</button></div></div>;
    if (dismissed || license.billing.payment_status !== 'trial') return null;
    if (days > 7) return null;
    const today = days === 0;
    return <div className={cn('mx-4 mt-4 flex flex-col gap-3 rounded-2xl border px-5 py-4 shadow-sm sm:mx-6 lg:flex-row lg:items-center lg:justify-between', expired ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950')}>
        <div className="flex items-start gap-3">{expired ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /> : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}<div><p className="text-sm font-black">{expired ? 'Ihre FlowY-Testphase ist abgelaufen' : today ? 'Ihre FlowY-Testphase endet heute' : `Noch ${days} Tag${days === 1 ? '' : 'e'} in Ihrer FlowY-Testphase`}</p><p className="mt-1 text-xs font-medium opacity-70">Paket {license.plan?.name || license.billing.plan_name}. Der Zugang bleibt derzeit bestehen; wenden Sie sich für die weitere Nutzung an FlowY.</p></div></div>
        <div className="flex items-center gap-2 pl-8 lg:pl-0"><Link href="/settings" className="rounded-xl bg-white px-4 py-2 text-xs font-black shadow-sm">Lizenz ansehen</Link><button onClick={() => setDismissed(true)} className="rounded-xl p-2 opacity-60 hover:bg-white hover:opacity-100" aria-label="Hinweis schließen"><X className="h-4 w-4" /></button></div>
    </div>;
}
