"use client";

import React from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    FileText,
    Users,
    Briefcase,
    Clock,
    CheckCircle2,
    ShieldCheck,
    Smartphone,
    Layout,
    Plus,
    Share
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/useDevice';
import { PartnerLogos } from '@/components/PartnerLogos';

export default function WelcomePage() {
    const { isIPad, isMobile } = useDevice();

    return (
        <div className="min-h-screen bg-[#020205] text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse focus-within:duration-1000" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto backdrop-blur-md bg-white/[0.02] border-b border-white/5 sticky top-0 pt-[env(safe-area-inset-top,1.5rem)]">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <img src="/logo.png" alt="FlowY Logo" className="h-14 w-14 p-1.5 bg-white/10 rounded-2xl shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex flex-col">
                        <span className="text-3xl font-black tracking-tighter uppercase font-outfit leading-none">FlowY</span>
                        <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase opacity-70">Professional</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-xs md:text-sm font-bold text-white/60 hover:text-white transition-colors">
                        Anmelden
                    </Link>
                    <Link href="/login?mode=register" className="bg-white text-black px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                        Starten
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {isIPad ? (
                            <><Layout className="h-3 w-3" /> Optimiert für iPad</>
                        ) : isMobile ? (
                            <><Smartphone className="h-3 w-3" /> Optimiert für Mobilgeräte</>
                        ) : (
                            <><Smartphone className="h-3 w-3" /> NEU: Jetzt auch als Desktop App</>
                        )}
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.2] md:leading-[1.3] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 px-4">
                        Die Zukunft des <br />
                        <span className="inline-block py-2 md:py-4 px-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Baugewerbes</span>
                    </h1>
                    <p className="text-base md:text-2xl text-white/50 max-w-3xl mx-auto leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200 px-6">
                        Verwalten Sie Rechnungen, Projekte und Mitarbeiter an einem zentralen Ort.
                        Modern und für Profis entwickelt.
                    </p>

                    <div className="flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
                        {/* Primary Web Action */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full px-6">
                            <Link href="/login?mode=register" className="group bg-gradient-to-r from-indigo-600 to-purple-600 px-8 md:px-10 py-4 md:py-5 rounded-[2rem] text-lg md:text-xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                                Kostenlos Registrieren <ArrowRight className="h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/login" className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 md:px-10 py-4 md:py-5 rounded-[2rem] text-lg md:text-xl font-black hover:bg-white/10 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                                Zum Login
                            </Link>
                        </div>

                        {/* Secondary Desktop/iPad Action */}
                        <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/5 w-full max-w-lg">
                            {isIPad ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">
                                        <Layout className="h-4 w-4" />
                                        App zum Home-Bildschirm hinzufügen
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
                                                <Share className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <span className="text-xs font-bold text-white/70">1. Share Icon tippen</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
                                                <Plus className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <span className="text-xs font-bold text-white/70">2. "Zum Home-Bildschirm"</span>
                                        </div>
                                    </div>
                                </div>
                            ) : !isMobile ? (
                                <>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">
                                        <Smartphone className="h-3 w-3" />
                                        Verfügbar für Windows
                                    </div>
                                    <a
                                        href="https://github.com/ikeboss1999/flowy-app/releases/latest/download/FlowY-Setup.exe"
                                        download="FlowY-Setup.exe"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-black uppercase tracking-widest text-white/90">Desktop App laden</span>
                                            <span className="text-[10px] text-white/30 font-medium">FlowY-Setup.exe • Direkt-Download</span>
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                            <ArrowRight className="h-5 w-5 text-indigo-400 rotate-90" />
                                        </div>
                                    </a>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Preview */}
            <section className="relative z-10 py-32 px-6 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileText className="h-7 w-7 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Rechnungen</h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                Erstellen Sie professionelle Rechnungen in Sekunden. GoBD-konform und automatisiert.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> PDF-Export
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mahnwesen
                                </li>
                            </ul>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2 lg:scale-105 lg:bg-white/[0.05] lg:border-white/10 shadow-2xl shadow-indigo-500/5">
                            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="h-7 w-7 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Personal</h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                Digitale Akten für alle Mitarbeiter. Dokumente, Termine und Stunden zentral im Griff.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Digitale Akten
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Urlaubsplaner
                                </li>
                            </ul>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Briefcase className="h-7 w-7 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Projekte</h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                Kalkulation und Management Ihrer Baustellen. Fortschrittsanalyse in Echtzeit.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Baustellen-Tagebuch
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Projekt-Archiv
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="relative z-10 py-20 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-wrap items-center justify-center gap-20 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8" />
                            <span className="text-xl font-bold">Safe & Secure</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8" />
                            <span className="text-xl font-bold">24/7 Availability</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Layout className="h-8 w-8" />
                            <span className="text-xl font-bold">Professional Tools</span>
                        </div>
                    </div>

                    <PartnerLogos />
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-32 px-6">
                <div className="max-w-4xl mx-auto rounded-[3rem] bg-indigo-600 shadow-2xl shadow-indigo-600/20 p-16 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-700 to-purple-700 opacity-90" />
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black mb-6">Bereit für den nächsten Schritt?</h2>
                        <p className="text-base md:text-xl text-white/80 mb-10 max-w-xl mx-auto font-medium">
                            Schließen Sie sich hunderten zufriedenen Bauunternehmen an und digitalisieren Sie Ihren Workflow.
                        </p>
                        <Link href="/login?mode=register" className="bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black hover:bg-white/90 transition-all hover:scale-105 active:scale-95 inline-block">
                            Gratis Account erstellen
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 border-t border-white/5 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40 text-xs font-bold uppercase tracking-widest text-center md:text-left">
                    <span>© 2026 FlowY Professional. Alle Rechte vorbehalten.</span>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white transition-colors">Impressum</a>
                        <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
                        <a href="#" className="hover:text-white transition-colors">Preise</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
