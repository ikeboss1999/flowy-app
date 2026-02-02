"use client";

import { TimesheetArchiveList } from "@/components/TimesheetArchiveList";
import { FileText, Clock } from "lucide-react";

export default function TimesheetArchivePage() {
    return (
        <div className="p-10 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <div className="p-2.5 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100/50">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.3em]">Zeiterfassung</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">Zeit-Archiv</h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">
                        Alle abgeschlossenen Stundenzettel auf einen Blick.
                    </p>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TimesheetArchiveList />
                </div>
            </div>
        </div>
    );
}
