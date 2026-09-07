"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  Car,
  Clock,
  FileCheck,
  FileSignature,
  FileText,
  FolderOpen,
  Inbox,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";
import { RealtimeClock } from "@/components/RealtimeClock";
import { useAuth } from "@/context/AuthContext";
import { useStartup } from "@/hooks/useStartup";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

const formatDate = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
});

export default function Home() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: startup } = useStartup();
  const { data: accountSettings } = useAccountSettings();
  const { events: calendarEvents = [] } = useCalendarEvents();

  React.useEffect(() => {
    if (profile?.role === "developer") {
      router.push("/admin");
    }
  }, [profile, router]);

  const today = new Date();
  const companyName = startup.company.companyName || "FlowY";
  const companyLogo = startup.company.logo;
  const companyLocation = [
    startup.company.zipCode,
    startup.company.city
  ].filter(Boolean).join(" ");
  const companyInitials = companyName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FY";

  const userName = accountSettings.onboardingCompleted && accountSettings.name?.trim() && accountSettings.name.trim() !== "Benutzer"
    ? accountSettings.name.trim()
    : "Benutzer";

  const isAdminOrDev = profile?.role === "admin" || profile?.role === "developer";
  const permissions = profile?.permissions || {};
  const canUse = (permission: string) => isAdminOrDev || permissions["*"] === true || !!permissions[permission];
  const canWriteInvoices = canUse("invoices_write");
  const canWriteOffers = canUse("offers_write");
  const canReadCrm = canUse("crm_read");
  const canReadCustomers = canUse("customers_read");
  const canReadInvoices = canUse("invoices_read");
  const canReadOffers = canUse("offers_read");
  const canReadOrders = canUse("orders_read");
  const canReadProjects = canUse("projects_read");
  const canUseVehicles = canUse("vehicles_use");
  const canReadEmployees = canUse("employees_read");
  const canUseTime = canUse("time_tracking_use");
  const canUseCalendar = canUse("calendar_use");
  const canReadArchive = canUse("archive_read");
  const canReadDunning = canUse("dunning_read");
  const canReadReports = canUse("reports_read");
  const canUseCatalog = canWriteInvoices || canWriteOffers;
  const canOpenDashboard = canReadInvoices || canReadOffers || canReadOrders || canReadProjects || canReadEmployees || canUseTime || canReadReports;

  const status = startup.status;
  const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const todayKey = toDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  const upcomingEvents = calendarEvents
    .filter((event) => event.startDate <= tomorrowKey && event.endDate >= todayKey)
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  const actionNotices = [
    canReadInvoices && status.overdueInvoices > 0 && {
      label: "Fällige Rechnungen",
      detail: `${status.overdueInvoices} Rechnung${status.overdueInvoices === 1 ? "" : "en"} prüfen`,
      href: "/invoices",
      icon: AlertTriangle,
      tone: "rose",
    },
    canReadInvoices && status.invoiceDrafts > 0 && {
      label: "Rechnungsentwürfe",
      detail: `${status.invoiceDrafts} Entwurf${status.invoiceDrafts === 1 ? "" : "e"} fertigstellen`,
      href: "/invoices",
      icon: FileText,
      tone: "amber",
    },
    canReadOffers && status.openOffers > 0 && {
      label: "Offene Angebote",
      detail: `${status.openOffers} Angebot${status.openOffers === 1 ? "" : "e"} warten auf Antwort`,
      href: "/offers",
      icon: FileSignature,
      tone: "indigo",
    },
    canReadProjects && status.activeProjects > 0 && {
      label: "Aktive Projekte",
      detail: `${status.activeProjects} Projekt${status.activeProjects === 1 ? "" : "e"} in Bearbeitung`,
      href: "/projects",
      icon: Briefcase,
      tone: "emerald",
    },
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string; icon: React.ElementType; tone: "rose" | "amber" | "indigo" | "emerald" }>;

  const primaryActions = [
    canWriteInvoices && {
      label: "Neue Rechnung",
      href: "/invoices/new",
      icon: FileText,
      color: "bg-primary-gradient text-white shadow-indigo-500/20",
    },
    canWriteOffers && {
      label: "Neues Angebot",
      href: "/offers/new",
      icon: FileSignature,
      color: "bg-white text-slate-800 border border-slate-200",
    },
    canReadProjects && {
      label: "Projekt öffnen",
      href: "/projects",
      icon: Briefcase,
      color: "bg-white text-slate-800 border border-slate-200",
    },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ElementType; color: string }>;

  const modules = [
    canReadCrm && {
      label: "Anfragen (CRM)",
      href: "/crm",
      icon: Inbox,
      description: "Neue Anfragen bearbeiten",
      tone: "indigo",
    },
    canReadCustomers && {
      label: "Kunden",
      href: "/customers",
      icon: Users,
      description: "Kundenstamm einsehen",
      tone: "slate",
    },
    canReadInvoices && {
      label: "Rechnungen",
      href: "/invoices",
      icon: FileText,
      description: `${status.invoiceDrafts} Entwürfe, ${status.overdueInvoices} fällig`,
      tone: status.overdueInvoices > 0 ? "rose" : "indigo",
    },
    canReadOffers && {
      label: "Angebote",
      href: "/offers",
      icon: FileSignature,
      description: `${status.openOffers} offene Angebote`,
      tone: "emerald",
    },
    canReadOrders && {
      label: "Aufträge",
      href: "/orders",
      icon: FileCheck,
      description: "Auftragsbestand einsehen",
      tone: "indigo",
    },
    canReadProjects && {
      label: "Projekte",
      href: "/projects",
      icon: Briefcase,
      description: `${status.activeProjects} aktive Projekte`,
      tone: "amber",
    },
    canUseCatalog && {
      label: "Katalog",
      href: "/services",
      icon: BookOpen,
      description: "Leistungen und Positions-Vorlagen",
      tone: "emerald",
    },
    canUseVehicles && {
      label: "Fahrzeuge",
      href: "/vehicles",
      icon: Car,
      description: "Fuhrpark und Unterlagen",
      tone: "slate",
    },
    canReadEmployees && {
      label: "Mitarbeiter",
      href: "/employees",
      icon: Users,
      description: `${status.employees} Mitarbeiter angelegt`,
      tone: "slate",
    },
    canUseTime && {
      label: "Zeiten erfassen",
      href: "/time-tracking",
      icon: Clock,
      description: "Monatszeiten bearbeiten",
      tone: "indigo",
    },
    canUseTime && {
      label: "Zeit-Archiv",
      href: "/time-tracking/archive",
      icon: FileText,
      description: "Stundenaufzeichnungen einsehen",
      tone: "slate",
    },
    canReadDunning && {
      label: "Mahnwesen",
      href: "/invoices/dunning",
      icon: AlertTriangle,
      description: "Offene Mahnungen verfolgen",
      tone: "rose",
    },
    canReadReports && {
      label: "Auswertungen",
      href: "/reports",
      icon: BarChart3,
      description: "Statistiken und Kennzahlen",
      tone: "indigo",
    },
    canReadArchive && {
      label: "Dokumenten-Archiv",
      href: "/archive",
      icon: FolderOpen,
      description: "Ablage und Dateien",
      tone: "slate",
    },
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    icon: React.ElementType;
    description: string;
    tone: "indigo" | "emerald" | "amber" | "rose" | "slate";
  }>;

  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  const quickStartActions = [
    canWriteInvoices && { label: "Rechnung erstellen", description: "Neue Rechnung erfassen und finalisieren", href: "/invoices/new", icon: FileText, tone: "indigo" },
    canWriteOffers && { label: "Angebot schreiben", description: "Angebot vorbereiten und versenden", href: "/offers/new", icon: FileSignature, tone: "emerald" },
    canUseTime && { label: "Zeiten erfassen", description: "Monatszeiten der Mitarbeiter pflegen", href: "/time-tracking", icon: Clock, tone: "amber" },
  ].filter(Boolean) as Array<{
    label: string;
    description: string;
    href: string;
    icon: React.ElementType;
    tone: "indigo" | "emerald" | "amber" | "rose" | "slate";
  }>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 2xl:p-12 space-y-8 lg:space-y-10 animate-in fade-in duration-500">
      <section suppressHydrationWarning className="rounded-[2.25rem] border border-indigo-100/60 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-700 p-5 sm:p-8 shadow-2xl shadow-indigo-950/10 overflow-hidden relative text-white">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-pink-400/25 via-indigo-400/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur">
                <ReceiptText className="h-4 w-4" />
                Startseite
              </div>
              <span className="text-sm font-bold text-white/70">{formatDate(today)}</span>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div suppressHydrationWarning className="flex h-36 w-36 shrink-0 items-center justify-center rounded-[2.4rem] border border-white/20 bg-white p-5 text-4xl font-black text-indigo-700 shadow-2xl shadow-indigo-950/25 sm:h-40 sm:w-40 2xl:h-44 2xl:w-44">
                {companyLogo ? (
                  <img src={companyLogo} alt={`${companyName} Logo`} className="h-full w-full object-contain" />
                ) : (
                  companyInitials
                )}
              </div>
              <div suppressHydrationWarning className="min-w-0">
                <p suppressHydrationWarning className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200/90">{companyName}</p>
                {companyLocation ? (
                  <p suppressHydrationWarning className="mt-1 text-sm font-bold text-white/50">{companyLocation}</p>
                ) : null}
              </div>
            </div>

            <div>
              <h1 suppressHydrationWarning className="text-4xl font-black tracking-tight text-white sm:text-5xl 2xl:text-6xl font-outfit">
                {`Willkommen, ${userName}`}
              </h1>
              <p suppressHydrationWarning className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-white/75 sm:text-lg">
                {`${companyName} ist bereit. Wählen Sie direkt den nächsten Arbeitsschritt oder öffnen Sie die Übersicht.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {primaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-lg transition hover:scale-[1.02] active:scale-95",
                      action.color.includes("bg-primary-gradient")
                        ? "bg-white text-indigo-700 shadow-white/10"
                        : "bg-white/10 text-white border border-white/15 backdrop-blur hover:bg-white/15",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                );
              })}
              {canOpenDashboard && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-sm backdrop-blur transition hover:bg-white/15"
                >
                  <BarChart3 className="h-4 w-4" />
                  Zur Übersicht
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/12 p-6 shadow-inner backdrop-blur-xl">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/70">Aktuelle Uhrzeit</div>
            <div className="mt-5 text-6xl font-black tracking-tight text-white tabular-nums 2xl:text-7xl">
              <RealtimeClock />
            </div>
          </div>
        </div>
      </section>

      {quickStartActions.length > 0 && (
      <section suppressHydrationWarning className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Schnellstart</h2>
            <p className="text-sm font-semibold text-slate-500">Die wichtigsten Aktionen direkt griffbereit.</p>
          </div>
        </div>
        <div suppressHydrationWarning className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickStartActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group rounded-[1.5rem] border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-200/70",
                item.tone === "indigo" && "border-l-4 border-l-indigo-400",
                item.tone === "emerald" && "border-l-4 border-l-emerald-400",
                item.tone === "amber" && "border-l-4 border-l-amber-400",
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", toneClasses[item.tone as keyof typeof toneClasses])}>
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-indigo-500" />
              </div>
              <p className="mt-5 text-lg font-black text-slate-900">{item.label}</p>
              <p suppressHydrationWarning className="mt-1 text-sm font-bold leading-relaxed text-slate-500">{item.description}</p>
            </Link>
          );
        })}
        </div>
      </section>
      )}

      <section suppressHydrationWarning className="grid items-start grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
        <div className="self-start rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Mitteilungszentrale</h2>
              <p className="text-sm font-semibold text-slate-500">Was heute Aufmerksamkeit braucht.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider", actionNotices.length > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
              {actionNotices.length > 0 ? `${actionNotices.length} offen` : "Alles erledigt"}
            </span>
          </div>
          <div suppressHydrationWarning className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {actionNotices.length > 0 ? actionNotices.map((notice) => {
              const Icon = notice.icon;
              return (
                <Link
                  key={`${notice.href}-${notice.label}`}
                  href={notice.href}
                  className={cn(
                    "group flex items-center gap-4 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg",
                    notice.tone === "rose" && "border-l-4 border-l-rose-400",
                    notice.tone === "amber" && "border-l-4 border-l-amber-400",
                    notice.tone === "indigo" && "border-l-4 border-l-indigo-400",
                    notice.tone === "emerald" && "border-l-4 border-l-emerald-400",
                  )}
                >
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", notice.tone === "rose" ? "border-rose-100 bg-rose-50 text-rose-600" : notice.tone === "amber" ? "border-amber-100 bg-amber-50 text-amber-600" : notice.tone === "emerald" ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-indigo-100 bg-indigo-50 text-indigo-600")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1"><p className="text-lg font-black text-slate-900">{notice.label}</p><p className="mt-1 text-sm font-bold text-slate-500">{notice.detail}</p></div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-500" />
                </Link>
              );
            }) : <div className="col-span-full rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-black text-emerald-900">Alles im grünen Bereich</p><p className="mt-1 text-sm font-semibold text-emerald-700">Aktuell besteht kein dringender Handlungsbedarf.</p></div>}
          </div>

          <div className="hidden mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tipp</p>
              <p className="mt-2 text-base font-black">Fertige PDFs bleiben unverÃ¤ndert.</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">Neue Stammdaten wirken erst bei neu finalisierten Dokumenten.</p>
            </div>
            <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
              <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">PrÃ¤fixe und nÃ¤chste Nummern findest du gesammelt in den Einstellungen.</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
              <p className="mt-2 text-base font-black text-slate-900">Kalender aktuell halten</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Termine von heute und morgen erscheinen automatisch hier.</p>
            </div>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">FlowY-Tipps</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Praktisch f&#252;r deinen Arbeitsalltag</h2>
            <p className="text-sm font-semibold text-slate-500">Kleine Hinweise, die dir die t&#228;gliche Arbeit erleichtern.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tipp</p>
              <p className="mt-2 text-base font-black">Fertige PDFs bleiben unver&#228;ndert.</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">Neue Stammdaten wirken erst bei neu finalisierten Dokumenten.</p>
            </div>
            <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
              <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Pr&#228;fixe und n&#228;chste Nummern findest du gesammelt in den Einstellungen.</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
              <p className="mt-2 text-base font-black text-slate-900">Kalender aktuell halten</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Termine von heute und morgen erscheinen automatisch in deiner Mitteilungszentrale.</p>
            </div>
          </div>
        </section>
        </div>

        <aside suppressHydrationWarning className="space-y-5">
          {canUseCalendar && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><h2 className="text-xl font-black text-slate-900">Heute</h2><p className="text-sm font-semibold text-slate-500">Kalender und Termine</p></div>
                <Link href="/calendar" className="text-xs font-black uppercase tracking-wider text-indigo-600">Öffnen</Link>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 6).map((event) => (
                    <Link key={event.id} href="/calendar" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-indigo-50">
                      <Calendar className="h-4 w-4 shrink-0 text-indigo-600" />
                      <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-800">{event.title}</p><p className="text-xs font-bold text-slate-400">{event.startDate === todayKey ? "Heute" : "Morgen"} · {event.isAllDay ? "Ganztägig" : event.startTime || "Termin"}</p></div>
                    </Link>
                  ))}
                </div>
              ) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">Heute und morgen sind keine Termine eingetragen.</p>}
            </div>
          )}
          <div className="hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Heute nützlich</h2>
            <div className="mt-5 space-y-3">
              {canUseCalendar && (
                <Link href="/calendar" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                  <span className="flex items-center gap-3">
                    <Calendar className="h-4 w-4" />
                    Kalender
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/settings" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  Einstellungen
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              {canReadArchive && (
                <Link href="/archive" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                  <span className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4" />
                    Archiv
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="hidden rounded-[2rem] border border-slate-100 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Tipp</p>
            <p className="mt-3 text-lg font-black">Fertige PDFs bleiben unverändert.</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/60">
              Neue Änderungen an Firmendaten oder Logo wirken erst bei neu finalisierten Dokumenten.
            </p>
          </div>

          <div className="hidden grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
              <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                Präfixe und nächste Nummern findest du gesammelt in den Einstellungen.
              </p>
            </div>
            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
              <p className="mt-2 text-base font-black text-slate-900">Kalender immer aktuell halten</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                Termine von heute und morgen erscheinen automatisch in deiner Mitteilungszentrale.
              </p>
            </div>
          </div>
        </aside>

        <section className="hidden xl:col-start-1 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">FlowY-Tipps</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Praktisch f&#252;r deinen Arbeitsalltag</h2>
            <p className="text-sm font-semibold text-slate-500">Kleine Hinweise, die dir die t&#228;gliche Arbeit erleichtern.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tipp</p>
              <p className="mt-2 text-base font-black">Fertige PDFs bleiben unver&#228;ndert.</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">Neue Stammdaten wirken erst bei neu finalisierten Dokumenten.</p>
            </div>
            <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
              <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Pr&#228;fixe und n&#228;chste Nummern findest du gesammelt in den Einstellungen.</p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
              <p className="mt-2 text-base font-black text-slate-900">Kalender aktuell halten</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Termine von heute und morgen erscheinen automatisch in deiner Mitteilungszentrale.</p>
            </div>
          </div>
        </section>
      </section>

      <section className="hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">FlowY-Tipps</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Praktisch fÃ¼r deinen Arbeitsalltag</h2>
            <p className="text-sm font-semibold text-slate-500">Kleine Hinweise, die dir die tÃ¤gliche Arbeit erleichtern.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tipp</p>
            <p className="mt-2 text-base font-black">Fertige PDFs bleiben unverÃ¤ndert.</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">Neue Stammdaten wirken erst bei neu finalisierten Dokumenten.</p>
          </div>
          <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
            <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">PrÃ¤fixe und nÃ¤chste Nummern findest du gesammelt in den Einstellungen.</p>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
            <p className="mt-2 text-base font-black text-slate-900">Kalender aktuell halten</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Termine von heute und morgen erscheinen automatisch in deiner Mitteilungszentrale.</p>
          </div>
        </div>
      </section>

      <section className="hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">FlowY-Tipps</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Praktisch f&#252;r deinen Arbeitsalltag</h2>
          <p className="text-sm font-semibold text-slate-500">Kleine Hinweise, die dir die t&#228;gliche Arbeit erleichtern.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tipp</p>
            <p className="mt-2 text-base font-black">Fertige PDFs bleiben unver&#228;ndert.</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">Neue Stammdaten wirken erst bei neu finalisierten Dokumenten.</p>
          </div>
          <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-500">FlowY-Tipp</p>
            <p className="mt-2 text-base font-black text-slate-900">Nummernkreise zentral pflegen</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Pr&#228;fixe und n&#228;chste Nummern findest du gesammelt in den Einstellungen.</p>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Gut zu wissen</p>
            <p className="mt-2 text-base font-black text-slate-900">Kalender aktuell halten</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Termine von heute und morgen erscheinen automatisch in deiner Mitteilungszentrale.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
