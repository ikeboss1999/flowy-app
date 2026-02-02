"use client";

import { useState } from "react";
import { CompanySettings } from "@/components/CompanySettings";
import { InvoiceSettings } from "@/components/InvoiceSettings";
import { AccountSettings } from "@/components/AccountSettings";
import { BackupSettings } from "@/components/BackupSettings";
import { Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
    { id: "Stammdaten", label: "Stammdaten" },
    { id: "Rechnung", label: "Rechnung" },
    { id: "App", label: "App" },
    { id: "Datensicherung", label: "Datensicherung" },
    { id: "Mein Konto", label: "Mein Konto" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Stammdaten");

    return (
        <div className="p-10 min-h-screen">
            <div className="max-w-5xl mx-auto space-y-16">
                {/* Header Section - Centered */}
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

                {/* Tab Navigation - Enlarged and Centered */}
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
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/10" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Section - Centered with animation */}
                <div className="pt-4 max-w-4xl mx-auto w-full">
                    {activeTab === "Stammdaten" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <CompanySettings />
                        </div>
                    )}

                    {activeTab === "Rechnung" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <InvoiceSettings />
                        </div>
                    )}

                    {activeTab === "Mein Konto" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <AccountSettings />
                        </div>
                    )}

                    {activeTab === "Datensicherung" && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                            <BackupSettings />
                        </div>
                    )}

                    {!["Stammdaten", "Rechnung", "Mein Konto", "Datensicherung"].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
                            <div className="h-24 w-24 rounded-3xl bg-indigo-50 flex items-center justify-center mb-8 shadow-inner">
                                <SettingsIcon className="h-12 w-12 text-indigo-200" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-3">{activeTab} Einstellungen</h3>
                            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Demnächst verfügbar</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
