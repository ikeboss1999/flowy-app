"use client";

import { useMemo, useState } from "react";
import { DunningList } from "@/components/DunningList";
import { DunningArchive } from "@/components/DunningArchive";
import { AlertTriangle, Clock3, FileWarning, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useInvoices } from "@/hooks/useInvoices";

export default function DunningPage() {
    usePermissionGuard("dunning_read");
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const { invoices } = useInvoices();

    const stats = useMemo(() => {
        const relevant = invoices.filter(inv => !['paid', 'draft', 'canceled'].includes(inv.status));
        const overdue = relevant.filter(inv => {
            const issueDate = new Date(inv.issueDate);
            const paymentDays = parseInt(inv.paymentTerms) || 0;
            const dueDate = new Date(issueDate);
            dueDate.setDate(dueDate.getDate() + paymentDays);
            return new Date() > dueDate || (inv.dunningLevel || 0) > 0;
        });
        const inDunning = invoices.filter(inv => (inv.dunningLevel || 0) > 0);
        return {
            overdue: overdue.length,
            inDunning: inDunning.length,
        };
    }, [invoices]);

    return (
        <div className="dashboard-page">
            <div className="mx-auto max-w-7xl space-y-8">
                <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-8 text-white shadow-2xl shadow-indigo-950/20 lg:p-10">
                    <div className="absolute right-10 top-8 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-4 flex items-center gap-3 text-[12px] font-black uppercase tracking-[0.3em] text-cyan-200">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/10">
                                    <AlertTriangle className="h-6 w-6" />
                                </span>
                                Finanzen
                            </div>
                            <h1 className="text-5xl font-black tracking-tight lg:text-6xl">Mahnwesen</h1>
                            <p className="mt-3 max-w-3xl text-lg font-semibold text-white/60">
                                Überfällige Rechnungen erkennen, Mahnungen finalisieren und gespeicherte PDFs sauber im Archiv behalten.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:w-[34rem]">
                            {[
                                { label: "Überfällig", value: stats.overdue, icon: Clock3, tone: "text-orange-200" },
                                { label: "Im Mahnlauf", value: stats.inDunning, icon: FileWarning, tone: "text-fuchsia-200" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">{item.label}</span>
                                        <item.icon className={cn("h-5 w-5", item.tone)} />
                                    </div>
                                    <div className="mt-4 text-4xl font-black">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="flex w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all",
                            activeTab === "active"
                                ? "bg-primary-gradient text-white shadow-lg shadow-indigo-900/20"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <AlertTriangle className="h-4 w-4" />
                        Offene Mahnungen
                    </button>
                    <button
                        onClick={() => setActiveTab("archive")}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all",
                            activeTab === "archive"
                                ? "bg-primary-gradient text-white shadow-lg shadow-indigo-900/20"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <History className="h-4 w-4" />
                        Mahnarchiv
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "active" ? <DunningList /> : <DunningArchive />}
                </div>
            </div>
        </div>
    );
}
