"use client";

import React, { useEffect, useState } from 'react';
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
    Share,
    CalendarDays,
    ContactRound,
    Car,
    BookOpenCheck,
    FolderArchive,
    LockKeyhole,
    BarChart3,
    Mail
} from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';
import { PartnerLogos } from '@/components/PartnerLogos';
import { useAuth } from '@/context/AuthContext';
import siteContent from '../../../content/public-site.json';

type PublicPlan = (typeof siteContent.packages)[number] & { trialDays: number; currency: string };
const fallbackPlans: PublicPlan[] = siteContent.packages.map(plan => ({ ...plan, trialDays: siteContent.trial.days, currency: 'EUR' }));

export default function WelcomePage() {
    const { isIPad, isMobile } = useDevice();
    const { user } = useAuth();
    const [publicPlans, setPublicPlans] = useState<PublicPlan[]>([]);
    const advertisedTrialDays = publicPlans.find(plan => plan.featured)?.trialDays ?? publicPlans[0]?.trialDays ?? siteContent.trial.days;
    const content = { ...siteContent, trial: { ...siteContent.trial, days: advertisedTrialDays }, packages: publicPlans };

    useEffect(() => {
        fetch('/api/public/plans', { cache: 'no-store' })
            .then(async response => { if (!response.ok) throw new Error('Pakete konnten nicht geladen werden'); return response.json(); })
            .then(payload => { if (Array.isArray(payload.plans)) setPublicPlans(payload.plans); })
            .catch(() => setPublicPlans(fallbackPlans));
    }, []);

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
                    <a href="#preise" className="hidden text-sm font-bold text-white/60 transition-colors hover:text-white md:block">Pakete & Preise</a>
                    {user ? (
                        <Link href="/" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs md:text-sm font-black hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20">
                            Zum Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="text-xs md:text-sm font-bold text-white/60 hover:text-white transition-colors">
                                Anmelden
                            </Link>
                            <Link href="/login?mode=register" className="bg-white text-black px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                                Starten
                            </Link>
                        </>
                    )}
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
                            <><Smartphone className="h-3 w-3" /> Für Browser & Mobilgeräte</>
                        )}
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.2] md:leading-[1.3] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 px-4">
                        Die Zukunft des <br />
                        <span className="inline-block py-2 md:py-4 px-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Baugewerbes</span>
                    </h1>
                    <p className="text-base md:text-2xl text-white/50 max-w-3xl mx-auto leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200 px-6">
                        Vom ersten Kundenkontakt bis zur fertigen Rechnung: FlowY verbindet Projekte,
                        Personal, Dokumente und Finanzen in einem modernen Arbeitsbereich.
                    </p>

                    <div className="flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
                        {/* Primary Web Action */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full px-6">
                            {user ? (
                                <Link href="/" className="group bg-gradient-to-r from-indigo-600 to-purple-600 px-8 md:px-12 py-4 md:py-5 rounded-[2rem] text-lg md:text-xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                                    Zum Dashboard gehen <ArrowRight className="h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link href="/login?mode=register" className="group bg-gradient-to-r from-indigo-600 to-purple-600 px-8 md:px-10 py-4 md:py-5 rounded-[2rem] text-lg md:text-xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                                        {content.trial.days} Tage testen <ArrowRight className="h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link href="/login" className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 md:px-10 py-4 md:py-5 rounded-[2rem] text-lg md:text-xl font-black hover:bg-white/10 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                                        Zum Login
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* iPad: Add to Home Screen instructions */}
                        {isIPad && (
                            <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/5 w-full max-w-lg">
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
                                        <span className="text-xs font-bold text-white/70">2. &quot;Zum Home-Bildschirm&quot;</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Features Preview */}
            <section className="relative z-10 py-32 px-6 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Ein System für Ihren Betrieb</p>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Alles, was den Arbeitsalltag verbindet.</h2>
                        <p className="mt-5 text-white/45 max-w-2xl mx-auto leading-relaxed">Weniger Einzellösungen, weniger doppelte Eingaben und jederzeit ein klarer Überblick über Büro und Baustelle.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileText className="h-7 w-7 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Finanzen & Dokumente</h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                Angebote, Aufträge und Rechnungen durchgängig erstellen, versenden und nachvollziehen.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> PDF & E-Mail-Versand
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mahnwesen & Auswertungen
                                </li>
                            </ul>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2 lg:scale-105 lg:bg-white/[0.05] lg:border-white/10 shadow-2xl shadow-indigo-500/5">
                            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="h-7 w-7 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Mitarbeiter & Zeit</h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                Mitarbeiterakten, Dokumente, Berechtigungen und Arbeitszeiten zentral organisieren.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Digitale Mitarbeiterakten
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zeiterfassung & mobile Zugänge
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
                                Projekte, Zahlungspläne, Dateien und Bautagebuch in einer gemeinsamen Projektakte.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zahlungspläne & Projektdateien
                                </li>
                                <li className="flex items-center gap-3 text-sm text-white/60">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Bautagebuch
                                </li>
                            </ul>
                        </div>

                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><ContactRound className="h-7 w-7 text-pink-400" /></div>
                            <h3 className="text-2xl font-bold mb-4">CRM & Kunden</h3>
                            <p className="text-white/40 leading-relaxed mb-6">Anfragen erfassen, Kundeninformationen bündeln und den Weg zum Projekt übersichtlich begleiten.</p>
                            <ul className="space-y-3"><li className="flex items-center gap-3 text-sm text-white/60"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Anfrageverwaltung</li><li className="flex items-center gap-3 text-sm text-white/60"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zentrale Kundenakten</li></ul>
                        </div>

                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookOpenCheck className="h-7 w-7 text-amber-400" /></div>
                            <h3 className="text-2xl font-bold mb-4">Betrieb & Ressourcen</h3>
                            <p className="text-white/40 leading-relaxed mb-6">Leistungen, Fahrzeuge und Termine dort verwalten, wo sie für die tägliche Arbeit gebraucht werden.</p>
                            <ul className="space-y-3"><li className="flex items-center gap-3 text-sm text-white/60"><Car className="h-4 w-4 text-emerald-500" /> Fahrzeugverwaltung</li><li className="flex items-center gap-3 text-sm text-white/60"><CalendarDays className="h-4 w-4 text-emerald-500" /> Kalender & Leistungskatalog</li></ul>
                        </div>

                        <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06] hover:-translate-y-2">
                            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><FolderArchive className="h-7 w-7 text-cyan-400" /></div>
                            <h3 className="text-2xl font-bold mb-4">Sicher organisiert</h3>
                            <p className="text-white/40 leading-relaxed mb-6">Geschäftsdokumente und Zugangsdaten strukturiert aufbewahren und im Team kontrolliert nutzen.</p>
                            <ul className="space-y-3"><li className="flex items-center gap-3 text-sm text-white/60"><FolderArchive className="h-4 w-4 text-emerald-500" /> Dokumentenarchiv</li><li className="flex items-center gap-3 text-sm text-white/60"><LockKeyhole className="h-4 w-4 text-emerald-500" /> Passwortmanager & Benutzerrechte</li></ul>
                        </div>
                    </div>
                </div>
            </section>

            <section id="preise" className="relative z-10 scroll-mt-24 border-t border-white/5 bg-white/[0.01] px-6 py-32">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto mb-16 max-w-3xl text-center"><p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Pakete & Preise</p><h2 className="text-3xl font-black tracking-tight md:text-5xl">Der passende Einstieg für Ihren Betrieb.</h2><p className="mt-5 leading-relaxed text-white/45">Alle Pakete können {content.trial.days} Tage getestet werden. {content.trial.requiresPaymentMethod ? 'Für den Start ist eine Zahlungsmethode erforderlich.' : 'Keine Kreditkarte und keine automatische Verlängerung während der Testphase.'}</p></div>
                    <div className="grid gap-8 lg:grid-cols-3">{content.packages.map(plan => <article key={plan.id} className={`relative flex flex-col rounded-[2.5rem] border p-8 transition-all hover:-translate-y-2 ${plan.featured ? 'border-indigo-400/40 bg-gradient-to-b from-indigo-500/15 to-white/[0.04] shadow-2xl shadow-indigo-600/10 lg:scale-105' : 'border-white/5 bg-white/[0.03]'}`}>{plan.featured && <span className="absolute right-6 top-6 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest">Empfohlen</span>}<h3 className="text-2xl font-black">{plan.name}</h3><p className="mt-4 min-h-20 text-sm leading-relaxed text-white/45">{plan.description}</p><div className="my-7"><span className="text-4xl font-black">{plan.monthlyPrice.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €</span><span className="ml-2 text-sm font-bold text-white/35">/ Monat</span><p className="mt-2 text-xs text-white/30">oder {plan.yearlyPrice.toLocaleString('de-AT', { minimumFractionDigits: 2 })} € jährlich</p></div><ul className="mb-8 flex-1 space-y-3">{plan.features.map(feature => <li key={feature} className="flex items-start gap-3 text-sm text-white/65"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{feature}</li>)}</ul><Link href={`/login?mode=register&plan=${plan.id}`} className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black transition-all hover:scale-[1.02] active:scale-95 ${plan.featured ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-white text-black hover:bg-white/90'}`}>{plan.name} testen <ArrowRight className="h-4 w-4" /></Link></article>)}</div>
                    <div className="mx-auto mt-14 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center"><h3 className="text-xl font-black">{content.trial.headline}</h3><p className="mt-3 text-sm leading-relaxed text-white/45">{content.trial.description}</p></div>
                </div>
            </section>

            <section className="relative z-10 py-24 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <div><p className="text-xs font-black uppercase tracking-[0.3em] text-purple-400 mb-4">Durchgängig arbeiten</p><h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Vom Eingang der Anfrage bis zum Zahlungseingang.</h2><p className="mt-6 text-white/45 leading-relaxed">Informationen fließen durch den gesamten Prozess weiter. Kunden, Projekte, Leistungen und Dokumente müssen nicht für jeden Arbeitsschritt neu erfasst werden.</p></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6"><Mail className="h-6 w-6 text-indigo-400" /><p className="mt-4 font-black">Anfrage & Kunde</p><p className="mt-2 text-sm text-white/40">Kontakte und Anforderungen strukturiert übernehmen.</p></div><div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6"><Briefcase className="h-6 w-6 text-emerald-400" /><p className="mt-4 font-black">Projekt & Ausführung</p><p className="mt-2 text-sm text-white/40">Fortschritt, Dateien und Personal zusammenführen.</p></div><div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6"><FileText className="h-6 w-6 text-amber-400" /><p className="mt-4 font-black">Angebot & Rechnung</p><p className="mt-2 text-sm text-white/40">Geschäftsdokumente aus vorhandenen Daten erstellen.</p></div><div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6"><BarChart3 className="h-6 w-6 text-pink-400" /><p className="mt-4 font-black">Mahnwesen & Auswertung</p><p className="mt-2 text-sm text-white/40">Offene Beträge und Entwicklung im Blick behalten.</p></div></div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="relative z-10 py-20 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-wrap items-center justify-center gap-20 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8" />
                            <span className="text-xl font-bold">Sicherer Zugang</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8" />
                            <span className="text-xl font-bold">Browserbasiert</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Layout className="h-8 w-8" />
                            <span className="text-xl font-bold">Für Bau & Handwerk</span>
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
                            Testen Sie FlowY {content.trial.days} Tage und bringen Sie Büro, Projekte, Mitarbeiter und Finanzen in einem gemeinsamen Arbeitsbereich zusammen.
                        </p>
                        <Link href="/login?mode=register" className="bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black hover:bg-white/90 transition-all hover:scale-105 active:scale-95 inline-block">
                            Testphase starten
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 border-t border-white/5 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40 text-xs font-bold uppercase tracking-widest text-center md:text-left">
                    <span>© 2026 FlowY Professional. Alle Rechte vorbehalten.</span>
                    <div className="flex gap-8">
                        <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
                        <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
                        <a href="#preise" className="hover:text-white transition-colors">Preise</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
