"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ArrowLeft,
    Save,
    Printer,
    Zap,
    MoreHorizontal,
    Briefcase,
    Clock,
    MapPin,
    Trash2,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { TimeEntry, TimeEntryType } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { TimeTrackingPreviewModal } from "@/components/TimeTrackingPreviewModal";

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

export default function EmployeeTimeTrackingPage() {
    const params = useParams();
    const router = useRouter();
    const employeeId = params.employeeId as string;

    // Hooks
    const { employees, isLoading: employeesLoading } = useEmployees();
    const { entries, addEntry, updateEntry, deleteEntry, isLoading: entriesLoading, timesheets, finalizeMonth, reopenMonth } = useTimeEntries();
    const { data: companySettings } = useCompanySettings();

    // State
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Local state for buffered edits
    const [unsavedChanges, setUnsavedChanges] = useState<Record<string, TimeEntry>>({});
    const [isSaving, setIsSaving] = useState(false);

    const employee = employees.find(e => e.id === employeeId);

    // Derived Data
    const daysInMonth = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        return getDaysInMonth(y, m);
    }, [selectedMonth]);

    const monthEntries = useMemo(() => {
        return entries.filter(e =>
            e.employeeId === employeeId &&
            e.date.startsWith(selectedMonth)
        );
    }, [entries, employeeId, selectedMonth]);

    const isFinalized = useMemo(() => {
        return timesheets.some(t => t.employeeId === employeeId && t.month === selectedMonth && t.status === 'finalized');
    }, [timesheets, employeeId, selectedMonth]);

    if (employeesLoading || entriesLoading) {
        return <div className="p-10 text-center text-slate-400">Laden...</div>;
    }

    if (!employee) {
        return <div className="p-10 text-center text-red-500">Mitarbeiter nicht gefunden.</div>;
    }

    // Handlers
    const handleUpdateEntry = (date: string, field: keyof TimeEntry, value: any) => {
        if (isFinalized) return;

        setUnsavedChanges(prev => {
            const existingInState = prev[date];
            if (existingInState) {
                return {
                    ...prev,
                    [date]: { ...existingInState, [field]: value }
                };
            }

            const existingInDb = monthEntries.find(e => e.date === date);
            if (existingInDb) {
                return {
                    ...prev,
                    [date]: { ...existingInDb, [field]: value }
                };
            }

            // New Entry Scenario
            // If the user tries to create a new entry by typing in a field, we MUST create it,
            // even if the value is falsy (e.g. empty string), because maybe they want to start typing?
            // BUT: if the value is truly empty/null AND we strictly don't want ephemeral empty rows...

            // Allow creation if value is provided OR if we are explicitly setting a field (even to empty)
            if ((value === "" || value === null || value === undefined) && field !== 'type') return prev;

            const newEntry: TimeEntry = {
                id: Math.random().toString(36).substr(2, 9),
                employeeId,
                date,
                startTime: "08:00",
                endTime: "17:00",
                breakDuration: 60,
                type: "WORK",
                createdAt: new Date().toISOString(),
                [field]: value
            };

            return {
                ...prev,
                [date]: newEntry
            };
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const changes = Object.values(unsavedChanges);
            for (const entry of changes) {
                let duration = 0;

                // Use existing duration if available (it is the source of truth now)
                if (typeof entry.duration === 'number') {
                    duration = entry.duration;
                }
                // Fallback for legacy data or if duration missing
                else if (entry.type === 'WORK' && entry.startTime && entry.endTime) {
                    const start = new Date(`1970-01-01T${entry.startTime}`);
                    const end = new Date(`1970-01-01T${entry.endTime}`);
                    duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                }

                const entryWithDuration = { ...entry, duration };

                const exists = entries.find(e => e.id === entry.id);
                if (exists) {
                    await updateEntry(entry.id, entryWithDuration);
                } else {
                    await addEntry(entryWithDuration);
                }
            }
            setUnsavedChanges({});
        } catch (e) {
            console.error("Save failed", e);
            alert("Fehler beim Speichern! Bitte überprüfen Sie Ihre Eingaben.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoFill = () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        if (!window.confirm(`Möchten Sie den gesamten Monat ${selectedMonth} automatisch befüllen? Bestehende Einträge bleiben erhalten.`)) return;

        const dayMap: Record<number, keyof NonNullable<Employee['weeklySchedule']>> = {
            1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
        };

        const newEntries: TimeEntry[] = [];
        const days = getDaysInMonth(year, month);
        const updates: Record<string, TimeEntry> = {};

        for (let d = 1; d <= days; d++) {
            const dateObj = new Date(year, month - 1, d);
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

            // Skip existing in DB or unsaved changes
            if (monthEntries.some(e => e.date === dateStr) || unsavedChanges[dateStr]) continue;

            const dayOfWeek = dateObj.getDay();
            const schedule = employee.weeklySchedule?.[dayMap[dayOfWeek]];

            if (schedule?.enabled) {
                const hours = Number(schedule.hours) || 0;

                // We set 'startTime' and 'endTime' ONLY for compatibility, 
                // but the 'duration' field is our source of truth.
                // We ignore the break time in the 'endTime' calculation here to avoid confusion.
                // If the user wants 8 hours net, we just give them 8 hours.

                updates[dateStr] = {
                    id: Math.random().toString(36).substr(2, 9),
                    employeeId,
                    date: dateStr,
                    startTime: "08:00",
                    endTime: "16:00", // Dummy end time for legacy compatibility (8h net)
                    breakDuration: 0, // Zero break for simplicity in this calculation mode
                    type: "WORK",
                    createdAt: new Date().toISOString(),
                    overtime: 0,
                    location: "Hauptsitz", // Default
                    duration: hours * 60 // Set net duration in minutes
                };
            }
        }

        // Add to unsaved changes instead of direct save
        setUnsavedChanges(prev => ({ ...prev, ...updates }));
    };

    const handleClearMonth = async () => {
        if (!confirm(`Sind Sie sicher, dass Sie alle Einträge für ${selectedMonth} löschen möchten? Dies kann nicht rückgängig gemacht werden.`)) return;

        setIsSaving(true);
        try {
            // 1. Delete all existing entries from DB
            const idsToDelete = monthEntries.map(e => e.id);
            // We can run these in parallel
            await Promise.all(idsToDelete.map(id => deleteEntry(id)));

            // 2. Clear from unsaved changes
            setUnsavedChanges(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key.startsWith(selectedMonth)) {
                        delete next[key];
                    }
                });
                return next;
            });
        } catch (e) {
            console.error("Clear failed", e);
            alert("Fehler beim Löschen. Bitte versuchen Sie es erneut.");
        } finally {
            setIsSaving(false);
        }
    };

    // Render Table Rows
    const renderRows = () => {
        const rows = [];
        const [year, month] = selectedMonth.split('-').map(Number);

        const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month - 1, d);
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const entry = unsavedChanges[dateStr] || monthEntries.find(e => e.date === dateStr);
            const type = entry?.type || (isWeekend ? 'HOLIDAY' : null); // Default visual for weekend

            const isModified = !!unsavedChanges[dateStr];

            // Styling rows
            const rowClass = cn(
                "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                isWeekend && "bg-slate-50/50",
                isModified && "bg-amber-50/30"
            );

            rows.push(
                <tr key={dateStr} className={rowClass}>
                    <td className="px-4 py-3 whitespace-nowrap relative">
                        {isModified && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />}
                        <div className="flex flex-col">
                            <span className={cn("text-sm font-bold", isWeekend ? "text-slate-400" : "text-slate-700")}>
                                {d.toString().padStart(2, '0')}.
                            </span>
                            <span className="text-xs text-slate-400 uppercase">{weekdayNames[dayOfWeek]}</span>
                        </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                className="w-full text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300"
                                placeholder="Standort..."
                                value={entry?.location || ""}
                                onChange={(e) => handleUpdateEntry(dateStr, 'location', e.target.value)}
                                disabled={isFinalized}
                            />
                        </div>
                    </td>

                    {/* Type Selector */}
                    <td className="px-4 py-3">
                        <select
                            value={entry?.type || (isWeekend ? "" : "WORK")}
                            onChange={(e) => handleUpdateEntry(dateStr, 'type', e.target.value)}
                            className={cn(
                                "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border outline-none cursor-pointer",
                                !entry ? "text-slate-400 border-slate-200 bg-transparent" :
                                    entry.type === 'WORK' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                                        entry.type === 'VACATION' ? "text-amber-600 bg-amber-50 border-amber-100" :
                                            entry.type === 'SICK' ? "text-rose-600 bg-rose-50 border-rose-100" :
                                                "text-indigo-600 bg-indigo-50 border-indigo-100"
                            )}
                            disabled={isFinalized}
                        >
                            <option value="WORK">Arbeit</option>
                            <option value="VACATION">Urlaub</option>
                            <option value="SICK">Krank</option>
                            <option value="HOLIDAY">Feiertag</option>
                        </select>
                    </td>

                    {/* Start / End */}
                    {/* Start / End REMOVED - Replaced by Hours Input */}
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all w-24">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="number"
                                step="0.25"
                                className="w-full text-sm font-medium text-slate-700 outline-none text-right"
                                placeholder="0"
                                value={entry?.duration ? (entry.duration / 60).toFixed(2) : ""}
                                onChange={(e) => {
                                    const hours = parseFloat(e.target.value);
                                    if (isNaN(hours)) {
                                        handleUpdateEntry(dateStr, 'duration', 0);
                                        return;
                                    }
                                    const mins = Math.round(hours * 60);
                                    handleUpdateEntry(dateStr, 'duration', mins);

                                    // Set dummy start/end for compatibility if needed
                                    const start = "08:00";
                                    const endHour = 8 + hours;
                                    const end = `${Math.floor(endHour).toString().padStart(2, '0')}:${Math.round((endHour % 1) * 60).toString().padStart(2, '0')}`;
                                    handleUpdateEntry(dateStr, 'startTime', start);
                                    handleUpdateEntry(dateStr, 'endTime', end);
                                }}
                                disabled={isFinalized || (entry && entry.type !== 'WORK')}
                            />
                        </div>
                    </td>

                    {/* Overtime (Manual Input) */}
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all w-24">
                            <span className="text-amber-500 text-xs font-bold">+</span>
                            <input
                                type="number"
                                step="0.5"
                                className="w-full text-sm font-medium text-slate-700 outline-none text-right"
                                placeholder="0"
                                value={entry?.overtime || ""}
                                onChange={(e) => handleUpdateEntry(dateStr, 'overtime', parseFloat(e.target.value) || 0)}
                                disabled={isFinalized}
                            />
                        </div>
                    </td>
                </tr>
            );
        }
        return rows;
    };

    const firstName = employee.personalData.firstName;
    const lastName = employee.personalData.lastName;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8 pb-32">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900">{firstName} {lastName}</h1>
                    <p className="text-slate-500 font-medium">Zeiterfassung verwalten</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="pl-10 pr-8 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none cursor-pointer appearance-none transition-colors"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = new Date();
                                date.setMonth(date.getMonth() - (11 - i));
                                const value = date.toISOString().slice(0, 7);
                                const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                                return <option key={value} value={value}>{label}</option>;
                            })}
                        </select>
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    {isFinalized && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-sm font-bold">
                            <AlertCircle className="h-4 w-4" />
                            Archiviert
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleAutoFill}
                        disabled={isFinalized}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all",
                            isFinalized
                                ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105"
                        )}
                    >
                        <Zap className="h-4 w-4" />
                        Monat füllen
                    </button>

                    <button
                        onClick={handleClearMonth}
                        disabled={isFinalized || (monthEntries.length === 0 && Object.keys(unsavedChanges).filter(k => k.startsWith(selectedMonth)).length === 0)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm",
                            isFinalized || (monthEntries.length === 0 && Object.keys(unsavedChanges).filter(k => k.startsWith(selectedMonth)).length === 0)
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                        )}
                        title="Alle eingetragenen Stunden zurücksetzen"
                    >
                        <Trash2 className="h-4 w-4" />
                        Leeren
                    </button>

                    <button
                        onClick={handleSaveChanges}
                        disabled={Object.keys(unsavedChanges).length === 0 || isSaving}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm",
                            Object.keys(unsavedChanges).length === 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-200"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Speichert..." : "Speichern"}
                    </button>

                    <button
                        onClick={() => setIsPreviewModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all hover:scale-105 shadow-sm"
                    >
                        <Printer className="h-4 w-4" />
                        Exportieren
                    </button>

                    {!isFinalized ? (
                        <button
                            onClick={() => {
                                if (confirm("Monat abschließen? Änderungen sind danach nur eingeschränkt möglich."))
                                    finalizeMonth(employeeId, selectedMonth);
                            }}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-200"
                        >
                            <Save className="h-4 w-4" />
                            Abschließen
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (confirm("Monat wieder öffnen?"))
                                    reopenMonth(employeeId, selectedMonth);
                            }}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all"
                        >
                            <Save className="h-4 w-4" />
                            Wieder öffnen
                        </button>
                    )}
                </div>

            </div>


            {/* Main Table */}
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                            <th className="px-4 py-4 w-24">Datum</th>
                            <th className="px-4 py-4 w-48">Arbeitsort</th>
                            <th className="px-4 py-4 w-32">Typ</th>
                            <th className="px-4 py-4 w-40">Stunden</th>
                            <th className="px-4 py-4 w-32">Überstunden</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {renderRows()}
                    </tbody>
                </table>
            </div>

            {/* Export Modal */}
            <TimeTrackingPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                entries={monthEntries.sort((a, b) => a.date.localeCompare(b.date))}
                employee={employee}
                month={selectedMonth}
                companySettings={companySettings}
            />
        </div >
    );
}
