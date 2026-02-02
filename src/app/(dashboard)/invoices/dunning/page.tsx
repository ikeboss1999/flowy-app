"use client";

import { useState } from "react";
import { DunningList } from "@/components/DunningList";
import { DunningArchive } from "@/components/DunningArchive";
import { AlertTriangle, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DunningPage() {
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

    return (
        <div className="p-10 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <div className="p-2.5 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100/50">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.3em]">Finanzen</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">Mahnwesen</h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">
                        Verwalten Sie überfällige Zahlungen und behalten Sie den Überblick über Ihr Mahnwesen.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={cn(
                            "px-6 py-4 font-bold text-lg border-b-2 transition-all flex items-center gap-3",
                            activeTab === "active"
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <AlertTriangle className="h-5 w-5" />
                        Offene Mahnungen
                    </button>
                    <button
                        onClick={() => setActiveTab("archive")}
                        className={cn(
                            "px-6 py-4 font-bold text-lg border-b-2 transition-all flex items-center gap-3",
                            activeTab === "archive"
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <History className="h-5 w-5" />
                        Mahnarchiv
                    </button>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "active" ? <DunningList /> : <DunningArchive />}
                </div>
            </div>
        </div>
    );
}
