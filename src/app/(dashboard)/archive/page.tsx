"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
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


            {/* Main File Management Area */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <ArchiveFiles title="Archiv-Ordner" />
            </div>
        </div>
    );
}
