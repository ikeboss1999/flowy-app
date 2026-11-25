import type { ReactNode } from 'react';
import { INCOMING_FEATURE_ENABLED } from '@/lib/incoming-feature';

export default function IncomingInvoicesLayout({ children }: { children: ReactNode }) {
    if (INCOMING_FEATURE_ENABLED) return children;
    return <div className="dashboard-page flex min-h-[60vh] items-center justify-center px-4"><section className="w-full max-w-2xl rounded-[2rem] border border-indigo-100 bg-white p-8 text-center shadow-xl shadow-indigo-100/50 sm:p-12"><span className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600">In Arbeit</span><h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Eingangsrechnungen</h1><p className="mt-4 text-base leading-relaxed text-slate-600">Dieser Bereich wird gerade vorbereitet und ist noch nicht verfügbar. Wir informieren dich, sobald er freigeschaltet wird.</p></section></div>;
}
