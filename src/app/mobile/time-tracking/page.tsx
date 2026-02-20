"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useTimeEntries } from "@/hooks/useTimeEntries"
import { useProjects } from "@/hooks/useProjects"
import { useNotification } from "@/context/NotificationContext"
import {
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    MapPin,
    AlertCircle,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TimeEntry } from "@/types/time-tracking"
import { MobileTimeEntryModal } from "@/components/mobile/MobileTimeEntryModal"
import { toLocalISOString, toLocalMonthString } from "@/lib/date-utils"

export default function MobileTimeTracking() {
    const { currentEmployee } = useAuth()
    const { entries, addEntry, updateEntry, deleteEntry, isLoading: entriesLoading, timesheets } = useTimeEntries()
    const { projects, isLoading: projectsLoading } = useProjects()
    const { showToast } = useNotification()

    // State for selected month
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const isFinalized = useMemo(() => {
        if (!currentEmployee) return false;
        const monthISO = toLocalMonthString(currentMonth);
        return timesheets.some(t => t.employeeId === currentEmployee.id && t.month === monthISO && t.status === 'finalized');
    }, [timesheets, currentEmployee, currentMonth]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

    if (!currentEmployee) return null

    const permissions = currentEmployee.appAccess?.permissions || { timeTracking: true }; // Default to true if undefined for safety
    if (permissions.timeTracking === false) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-[70vh] text-center gap-6">
                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Clock className="h-10 w-10 opacity-20" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Zugriff verweigert</h2>
                    <p className="text-sm text-slate-500 font-medium max-w-[240px]">
                        Die Zeiterfassung wurde für Ihren Account deaktiviert.
                    </p>
                </div>
            </div>
        )
    }

    // Helper to change month
    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    // Generate days of the selected month
    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();

        return Array.from({ length: numDays }, (_, i) => {
            const date = new Date(year, month, i + 1);
            return {
                date: toLocalISOString(date), // YYYY-MM-DD
                dayName: date.toLocaleDateString('de-DE', { weekday: 'short' }),
                dayNum: date.getDate()
            };
        }).reverse(); // Most recent first
    }, [currentMonth]);

    // Group entries by date
    const entriesByDate = useMemo(() => {
        const groups: Record<string, TimeEntry[]> = {};
        entries.forEach(entry => {
            if (entry.employeeId === currentEmployee.id) {
                if (!groups[entry.date]) groups[entry.date] = [];
                groups[entry.date].push(entry);
            }
        });
        return groups;
    }, [entries, currentEmployee.id]);

    const handleAddClick = (date: string) => {
        if (isFinalized) {
            showToast("Dieser Monat ist abgeschlossen.", "info");
            return;
        }
        setSelectedDate(date);
        setEditingEntry(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (entry: TimeEntry) => {
        if (isFinalized) {
            showToast("Dieser Monat ist abgeschlossen.", "info");
            return;
        }
        setSelectedDate(entry.date);
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleSaveEntry = async (entry: TimeEntry) => {
        try {
            if (editingEntry) {
                await updateEntry(entry.id, entry);
                showToast("Eintrag aktualisiert", "success");
            } else {
                await addEntry(entry);
                showToast("Arbeitszeit gespeichert", "success");
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast("Fehler beim Speichern", "error");
        }
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await deleteEntry(id);
            showToast("Eintrag gelöscht", "info");
            setIsModalOpen(false);
        } catch (e) {
            showToast("Fehler beim Löschen", "error");
        }
    };

    const monthLabel = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    if (entriesLoading || projectsLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium uppercase tracking-widest text-indigo-900/40">Lade Zeiterfassung...</p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
            {/* Header: Month Selector */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Zeiterfassung</h2>
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Clock className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-4 flex flex-col gap-4 text-white shadow-2xl shadow-indigo-900/20">
                    <div className="flex items-center justify-between w-full">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        <div className="flex flex-col items-center">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">Übersicht</span>
                            <span className="text-lg font-black tracking-tight">{monthLabel}</span>
                        </div>

                        <button
                            onClick={() => changeMonth(1)}
                            className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>

                    {isFinalized && (
                        <div className="flex items-center justify-center gap-2 py-2 bg-white/10 rounded-xl">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">Monat abgeschlossen</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Daily List */}
            <div className="space-y-4">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Arbeitstage</p>

                <div className="space-y-4">
                    {daysInMonth.map((day) => {
                        const dayEntries = entriesByDate[day.date] || [];
                        const totalMins = dayEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
                        const hasEntries = dayEntries.length > 0;
                        const isToday = day.date === toLocalISOString(new Date());

                        return (
                            <div key={day.date} className="relative group">
                                <div className={cn(
                                    "bg-white rounded-3xl border transition-all duration-300 overflow-hidden",
                                    isToday ? "border-indigo-100 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/10" : "border-slate-100 shadow-sm",
                                    isFinalized && "opacity-80 grayscale-[0.3]"
                                )}>
                                    <div className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            {/* Date Circle */}
                                            <div className={cn(
                                                "h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 transition-colors",
                                                hasEntries ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400",
                                                isToday && !hasEntries && "bg-indigo-50 text-indigo-600"
                                            )}>
                                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{day.dayName}</span>
                                                <span className="text-lg font-black leading-none">{day.dayNum}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="space-y-1">
                                                {hasEntries ? (
                                                    <div className="space-y-1">
                                                        {dayEntries.map(e => (
                                                            <button
                                                                key={e.id}
                                                                onClick={() => handleEditClick(e)}
                                                                className={cn(
                                                                    "block text-left group/entry",
                                                                    isFinalized && "cursor-default"
                                                                )}
                                                            >
                                                                <p className="text-sm font-black text-slate-800 group-hover/entry:text-indigo-600 transition-colors">
                                                                    {e.startTime} - {e.endTime}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 opacity-60">
                                                                    <MapPin className="h-2.5 w-2.5" />
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[120px]">
                                                                        {e.location || "---"}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-300 italic">Keine Einträge</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            {hasEntries && (
                                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                                                    <p className="text-[10px] font-black tracking-widest">
                                                        {(totalMins / 60).toFixed(1)} Std
                                                    </p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleAddClick(day.date)}
                                                disabled={isFinalized}
                                                className={cn(
                                                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                                                    isFinalized
                                                        ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                                        : "bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90"
                                                )}
                                            >
                                                {isFinalized ? <Clock className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Empty State */}
            {daysInMonth.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
                        <Calendar className="h-8 w-8" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Keine Tage für diesen Monat</p>
                </div>
            )}

            {/* Time Entry Modal */}
            <MobileTimeEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                projects={projects}
                initialEntry={editingEntry}
                selectedDate={selectedDate}
                userId={currentEmployee.userId}
                employeeId={currentEmployee.id}
            />
        </div>
    )
}
