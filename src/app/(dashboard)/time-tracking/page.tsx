"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    CircleDashed,
    Clock,
    Search,
    UserCircle,
    Users
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { cn } from "@/lib/utils";

type TimeTrackingFilter = "all" | "open" | "finalized" | "empty";
type MonthState = "open" | "finalized" | "empty";

function getPreviousMonthValue() {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
}

export default function TimeTrackingPage() {
    usePermissionGuard("time_tracking_use");
    const router = useRouter();
    const { employees, isLoading } = useEmployees();
    const { entries, timesheets, isLoading: timeLoading } = useTimeEntries();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<TimeTrackingFilter>("all");

    const statusMonth = getPreviousMonthValue();
    const monthLabel = new Date(`${statusMonth}-01`).toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric"
    });

    const activeEmployees = useMemo(() => {
        return employees.filter(emp => emp.employment.isActive !== false);
    }, [employees]);

    const trackableEmployees = useMemo(() => {
        return activeEmployees.filter(emp => emp.additionalInfo?.noTimeTrackingRequired !== true);
    }, [activeEmployees]);

    const getMonthState = (employeeId: string): MonthState => {
        const isFinalized = timesheets.some(t =>
            t.employeeId === employeeId &&
            t.month === statusMonth &&
            t.status === "finalized"
        );
        if (isFinalized) return "finalized";

        const hasEntries = entries.some(e =>
            e.employeeId === employeeId &&
            e.date.startsWith(statusMonth)
        );
        return hasEntries ? "open" : "empty";
    };

    const monthStats = useMemo(() => {
        return trackableEmployees.reduce((acc, emp) => {
            const state = getMonthState(emp.id);
            if (state === "open") acc.open += 1;
            if (state === "finalized") acc.finalized += 1;
            if (state === "empty") acc.empty += 1;
            return acc;
        }, {
            open: 0,
            finalized: 0,
            empty: 0,
            excluded: activeEmployees.length - trackableEmployees.length
        });
    }, [trackableEmployees, activeEmployees.length, entries, timesheets, statusMonth]);

    const filteredEmployees = trackableEmployees.filter(emp => {
        const fullName = `${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase());
        const state = getMonthState(emp.id);
        const matchesFilter = statusFilter === "all" || state === statusFilter;
        return matchesSearch && matchesFilter;
    });

    const filters: { key: TimeTrackingFilter; label: string; count: number }[] = [
        { key: "all", label: "Alle", count: trackableEmployees.length },
        { key: "open", label: "Offen", count: monthStats.open },
        { key: "finalized", label: "Abgeschlossen", count: monthStats.finalized },
        { key: "empty", label: "Keine Einträge", count: monthStats.empty },
    ];

    const loading = isLoading || timeLoading;

    return (
        <div className="p-10 min-h-screen">
            <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <div className="p-2.5 bg-indigo-50 rounded-xl shadow-sm border border-indigo-100/50">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.3em]">Zeiterfassung</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">Zeiten erfassen</h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">
                        Wählen Sie einen Mitarbeiter aus, um den vergangenen Monat zu erfassen.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Clock className="h-64 w-64 text-indigo-900" />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Abrechnungsmonat</p>
                            <p className="text-lg font-black text-indigo-900 mt-2">{monthLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Offen</p>
                            <p className="text-3xl font-black text-slate-900 mt-2">{monthStats.open}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Abgeschlossen</p>
                            <p className="text-3xl font-black text-emerald-700 mt-2">{monthStats.finalized}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Ohne Zeiterfassung</p>
                            <p className="text-3xl font-black text-amber-700 mt-2">{monthStats.excluded}</p>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(360px,520px)_1fr] gap-4 mb-8">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Mitarbeiter suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-slate-900 font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                            {filters.map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setStatusFilter(filter.key)}
                                    className={cn(
                                        "shrink-0 px-4 py-3 rounded-xl text-sm font-black border transition-colors",
                                        statusFilter === filter.key
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {filter.label} <span className="opacity-70">({filter.count})</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-slate-400 italic">Lade Mitarbeiter...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Keine Mitarbeiter gefunden.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredEmployees.map((emp) => {
                                const name = `${emp.personalData.firstName} ${emp.personalData.lastName}`;
                                const position = emp.employment.position || "Mitarbeiter";
                                const state = getMonthState(emp.id);
                                const statusConfig = state === "finalized"
                                    ? {
                                        label: "Abgeschlossen",
                                        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        icon: CheckCircle2
                                    }
                                    : state === "open"
                                        ? {
                                            label: "Offen",
                                            className: "bg-indigo-50 text-indigo-700 border-indigo-100",
                                            icon: CircleDashed
                                        }
                                        : {
                                            label: "Keine Einträge",
                                            className: "bg-slate-50 text-slate-500 border-slate-200",
                                            icon: AlertCircle
                                        };
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => router.push(`/time-tracking/${emp.id}`)}
                                        className="group flex items-center gap-4 p-5 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                                    >
                                        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                                            {emp.avatar ? (
                                                <img src={emp.avatar} alt={name} className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCircle className="h-8 w-8 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-900">{name}</h3>
                                            <p className="text-sm text-slate-500 truncate">{position}</p>
                                            <div className={cn("inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg border text-[11px] font-black", statusConfig.className)}>
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                {statusConfig.label}
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
