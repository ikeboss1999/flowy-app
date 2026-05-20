"use client";

import React from "react";
import { FolderOpen, Cloud, HardDrive, Shield } from "lucide-react";
import { ArchiveFiles } from "@/components/archive/ArchiveFiles";

export default function ArchivePage() {
    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <FolderOpen className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Dokumente</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Dokumenten <span className="text-slate-300 font-light">Archiv</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Verwalten Sie Ihre Briefe, Scans und Verträge in einer flexiblen Ordnerstruktur.</p>
                </div>
            </div>

            {/* Quick Stats / Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Speichertyp", value: "Cloud Speicher", detail: "Sichere Verschlüsselung", color: "text-indigo-600", bg: "bg-indigo-50", icon: Cloud },
                    { label: "Dateiverwaltung", value: "Drag & Drop", detail: "PDFs und Bilder bis 10MB", color: "text-purple-600", bg: "bg-purple-50", icon: HardDrive },
                    { label: "Sicherheit", value: "Privat", detail: "Nur für Sie zugänglich", color: "text-emerald-600", bg: "bg-emerald-50", icon: Shield },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                                    <span className="font-bold text-slate-800 text-lg mt-0.5">{stat.value}</span>
                                </div>
                            </div>
                            <span className="text-xs text-slate-400 font-semibold">{stat.detail}</span>
                        </div>
                    );
                })}
            </div>

            {/* Main File Management Area */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <ArchiveFiles title="Archiv-Ordner" />
            </div>
        </div>
    );
}
