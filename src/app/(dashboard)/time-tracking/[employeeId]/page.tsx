"use client";

import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
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
    AlertCircle,
    CheckCircle2,
    CircleDashed,
    Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { TimeEntry, TimeEntryType } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { TimeTrackingPreviewModal } from "@/components/TimeTrackingPreviewModal";
import { isAustrianHoliday } from "@/lib/holidays";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

// Memoized Row Component for extreme performance
const TimeEntryRow = memo(({
    dateStr,
    entry,
    isModified,
    isFinalized,
    holidayName,
    onUpdate
}: {
    dateStr: string,
    entry?: TimeEntry,
    isModified: boolean,
    isFinalized: boolean,
    holidayName?: string,
    onUpdate: (date: string, field: keyof TimeEntry, value: any) => void
}) => {
    const [localLocation, setLocalLocation] = useState(entry?.location || "");
    const [localHours, setLocalHours] = useState(entry?.duration ? (entry.duration / 60).toString() : "");
    const [localBadWeatherHours, setLocalBadWeatherHours] = useState(entry?.badWeatherDuration ? (entry.badWeatherDuration / 60).toString() : "");

    // Update local state when outer entry changes (e.g. from AutoFill or Reset)
    useEffect(() => {
        setLocalLocation(entry?.location || "");
    }, [entry?.location]);

    useEffect(() => {
        setLocalHours(entry?.duration ? (entry.duration / 60).toString() : "");
    }, [entry?.duration]);

    useEffect(() => {
        setLocalBadWeatherHours(entry?.badWeatherDuration ? (entry.badWeatherDuration / 60).toString() : "");
    }, [entry?.badWeatherDuration]);

    const dateObj = new Date(dateStr);
    const d = dateObj.getDate();
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    const rowClass = cn(
        "border-b border-slate-100 hover:bg-slate-50 transition-colors",
        isWeekend && "bg-slate-50/50",
        holidayName && "bg-purple-50/50",
        isModified && "bg-amber-50/30"
    );

    const isEditableType = !entry || ['WORK', 'BAD_WEATHER', 'WORK_BAD_WEATHER'].includes(entry.type);

    return (
        <tr className={rowClass}>
            <td className="px-4 py-3 whitespace-nowrap relative">
                {isModified && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />}
                {holidayName && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400" />}
                <div className="flex flex-col">
                    <span className={cn(
                        "text-sm font-bold", 
                        isWeekend ? "text-slate-400" : "text-slate-700",
                        holidayName && "text-purple-700"
                    )}>
                        {d.toString().padStart(2, '0')}.
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-medium">{weekdayNames[dayOfWeek]}</span>
                        {holidayName && <span className="text-[10px] text-purple-600 font-bold whitespace-nowrap">{holidayName}</span>}
                    </div>
                </div>
            </td>

            {/* Location */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        className="w-full text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
                        placeholder="Arbeitsort..."
                        value={localLocation}
                        onChange={(e) => {
                            setLocalLocation(e.target.value);
                            onUpdate(dateStr, 'location', e.target.value);
                        }}
                        disabled={isFinalized}
                    />
                </div>
            </td>

            {/* Type Selector */}
            <td className="px-4 py-3">
                <select
                    value={entry?.type || (isWeekend ? "" : "WORK")}
                    onChange={(e) => onUpdate(dateStr, 'type', e.target.value)}
                    className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border outline-none cursor-pointer",
                        !entry ? "text-slate-400 border-slate-200 bg-transparent" :
                            entry.type === 'WORK' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                                entry.type === 'BAD_WEATHER' ? "text-amber-700 bg-amber-50 border-amber-200" :
                                    entry.type === 'WORK_BAD_WEATHER' ? "text-indigo-700 bg-indigo-50 border-indigo-200" :
                                        entry.type === 'VACATION' ? "text-blue-600 bg-blue-50 border-blue-100" :
                                            entry.type === 'SICK' ? "text-rose-600 bg-rose-50 border-rose-100" :
                                                entry.type === 'HOLIDAY' ? "text-purple-600 bg-purple-50 border-purple-100" :
                                                    "text-slate-600 bg-slate-50 border-slate-100"
                    )}
                    disabled={isFinalized}
                >
                    <option value="WORK">Arbeit</option>
                    <option value="BAD_WEATHER">Schlechtwetter</option>
                    <option value="WORK_BAD_WEATHER">Gearbeitet + SW</option>
                    <option value="VACATION">Urlaub</option>
                    <option value="SICK">Krank</option>
                    <option value="HOLIDAY">Feiertag</option>
                    <option value="OFF">Frei</option>
                </select>
            </td>

            {/* Start / End */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all w-24">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        className="w-full text-sm font-medium text-slate-700 outline-none text-right"
                        placeholder="0"
                        value={localHours}
                        onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            setLocalHours(val);
                            const hours = parseFloat(val);
                            const mins = isNaN(hours) ? 0 : Math.round(hours * 60);
                            onUpdate(dateStr, 'duration', mins);
                        }}
                        disabled={isFinalized || !isEditableType}
                    />
                </div>
            </td>

            {/* Bad Weather Hours (Manual Input) */}
            <td className="px-4 py-3">
                <div className={cn(
                    "flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all w-24",
                    (entry && entry.type === 'WORK_BAD_WEATHER') ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    <input
                        type="text"
                        className="w-full text-sm font-medium text-slate-700 outline-none text-right text-sky-600"
                        placeholder="0"
                        value={localBadWeatherHours}
                        onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            setLocalBadWeatherHours(val);
                            const hours = parseFloat(val);
                            const mins = isNaN(hours) ? 0 : Math.round(hours * 60);
                            onUpdate(dateStr, 'badWeatherDuration', mins);
                        }}
                        disabled={isFinalized}
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
                        onChange={(e) => onUpdate(dateStr, 'overtime', parseFloat(e.target.value) || 0)}
                        disabled={isFinalized}
                    />
                </div>
            </td>
        </tr>
    );
});

