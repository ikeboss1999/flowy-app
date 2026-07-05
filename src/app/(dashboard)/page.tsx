"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
  FolderOpen,
  Plus,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";
import { RealtimeClock } from "@/components/RealtimeClock";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useAuth } from "@/context/AuthContext";
import { useInvoices } from "@/hooks/useInvoices";
import { useOffers } from "@/hooks/useOffers";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
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
  const { data: companySettings } = useCompanySettings();
  const { data: accountSettings } = useAccountSettings();
  const { invoices } = useInvoices();
  const { offers } = useOffers();
  const { projects } = useProjects();
  const { employees } = useEmployees();

  React.useEffect(() => {
    if (profile?.role === "developer") {
      router.push("/admin");
    }
  }, [profile, router]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const companyName = companySettings?.companyName || "FlowY";
  const userName = accountSettings?.name || "Benutzer";

  const isAdminOrDev = profile?.role === "admin" || profile?.role === "developer";
  const canWriteInvoices = isAdminOrDev || !!profile?.permissions?.invoices_write;
  const canWriteOffers = isAdminOrDev || !!profile?.permissions?.offers_write;
  const canReadInvoices = isAdminOrDev || !!profile?.permissions?.invoices_read;
  const canReadOffers = isAdminOrDev || !!profile?.permissions?.offers_read;
  const canReadProjects = isAdminOrDev || !!profile?.permissions?.projects_read;
  const canReadEmployees = isAdminOrDev || !!profile?.permissions?.employees_read;
  const canUseTime = isAdminOrDev || !!profile?.permissions?.time_tracking_use;
  const canUseCalendar = isAdminOrDev || !!profile?.permissions?.calendar_use;

  const status = useMemo(() => {
    const yearInvoices = invoices.filter((invoice) => new Date(invoice.issueDate).getFullYear() === currentYear);
    const yearOffers = offers.filter((offer) => new Date(offer.issueDate).getFullYear() === currentYear);

    return {
      invoiceDrafts: yearInvoices.filter((invoice) => invoice.status === "draft").length,
      overdueInvoices: yearInvoices.filter((invoice) => invoice.status === "overdue").length,
      openOffers: yearOffers.filter((offer) => offer.status === "sent").length,
      activeProjects: projects.filter((project: any) => project.status !== "completed" && project.status !== "archived").length,
      employees: employees.length,
    };
  }, [currentYear, employees.length, invoices, offers, projects]);

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
    canReadProjects && {
      label: "Projekte",
      href: "/projects",
      icon: Briefcase,
      description: `${status.activeProjects} aktive Projekte`,
      tone: "amber",
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
    {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 2xl:p-12 space-y-8 lg:space-y-10 animate-in fade-in duration-500">
      <section className="rounded-[2.25rem] border border-slate-100 bg-white p-8 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-50/70 to-transparent pointer-events-none" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                <ReceiptText className="h-4 w-4" />
                Startseite
              </div>
              <span className="text-sm font-bold text-slate-400">{formatDate(today)}</span>
            </div>

            <div>
              <h1 className="text-5xl font-black tracking-tight text-slate-900 font-outfit">
                Willkommen, {userName}
              </h1>
              <p className="mt-3 max-w-3xl text-lg font-semibold text-slate-500">
                {companyName} ist bereit. Wählen Sie direkt den nächsten Arbeitsschritt oder öffnen Sie die Übersicht.
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
                      action.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
              >
                <BarChart3 className="h-4 w-4" />
                Zur Übersicht
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-6 shadow-inner">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Aktuelle Uhrzeit</div>
            <div className="mt-4 text-6xl font-black tracking-tight text-slate-900 tabular-nums">
              <RealtimeClock />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 border border-slate-100">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Jahr</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{currentYear}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-slate-100">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Status</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Bereit
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { label: "Fällige Rechnungen", value: status.overdueInvoices, href: "/invoices", icon: FileText, tone: status.overdueInvoices > 0 ? "rose" : "emerald" },
          { label: "Offene Angebote", value: status.openOffers, href: "/offers", icon: FileSignature, tone: "indigo" },
          { label: "Aktive Projekte", value: status.activeProjects, href: "/projects", icon: Briefcase, tone: "amber" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", toneClasses[item.tone as keyof typeof toneClasses])}>
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300" />
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-4xl font-black text-slate-900">{item.value}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Arbeitsbereiche</h2>
              <p className="text-sm font-semibold text-slate-500">Direkt in den passenden Bereich springen.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-white hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", toneClasses[module.tone])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-500" />
                  </div>
                  <p className="mt-5 text-lg font-black text-slate-900">{module.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{module.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
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
              <Link href="/archive" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                <span className="flex items-center gap-3">
                  <FolderOpen className="h-4 w-4" />
                  Archiv
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Tipp</p>
            <p className="mt-3 text-lg font-black">Fertige PDFs bleiben unverändert.</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/60">
              Neue Änderungen an Firmendaten oder Logo wirken erst bei neu finalisierten Dokumenten.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
