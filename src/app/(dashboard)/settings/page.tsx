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
import { Settings as SettingsIcon, FileText, Receipt, Briefcase, FileSignature, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
    { id: "Stammdaten", label: "Stammdaten" },
    { id: "Dokumente", label: "Dokumente & Projekte" },
    { id: "Mitarbeiterrechte", label: "Benutzerverwaltung" },
    { id: "Neuigkeiten", label: "Neuigkeiten" },
    { id: "Mein Konto", label: "Mein Konto" },
];

const DOC_SUBTABS = [
    { id: "offer", label: "Angebot", icon: FileText },
    { id: "order", label: "Auftrag", icon: FileSignature },
    { id: "invoice", label: "Rechnung", icon: Receipt },
    { id: "project", label: "Projekte", icon: Briefcase },
    { id: "employee", label: "Mitarbeiter", icon: Users2 },
];

export default function SettingsPage() {
    usePermissionGuard(null);
    const [activeTab, setActiveTab] = useState("Stammdaten");
    const [docSubTab, setDocSubTab] = useState("offer");

    return (
        <div className="p-10 min-h-screen">
            <div className="max-w-5xl mx-auto space-y-16">
                {/* Header */}
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2.5 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100/50">
                            <SettingsIcon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.3em]">System</span>
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tight font-outfit">Einstellungen</h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">
                        Verwalten Sie Ihre Unternehmenseinstellungen und Systemkonfiguration an einem zentralen Ort.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center">
                    <div className="flex items-center p-2 bg-slate-100/80 backdrop-blur-md rounded-[24px] border border-slate-200/50 shadow-inner w-fit">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-10 py-5 rounded-[20px] font-black text-base transition-all duration-500 relative overflow-hidden",
                                    activeTab === tab.id
                                        ? "bg-white text-indigo-600 shadow-xl shadow-indigo-200/40 -translate-y-0.5 scale-[1.02]"
                                        : "text-slate-500 hover:text-indigo-400 hover:bg-white/50"
                                    )
                                }
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/10" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="pt-4 max-w-4xl mx-auto w-full">
                    {activeTab === "Stammdaten" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <CompanySettings />
                        </div>
                    )}

                    {activeTab === "Dokumente" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out space-y-8">
                            {/* Sub-tab strip */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 w-fit">
                                {DOC_SUBTABS.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setDocSubTab(id)}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all",
                                            docSubTab === id
                                                ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {docSubTab === "offer" && <OfferSettings />}
                            {docSubTab === "order" && <OrderSettings />}
                            {docSubTab === "invoice" && <InvoiceSettings />}
                            {docSubTab === "project" && <ProjectSettings />}
                            {docSubTab === "employee" && <EmployeeSettings />}
                        </div>
                    )}

                    {activeTab === "Mitarbeiterrechte" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <UserManagement />
                        </div>
                    )}

                    {activeTab === "Neuigkeiten" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <AppSettings />
                        </div>
                    )}

                    {activeTab === "Mein Konto" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <AccountSettings />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
