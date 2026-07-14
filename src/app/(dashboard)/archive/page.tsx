"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
import { ArchiveFiles } from "@/components/archive/ArchiveFiles";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function ArchivePage() {
    usePermissionGuard("archive_read");
    return (
        <div className="dashboard-page">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-20 left-1/2 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative z-10 max-w-3xl">
                    <div className="mb-4 flex items-center gap-3 text-cyan-200">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm">
                            <FolderOpen className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.35em]">Dokumente</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Dokumenten-Archiv</h1>
                    <p className="mt-3 max-w-2xl text-base font-semibold text-white/70">
                        Verwalten Sie Ihre Briefe, Scans und Verträge in einer flexiblen Ordnerstruktur.
                    </p>
                </div>
            </div>


            {/* Main File Management Area */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <ArchiveFiles title="Archiv-Ordner" />
            </div>
        </div>
    );
}
