import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function LegalPageLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return <main className="min-h-screen bg-[#020205] px-6 py-10 text-white">
        <div className="fixed inset-0 pointer-events-none overflow-hidden"><div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" /></div>
        <div className="relative mx-auto max-w-4xl">
            <Link href="/welcome" className="inline-flex items-center gap-2 text-sm font-bold text-white/50 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" /> Zurück zu FlowY</Link>
            <header className="mb-10 mt-12 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 md:p-12"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10"><ShieldCheck className="h-7 w-7 text-indigo-400" /></div><h1 className="text-4xl font-black tracking-tight md:text-6xl">{title}</h1><p className="mt-5 max-w-2xl leading-relaxed text-white/50">{subtitle}</p></header>
            <div className="space-y-6 [&_a]:text-indigo-300 [&_a]:underline [&_article]:rounded-3xl [&_article]:border [&_article]:border-white/5 [&_article]:bg-white/[0.03] [&_article]:p-7 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-black [&_li]:text-white/60 [&_p]:leading-relaxed [&_p]:text-white/60 [&_ul]:space-y-2">{children}</div>
            <footer className="mt-12 border-t border-white/5 py-8 text-center text-xs font-bold uppercase tracking-widest text-white/30">© 2026 FlowY Professional</footer>
        </div>
    </main>;
}
