"use client";

import {
  ArrowRight,
  Settings,
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  FileText,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { RealtimeClock } from "@/components/RealtimeClock";

// ... imports
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAccountSettings } from "@/hooks/useAccountSettings";

export default function Home() {
  const { data: companySettings } = useCompanySettings();
  const { data: accountSettings } = useAccountSettings();

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const formattedDate = today.toLocaleDateString('de-DE', options);

  // Fallback values if data is loading or empty
  const companyName = companySettings?.companyName || "RASNO BAU GMBH";
  const userName = accountSettings?.name || "Benutzer";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Section with Gradient */}
      <section className="bg-primary-gradient pt-24 pb-48 px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />

        {/* Floating background elements for depth */}
        <div className="absolute top-[-15%] right-[-5%] w-[45%] h-[110%] bg-white/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-25%] left-[-5%] w-[35%] h-[90%] bg-purple-500/20 blur-[120px] rounded-full" />

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border border-white/40 inline-block transform transition-transform hover:scale-105 duration-500">
              {companySettings?.logo ? (
                <img src={companySettings.logo} alt="Company Logo" className="h-20 object-contain" />
              ) : (
                <div className="flex flex-col items-center">
                  <h2 className="text-3xl font-black bg-clip-text text-transparent bg-primary-gradient uppercase tracking-[0.2em] leading-none mb-1">
                    //{companyName.toUpperCase()}
                  </h2>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">
                    Auf Qualität ist Verlass
                  </p>
                </div>
              )}
            </div>

            <h1 className="text-7xl font-black text-white tracking-tight font-outfit leading-tight">
              Willkommen bei FlowY
            </h1>
            <p className="text-white/90 text-2xl max-w-3xl font-medium leading-relaxed">
              {companyName} — Guten Abend! Ihre All-in-One-Lösung für Rechnungen, Projekte und Zeiterfassung.
            </p>

            <div className="flex gap-6 mt-10">
              <Link href="/dashboard" className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl shadow-black/15 transition-all hover:scale-105 hover:shadow-2xl active:scale-95">
                Zum Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/settings" className="bg-white/15 backdrop-blur-xl text-white border-2 border-white/30 px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-white/25 transition-all hover:scale-105 active:scale-95">
                <Settings className="h-5 w-5" /> Einstellungen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Widgets */}
      <section className="px-16 -mt-24 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-10">
          <div className="glass-card p-12 flex flex-col items-center text-center space-y-4 hover:-translate-y-2 duration-300">
            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50/50 flex items-center justify-center mb-2">
              <Clock className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Guten Abend</h3>
            <p className="text-base text-slate-500 font-semibold tracking-wide uppercase">{userName}</p>
          </div>

          <div className="glass-card p-12 flex flex-col items-center text-center space-y-4 hover:-translate-y-2 duration-300">
            <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50/50 flex items-center justify-center mb-2">
              <Calendar className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formattedDate.split(',')[0]}</h3>
            <p className="text-base text-slate-500 font-semibold tracking-wide">{formattedDate.split(',')[1]}</p>
          </div>

          <div className="glass-card p-12 flex flex-col items-center text-center space-y-4 hover:-translate-y-2 duration-300">
            <div className="h-16 w-16 rounded-[1.5rem] bg-orange-50/50 flex items-center justify-center mb-2">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
              <RealtimeClock />
            </h3>
            <p className="text-base text-slate-500 font-semibold tracking-wide">Aktuelle Uhrzeit</p>
          </div>
        </div>
      </section>

      {/* Features Explore Section */}
      <section className="px-16 py-32">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">Entdecken Sie alle Funktionen</h2>
            <p className="text-xl text-slate-500 font-semibold">Alles, was Sie für Ihre Unternehmensverwaltung benötigen</p>
          </div>

          <div className="grid grid-cols-3 gap-12">
            {[
              { icon: FileText, title: "Rechnungsverwaltung", color: "text-blue-500", bg: "bg-blue-50/50", desc: "Erstellen und verwalten Sie professionelle Rechnungen mit nur wenigen Klicks. Automatisierte Berechnungen inklusive." },
              { icon: Users, title: "Kunden & Mitarbeiter", color: "text-purple-500", bg: "bg-purple-50/50", desc: "Verwalten Sie alle Kontakte und Mitarbeiterdaten zentral an einem Ort mit detaillierten Profilen." },
              { icon: Briefcase, title: "Projektverwaltung", color: "text-emerald-500", bg: "bg-emerald-50/50", desc: "Behalten Sie den Überblick über alle Ihre Bauprojekte, Meilensteile und Aufträge in Echtzeit." }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-12 group cursor-pointer hover:border-indigo-500/40 hover:-translate-y-2 duration-300">
                <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg", feature.bg)}>
                  <feature.icon className={cn("h-8 w-8", feature.color)} />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h4>
                <p className="text-lg text-slate-500 leading-relaxed mb-8">
                  {feature.desc}
                </p>
                <button className="text-base font-black text-indigo-600 flex items-center gap-2 group-hover:gap-3 transition-all">
                  Mehr erfahren <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-using cn helper for icons
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