TimeEntryRow.displayName = "TimeEntryRow";

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function formatHours(value: number) {
    return value.toFixed(2).replace('.', ',');
}

function getPreviousMonthValue() {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
}

function getPreviousMonth(month: string) {
    const [year, monthIndex] = month.split('-').map(Number);
    const date = new Date(year, monthIndex - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
}

export default function EmployeeTimeTrackingPage() {
    usePermissionGuard("time_tracking_use");
    const params = useParams();
    const router = useRouter();
    const employeeId = params.employeeId as string;

    // Hooks
    const { user, currentEmployee, profile } = useAuth();
    const { employees, isLoading: employeesLoading } = useEmployees();
    const { entries, deleteEntry, isLoading: entriesLoading, timesheets, finalizeMonth, reopenMonth, refreshEntries } = useTimeEntries();
    const { data: companySettings } = useCompanySettings();
    const { showToast, showConfirm } = useNotification();

    const activeUserId = user?.id ?? currentEmployee?.userId;
    const canReopenFinalizedMonth = profile?.role === 'admin' || profile?.role === 'developer';

    // State
    const [selectedMonth, setSelectedMonth] = useState<string>(getPreviousMonthValue());
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Buffered edits: state drives UI, ref drives save (no stale-closure risk)
    const [unsavedChanges, setUnsavedChanges] = useState<Record<string, TimeEntry>>({});
    const unsavedRef = useRef<Record<string, TimeEntry>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Keep ref in sync with state
    const setUnsaved = useCallback((updater: Record<string, TimeEntry> | ((prev: Record<string, TimeEntry>) => Record<string, TimeEntry>)) => {
        if (typeof updater === 'function') {
            setUnsavedChanges(prev => {
                const next = updater(prev);
                unsavedRef.current = next;
                return next;
            });
        } else {
            unsavedRef.current = updater;
            setUnsavedChanges(updater);
        }
    }, []);

    const employee = employees.find((e: Employee) => e.id === employeeId);

    // Ensure selectedMonth is not before employee startDate
    useEffect(() => {
        if (employee?.employment?.startDate) {
            const startMonthStr = employee.employment.startDate.slice(0, 7);
            if (selectedMonth < startMonthStr) {
                setSelectedMonth(startMonthStr);
            }
        }
    }, [employee, selectedMonth]);

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

    const currentTimesheet = useMemo(() => {
        return timesheets.find(t => t.employeeId === employeeId && t.month === selectedMonth);
    }, [timesheets, employeeId, selectedMonth]);

    const isFinalized = currentTimesheet ? currentTimesheet.status !== 'draft' : false;

    const displayedMonthEntries = useMemo(() => {
        const merged = new Map<string, TimeEntry>();
        monthEntries.forEach(entry => merged.set(entry.date, entry));
        Object.values(unsavedChanges)
            .filter(entry => entry.employeeId === employeeId && entry.date.startsWith(selectedMonth))
            .forEach(entry => merged.set(entry.date, entry));
        return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [monthEntries, unsavedChanges, employeeId, selectedMonth]);

    const missingWorkDays = useMemo(() => {
        if (!employee?.weeklySchedule) return [];

        const [year, month] = selectedMonth.split('-').map(Number);
        const dayMap: Record<number, keyof NonNullable<Employee['weeklySchedule']>> = {
            1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
        };
        const existingDates = new Set(displayedMonthEntries.map(entry => entry.date));
        const missing: string[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const schedule = employee.weeklySchedule[dayMap[date.getDay()]];
            const holiday = isAustrianHoliday(dateStr, companySettings?.state);

            if (schedule?.enabled && !holiday && !existingDates.has(dateStr)) {
                missing.push(dateStr);
            }
        }

        return missing;
    }, [employee, selectedMonth, daysInMonth, displayedMonthEntries, companySettings?.state]);

    const monthTotals = useMemo(() => {
        const getDurationHours = (entry: TimeEntry) => {
            if (typeof entry.duration === 'number') return entry.duration / 60;
            if (!entry.startTime || !entry.endTime) return 0;
            const start = new Date(`1970-01-01T${entry.startTime}`);
            const end = new Date(`1970-01-01T${entry.endTime}`);
            return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        };

        const getWorkHours = (entry: TimeEntry) => {
            if (entry.type !== 'WORK' && entry.type !== 'WORK_BAD_WEATHER') return 0;
            const total = getDurationHours(entry);
            if (entry.type !== 'WORK_BAD_WEATHER') return total;
            const badWeather = typeof entry.badWeatherDuration === 'number'
                ? entry.badWeatherDuration / 60
                : total / 2;
            return Math.max(0, total - badWeather);
        };

        const getBadWeatherHours = (entry: TimeEntry) => {
            if (entry.type !== 'BAD_WEATHER' && entry.type !== 'WORK_BAD_WEATHER') return 0;
            if (entry.type === 'BAD_WEATHER') return getDurationHours(entry);
            if (typeof entry.badWeatherDuration === 'number') return entry.badWeatherDuration / 60;
            return getDurationHours(entry) / 2;
        };

        return displayedMonthEntries.reduce((totals, entry) => {
            const workHours = getWorkHours(entry);

            return {
                workHours: totals.workHours + workHours,
                badWeatherHours: totals.badWeatherHours + getBadWeatherHours(entry),
                overtimeHours: totals.overtimeHours + (entry.overtime || 0),
                normalWorkDays: totals.normalWorkDays + (workHours > 3 && workHours < 9 ? 1 : 0),
                longWorkDays: totals.longWorkDays + (workHours >= 9 ? 1 : 0)
            };
        }, {
            workHours: 0,
            badWeatherHours: 0,
            overtimeHours: 0,
            normalWorkDays: 0,
            longWorkDays: 0
        });
    }, [displayedMonthEntries]);

    const handleUpdateEntry = useMemo(() => (date: string, field: keyof TimeEntry, value: any) => {
        if (isFinalized) return;

        setUnsaved(prev => {
            const existing = prev[date] || monthEntries.find(e => e.date === date);

            const dayMap: Record<number, keyof NonNullable<Employee['weeklySchedule']>> = {
                1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
            };

            const calculateAutoOvertime = (entry: TimeEntry) => {
                if (!employee || !employee.weeklySchedule) return entry.overtime || 0;

                // Only auto-calculate for work-related types
                if (!['WORK', 'BAD_WEATHER', 'WORK_BAD_WEATHER'].includes(entry.type)) {
                    return 0;
                }

                const dObj = new Date(entry.date);
                const dayName = dayMap[dObj.getDay()];
                const schedule = employee.weeklySchedule[dayName];

                if (schedule && schedule.enabled) {
                    const actualHours = (entry.duration || 0) / 60;
                    const targetHours = schedule.hours || 0;
                    return actualHours - targetHours;
                }

                // If the day is not in schedule (e.g. weekend work), all hours are overtime
                return (entry.duration || 0) / 60;
            };

            if (existing) {
                let updated = { ...existing, [field]: value };

                // Auto-calculate overtime if duration or type changes
                if (field === 'duration' || field === 'type') {
                    updated.overtime = calculateAutoOvertime(updated);
                }

                return {
                    ...prev,
                    [date]: updated
                };
            }

            // New Entry Scenario
            let newEntry: TimeEntry = {
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

            // Auto-calculate overtime for new entry
            newEntry.overtime = calculateAutoOvertime(newEntry);

            return {
                ...prev,
                [date]: newEntry
            };
        });
    }, [isFinalized, employeeId, monthEntries, employee, setUnsaved]);

    if (employeesLoading || entriesLoading) {
        return <div className="p-10 text-center text-slate-400">Laden...</div>;
    }

    if (!employee) {
        return <div className="p-10 text-center text-red-500">Mitarbeiter nicht gefunden.</div>;
    }

    if (employee.additionalInfo?.noTimeTrackingRequired === true) {
        return (
            <div className="p-10 min-h-screen flex items-center justify-center">
                <div className="max-w-lg w-full bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-6 w-6 text-slate-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Keine Zeiterfassung nötig</h1>
                    <p className="text-slate-500 font-medium mb-6">
                        Dieser Mitarbeiter ist in der Zeiteinteilung von der Zeiterfassung ausgenommen.
                    </p>
                    <button
                        onClick={() => router.push('/time-tracking')}
                        className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Zurück zur Auswahl
                    </button>
                </div>
            </div>
        );
    }

    // Handlers

    const performSave = async (): Promise<boolean> => {
        // Read from ref — always current even if closure is stale
        const changes = Object.values(unsavedRef.current);
        if (changes.length === 0) return true;

        setIsSaving(true);
        try {
            await Promise.all(changes.map(async (entry) => {
                let duration = 0;
                if (typeof entry.duration === 'number') {
                    duration = entry.duration;
                } else if (entry.type === 'WORK' && entry.startTime && entry.endTime) {
                    const start = new Date(`1970-01-01T${entry.startTime}`);
                    const end = new Date(`1970-01-01T${entry.endTime}`);
                    duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                }

                const res = await fetch('/api/time-entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: activeUserId, entry: { ...entry, duration } })
                });

                if (!res.ok) {
                    const text = await res.text().catch(() => String(res.status));
                    throw new Error(`${entry.date}: HTTP ${res.status} – ${text}`);
                }
            }));

            // Refresh FIRST so table never goes blank, then clear pending markers
            try { await refreshEntries(); } catch { /* ignore re-fetch errors */ }
            setUnsaved({});
            return true;
        } catch (e: any) {
            console.error("[performSave]", e);
            showToast(`Fehler beim Speichern: ${e.message}`, "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveChanges = async () => {
        if (Object.keys(unsavedRef.current).length === 0) return;
        const success = await performSave();
        if (success) {
            showToast("Erfolgreich gespeichert!", "success");
        }
    };

    const generateAndUploadTimesheetPdf = async () => {
        if (!employee || !companySettings) {
            throw new Error("Mitarbeiter- oder Firmendaten fehlen.");
        }

        const { pdf } = await import('@react-pdf/renderer');
        const { TimesheetReactPDF } = await import('@/components/TimesheetReactPDF');
        const timesheetId = `${employeeId}-${selectedMonth}`;
        const blob = await pdf(
            <TimesheetReactPDF
                entries={displayedMonthEntries}
                employee={employee}
                month={selectedMonth}
                companySettings={companySettings}
            /> as any
        ).toBlob();

        const formData = new FormData();
        formData.append('file', blob, `Stundenzettel-${employee.personalData.lastName}-${selectedMonth}.pdf`);
        formData.append('timesheetId', timesheetId);
        formData.append('employeeName', `${employee.personalData.firstName}-${employee.personalData.lastName}`);
        formData.append('month', selectedMonth);
        if (currentTimesheet?.pdfUrl && !currentTimesheet.pdfUrl.startsWith('http')) {
            formData.append('previousPdfPath', currentTimesheet.pdfUrl);
        }

        const res = await fetch('/api/timesheets/pdf-upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const text = await res.text().catch(() => String(res.status));
            throw new Error(`PDF konnte nicht gespeichert werden: ${res.status} ${text}`);
        }

        const data = await res.json();
        if (!data.pdfPath) {
            throw new Error("PDF wurde hochgeladen, aber kein Speicherpfad wurde zurückgegeben.");
        }

        return data.pdfPath as string;
    };

    const handleExport = async () => {
        if (isFinalized && currentTimesheet?.pdfUrl) {
            try {
                const res = await fetch(`/api/timesheets/pdf-url?id=${encodeURIComponent(currentTimesheet.id)}`);
                if (!res.ok) {
                    const text = await res.text().catch(() => String(res.status));
                    throw new Error(`HTTP ${res.status}: ${text}`);
                }
                const data = await res.json();
                window.open(data.url, '_blank', 'noopener,noreferrer');
                return;
            } catch (e) {
                console.error('[Timesheet Stored PDF Preview]', e);
                showToast("Gespeicherte PDF konnte nicht geöffnet werden.", "error");
            }
        }

        setIsPreviewModalOpen(true);
    };

    const handleFinalize = () => {
        showConfirm({
            title: "Monat abschließen?",
            message: "Ungespeicherte Änderungen werden automatisch übernommen. Nach dem Abschließen sind Änderungen nur eingeschränkt möglich.",
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    // 1. Auto-save if there are changes
                    const saveSuccess = await performSave();
                    if (!saveSuccess) return;

                    // 2. Render and store locked PDF
                    const pdfPath = await generateAndUploadTimesheetPdf();

                    // 3. Finalize
                    await finalizeMonth(employeeId, selectedMonth, pdfPath);
                    showToast("Monat erfolgreich abgeschlossen!", "success");
                } catch (e) {
                    console.error("Finalization failed", e);
                    showToast("Fehler beim Abschließen.", "error");
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    const handleAutoFill = () => {
        showConfirm({
            title: "Monat automatisch befüllen?",
            message: `Möchten Sie den gesamten Monat ${selectedMonth} automatisch befüllen? Bestehende Einträge bleiben erhalten.`,
            onConfirm: async () => {
                const [year, month] = selectedMonth.split('-').map(Number);

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

                    const holiday = isAustrianHoliday(dateStr, companySettings?.state);

                    if (holiday) {
                        updates[dateStr] = {
                            id: Math.random().toString(36).substr(2, 9),
                            employeeId,
                            date: dateStr,
                            startTime: "",
                            endTime: "",
                            breakDuration: 0,
                            type: "HOLIDAY",
                            createdAt: new Date().toISOString(),
                            overtime: 0,
                            location: holiday.name,
                            duration: (schedule?.hours || 0) * 60 // Give holiday hours based on schedule
                        };
                    } else if (schedule?.enabled) {
                        const hours = Number(schedule.hours) || 0;
                        updates[dateStr] = {
                            id: Math.random().toString(36).substr(2, 9),
                            employeeId,
                            date: dateStr,
                            startTime: "08:00",
                            endTime: "16:00", 
                            breakDuration: 0, 
                            type: "WORK",
                            createdAt: new Date().toISOString(),
                            overtime: 0,
                            location: "Hauptsitz", 
                            duration: hours * 60 
                        };
                    }
                }

                // Add to unsaved changes instead of direct save
                setUnsaved(prev => ({ ...prev, ...updates }));
                showToast("Monat befüllt! Bitte speichern Sie Ihre Änderungen.", "info");
            }
        });
    };

    const handleCopyPreviousMonth = () => {
        if (isFinalized) return;

        const previousMonth = getPreviousMonth(selectedMonth);
        const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);
        const targetDays = getDaysInMonth(targetYear, targetMonth);
        const previousEntries = entries
            .filter(entry => entry.employeeId === employeeId && entry.date.startsWith(previousMonth))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (previousEntries.length === 0) {
            showToast("Im Vormonat wurden keine Zeiten gefunden.", "info");
            return;
        }

        const updates: Record<string, TimeEntry> = {};
        let copiedCount = 0;

        previousEntries.forEach(entry => {
            const day = Number(entry.date.slice(-2));
            if (!day || day > targetDays) return;

            const targetDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            if (monthEntries.some(e => e.date === targetDate) || unsavedChanges[targetDate]) return;

            updates[targetDate] = {
                ...entry,
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                createdAt: new Date().toISOString()
            };
            copiedCount += 1;
        });

        if (copiedCount === 0) {
            showToast("Es gibt keine freien Tage, die übernommen werden können.", "info");
            return;
        }

        setUnsaved(prev => ({ ...prev, ...updates }));
        showToast(`${copiedCount} Tage aus dem Vormonat übernommen. Bitte speichern.`, "success");
    };

    const handleResetMonth = async () => {
        setIsSaving(true);
        try {
            // 1. Delete all existing entries from DB
            const idsToDelete = monthEntries.map(e => e.id);
            // We can run these in parallel
            await Promise.all(idsToDelete.map(id => deleteEntry(id)));

            // 2. Clear from unsaved changes
            setUnsaved(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key.startsWith(selectedMonth)) {
                        delete next[key];
                    }
                });
                return next;
            });
            showToast("Monat geleert! Alle Einträge für diesen Monat wurden entfernt.", "success");
        } catch (e: any) {
            console.error("Clear failed", e);
            showToast("Fehler beim Leeren! Bitte versuchen Sie es erneut.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Render Table Rows
    const renderRows = () => {
        const rows = [];
        const [year, month] = selectedMonth.split('-').map(Number);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const entry = unsavedChanges[dateStr] || monthEntries.find(e => e.date === dateStr);
            const isModified = !!unsavedChanges[dateStr];
            
            const holiday = isAustrianHoliday(dateStr, companySettings?.state);

            rows.push(
                <TimeEntryRow
                    key={dateStr}
                    dateStr={dateStr}
                    entry={entry}
                    isModified={isModified}
                    isFinalized={isFinalized}
                    holidayName={holiday?.name}
                    onUpdate={handleUpdateEntry}
                />
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
                            {(() => {
                                const startMonthStr = employee?.employment?.startDate ? employee.employment.startDate.slice(0, 7) : '2024-01';
                                const options = [];
                                // Generate months from 12 months ago until 1 month in the future
                                for (let i = 0; i < 14; i++) {
                                    const date = new Date();
                                    date.setMonth(date.getMonth() - (12 - i));
                                    const value = date.toISOString().slice(0, 7);
                                    
                                    // Only add if month is at or after employee's start date
                                    if (value >= startMonthStr) {
                                        const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                                        const status = timesheets.find(t => t.employeeId === employeeId && t.month === value)?.status;
                                        const labelStatus = status && status !== 'draft' ? 'gesperrt' : 'offen';
                                        options.push(
                                            <option key={value} value={value}>
                                                {label} - {labelStatus}
                                            </option>
                                        );
                                    }
                                }
                                return options;
                            })()}
                        </select>
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black",
                        isFinalized
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                        {isFinalized ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                        {isFinalized ? "Abgeschlossen" : "Offen"}
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
                        onClick={handleCopyPreviousMonth}
                        disabled={isFinalized}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all",
                            isFinalized
                                ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
                                : "bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-indigo-100"
                        )}
                    >
                        <Copy className="h-4 w-4" />
                        Vormonat übernehmen
                    </button>

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
                        onClick={() => {
                            showConfirm({
                                title: "Daten leeren?",
                                message: "Alle eingetragenen Stunden für diesen Monat werden zurückgesetzt. Dieser Vorgang kann nicht rückgängig gemacht werden.",
                                variant: 'danger',
                                confirmLabel: "Jetzt leeren",
                                onConfirm: handleResetMonth
                            });
                        }}
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
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all hover:scale-105 shadow-sm"
                    >
                        <Printer className="h-4 w-4" />
                        Exportieren
                    </button>

                    {!isFinalized ? (
                        <button
                            onClick={handleFinalize}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all hover:scale-105 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Wird verarbeitet..." : "Abschließen"}
                        </button>
                    ) : canReopenFinalizedMonth ? (
                        <button
                            onClick={() => {
                                showConfirm({
                                    title: "Monat wieder öffnen?",
                                    message: "Der Monat wird für Bearbeitungen wieder freigegeben.",
                                    onConfirm: async () => {
                                        try {
                                            await reopenMonth(employeeId, selectedMonth);
                                            showToast("Monat wieder geöffnet!", "success");
                                        } catch (e: any) {
                                            showToast(`Fehler: ${e.message}`, "error");
                                        }
                                    }
                                });
                            }}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all"
                        >
                            <Save className="h-4 w-4" />
                            Wieder öffnen
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 text-slate-400 font-bold text-sm border border-slate-100">
                            Nur Admin kann wieder öffnen
                        </div>
                    )}
                </div>

            </div>

            {missingWorkDays.length > 0 && !isFinalized && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black">
                            Noch {missingWorkDays.length} Arbeitstage ohne Eintrag
                        </p>
                        <p className="text-xs font-bold text-amber-700/80">
                            {missingWorkDays.slice(0, 8).map(date => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })).join(', ')}
                            {missingWorkDays.length > 8 ? ' ...' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleAutoFill}
                        className="rounded-xl bg-white px-4 py-2 text-xs font-black text-amber-700 shadow-sm border border-amber-100 hover:bg-amber-100 transition-colors"
                    >
                        Fehlende Tage füllen
                    </button>
                </div>
            )}


            {/* Main Table */}
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                            <th className="px-4 py-4 w-24">Datum</th>
                            <th className="px-4 py-4 w-48">Arbeitsort</th>
                            <th className="px-4 py-4 w-32">Typ</th>
                            <th className="px-4 py-4 w-40">Stunden</th>
                            <th className="px-4 py-4 w-24">SW Std</th>
                            <th className="px-4 py-4 w-32">Überstunden</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {renderRows()}
                    </tbody>
                </table>
            </div>

            <div className="sticky bottom-4 z-30 mt-2 rounded-[1.75rem] bg-white/90 p-3 shadow-2xl shadow-slate-200/70 ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.16em]">Tage 3-8 Std.</p>
                        <p className="text-2xl font-black text-indigo-700 mt-2">{monthTotals.normalWorkDays}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Arbeitstage</p>
                    </div>
                    <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.16em]">Tage ab 9 Std.</p>
                        <p className="text-2xl font-black text-rose-700 mt-2">{monthTotals.longWorkDays}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Lange Tage</p>
                    </div>
                    <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.16em]">Stunden</p>
                        <p className="text-2xl font-black text-emerald-700 mt-2">{formatHours(monthTotals.workHours)}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Arbeitsstunden</p>
                    </div>
                    <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.16em]">SW Stunden</p>
                        <p className="text-2xl font-black text-sky-700 mt-2">{formatHours(monthTotals.badWeatherHours)}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Schlechtwetter</p>
                    </div>
                    <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.16em]">Überstunden</p>
                        <p className="text-2xl font-black text-amber-700 mt-2">{formatHours(monthTotals.overtimeHours)}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Manuell/automatisch</p>
                    </div>
                </div>
            </div>

            {/* Export Modal */}
            <TimeTrackingPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                entries={displayedMonthEntries}
                employee={employee}
                month={selectedMonth}
                companySettings={companySettings}
            />
        </div >
    );
}
