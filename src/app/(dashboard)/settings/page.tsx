"use client";

import { useState } from "react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { CompanySettings } from "@/components/CompanySettings";
import { InvoiceSettings } from "@/components/InvoiceSettings";
import { OfferSettings } from "@/components/OfferSettings";
import { OrderSettings } from "@/components/OrderSettings";
import { ProjectSettings } from "@/components/ProjectSettings";
import { EmployeeSettings } from "@/components/EmployeeSettings";
import { AccountSettings } from "@/components/AccountSettings";
import { AppSettings } from "@/components/AppSettings";
import { UserManagement } from "@/components/UserManagement";
import { AppInfo } from "@/components/AppInfo";
import { CustomerSettings } from "@/components/CustomerSettings";
import {
    Settings as SettingsIcon,
    FileText,
    Receipt,
    Briefcase,
    FileSignature,
    Users2,
    Building2,
    Bell,
    Info,
    UserCircle2,
    SlidersHorizontal,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
    {
        id: "Stammdaten",
        label: "Stammdaten",
        description: "Firma, Logo, Adresse und Bankdaten",
        icon: Building2,
        color: "from-indigo-500 to-violet-500",
    },
    {
        id: "Dokumente",
        label: "Nummern & Dokumente",
        description: "Nummernkreise, Vorlagen und Dokumentregeln",
        icon: SlidersHorizontal,
        color: "from-sky-500 to-indigo-500",
    },
    {
        id: "Mitarbeiterrechte",
        label: "Benutzerverwaltung",
        description: "Benutzer, Rollen und Berechtigungen",
        icon: Users2,
        color: "from-emerald-500 to-teal-500",
    },
    {
        id: "Neuigkeiten",
        label: "Neuigkeiten",
        description: "Updates und aktuelle Änderungen",
        icon: Bell,
        color: "from-amber-500 to-orange-500",
    },
    {
        id: "Mein Konto",
        label: "Mein Konto",
        description: "Name, E-Mail, PIN und Kontozugriff",
        icon: UserCircle2,
        color: "from-fuchsia-500 to-pink-500",
    },
    {
        id: "App Info",
        label: "App Info",
        description: "Version, Konto und Systeminformationen",
        icon: Info,
        color: "from-slate-600 to-slate-900",
    },
];

const DOC_SUBTABS = [
    { id: "customer", label: "Kunden", icon: Users2 },
    { id: "offer", label: "Angebot", icon: FileText },
    { id: "order", label: "Auftrag", icon: FileSignature },
    { id: "invoice", label: "Rechnung", icon: Receipt },
    { id: "project", label: "Projekte", icon: Briefcase },
    { id: "employee", label: "Mitarbeiter", icon: Users2 },
];

export default function SettingsPage() {
    usePermissionGuard(null);
    const [activeTab, setActiveTab] = useState("Stammdaten");
    const [docSubTab, setDocSubTab] = useState("customer");
    const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
    const ActiveIcon = activeTabMeta.icon;

    return (
        <div className="dashboard-page">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
                <div className="relative overflow-hidden rounded-[32px] border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-indigo-100/70 blur-3xl" />
                    <div className="absolute bottom-0 right-32 h-32 w-32 rounded-full bg-fuchsia-100/70 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-indigo-600">
                                <SettingsIcon className="h-5 w-5" />
                                <span className="text-xs font-black uppercase tracking-[0.28em]">System</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                Einstellungen
                            </h1>
                            <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-slate-500">
                                Verwalten Sie Stammdaten, Dokumentnummern, Benutzerrechte und Ihr Konto an einem zentralen Ort.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bereich</p>
                                <p className="mt-1 text-sm font-black text-slate-900">{activeTabMeta.label}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Status</p>
                                <p className="mt-1 text-sm font-black text-emerald-700">Bereit</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="xl:sticky xl:top-6 xl:self-start">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="px-3 pb-3 pt-2">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                                    Einstellungen
                                </p>
                            </div>

                            <div className="grid gap-2">
                                {TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                                                isActive
                                                    ? "border-indigo-100 bg-indigo-50 shadow-sm"
                                                    : "border-transparent bg-white hover:border-slate-100 hover:bg-slate-50"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all",
                                                    isActive
                                                        ? `bg-gradient-to-br ${tab.color} text-white shadow-lg shadow-indigo-200`
                                                        : "bg-slate-100 text-slate-500 group-hover:text-indigo-600"
                                                )}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("font-black leading-tight", isActive ? "text-indigo-700" : "text-slate-900")}>
                                                    {tab.label}
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs font-bold leading-relaxed text-slate-400">
                                                    {tab.description}
                                                </p>
                                            </div>
                                            <ChevronRight
                                                className={cn(
                                                    "h-5 w-5 shrink-0 transition-all",
                                                    isActive ? "translate-x-0 text-indigo-500" : "text-slate-300 group-hover:translate-x-0.5"
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    <main className="min-w-0">
                        <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                            <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", activeTabMeta.color)}>
                                        <ActiveIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-500">
                                            {activeTabMeta.id === "Dokumente" ? "Konfiguration" : "Bereich"}
                                        </p>
                                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                            {activeTabMeta.label}
                                        </h2>
                                        <p className="mt-1 text-sm font-semibold text-slate-400">
                                            {activeTabMeta.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {activeTab === "Stammdaten" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <CompanySettings />
                                </div>
                            )}

                            {activeTab === "Dokumente" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                    <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-2 sm:grid-cols-3 lg:grid-cols-6">
                                        {DOC_SUBTABS.map(({ id, label, icon: Icon }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setDocSubTab(id)}
                                                className={cn(
                                                    "flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-black transition-all",
                                                    docSubTab === id
                                                        ? "border-indigo-100 bg-white text-indigo-600 shadow-sm"
                                                        : "border-transparent text-slate-500 hover:bg-white hover:text-slate-800"
                                                )}
                                            >
                                                <Icon className="h-5 w-5" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {docSubTab === "customer" && <CustomerSettings />}
                                    {docSubTab === "offer" && <OfferSettings />}
                                    {docSubTab === "order" && <OrderSettings />}
                                    {docSubTab === "invoice" && <InvoiceSettings />}
                                    {docSubTab === "project" && <ProjectSettings />}
                                    {docSubTab === "employee" && <EmployeeSettings />}
                                </div>
                            )}

                            {activeTab === "Mitarbeiterrechte" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <UserManagement />
                                </div>
                            )}

                            {activeTab === "Neuigkeiten" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <AppSettings />
                                </div>
                            )}

                            {activeTab === "Mein Konto" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <AccountSettings />
                                </div>
                            )}

                            {activeTab === "App Info" && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <AppInfo />
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
