"use client";

import React, { useState, useMemo } from "react";
import {
    Clock,
    Calendar,
    Filter,
    Plus,
    MoreHorizontal,
    Edit2,
    Trash2,
    User,
    Briefcase,
    Zap,
    Printer,
    CheckCircle,
    Lock,
    Unlock
} from "lucide-react";
import { TimeEntry, TimeEntryType } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { TimeEntryModal } from "@/components/TimeEntryModal";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { TimeTrackingPreviewModal } from "@/components/TimeTrackingPreviewModal";

export default function TimeTrackingPage() {
    const { employees, isLoading: employeesLoading } = useEmployees();
    const {
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        addEntries,
        isLoading: entriesLoading,
        finalizeMonth,
        reopenMonth,
        getMonthStatus,
        getFinalizedDate
    } = useTimeEntries();

    const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>();
    const { data: companySettings } = useCompanySettings();

    const isLoading = employeesLoading || entriesLoading;

    // Check Status
    const monthStatus = selectedEmployee !== "ALL" ? getMonthStatus(selectedEmployee, selectedMonth) : 'draft';
    const isFinalized = monthStatus === 'finalized';
    const finalizedDate = selectedEmployee !== "ALL" ? getFinalizedDate(selectedEmployee, selectedMonth) : null;

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const matchesEmployee = selectedEmployee === "ALL" || entry.employeeId === selectedEmployee;
            const matchesMonth = entry.date.startsWith(selectedMonth);
            return matchesEmployee && matchesMonth;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [entries, selectedEmployee, selectedMonth]);

    const stats = useMemo(() => {
        let totalHours = 0;
        let workDays = 0;
        let sickDays = 0;
        let vacationDays = 0;

        filteredEntries.forEach(entry => {
            if (entry.type === "WORK") {
                const start = new Date(`1970-01-01T${entry.startTime}`);
                const end = new Date(`1970-01-01T${entry.endTime}`);
                const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
                const netHours = diff - (entry.breakDuration / 60);
                totalHours += netHours > 0 ? netHours : 0;
                workDays++;
            } else if (entry.type === "SICK") sickDays++;
            else if (entry.type === "VACATION") vacationDays++;
        });

        return { totalHours, workDays, sickDays, vacationDays };
    }, [filteredEntries]);

    const handleSaveEntry = (entry: TimeEntry) => {
        if (editingEntry) {
            updateEntry(entry.id, entry);
        } else {
            addEntry(entry);
        }
    };

    const handleDeleteEntry = (id: string) => {
        if (confirm("Eintrag wirklich löschen?")) {
            deleteEntry(id);
        }
    };

    const handleAutoFill = () => {
        if (selectedEmployee === "ALL") {
            alert("Bitte wählen Sie zuerst einen Mitarbeiter aus.");
            return;
        }

        const employee = employees.find(e => e.id === selectedEmployee);
        if (!employee || !employee.weeklySchedule) {
            alert("Dieser Mitarbeiter hat keine Zeiteinteilung hinterlegt.");
            return;
        }

        const [year, month] = selectedMonth.split('-').map(Number);

        // window.confirm is more explicit
        const confirmMsg = `Möchten Sie den Monat ${selectedMonth} für ${employee.personalData.firstName} ${employee.personalData.lastName} automatisch ausfüllen? Schon vorhandene Einträge werden übersprungen.`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        const newEntries: TimeEntry[] = [];

        const dayMap: Record<number, keyof NonNullable<Employee['weeklySchedule']>> = {
            1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
        };

        console.log(`AutoFill: Filling ${daysInMonth} days for ${selectedMonth}`);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            // Manual ISO date to avoid timezone offset issues
            const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            const dayOfWeek = date.getDay();
            const scheduleKey = dayMap[dayOfWeek];
            const schedule = employee.weeklySchedule[scheduleKey];

            if (!schedule || !schedule.enabled) {
                continue;
            }

            // Check if entry already exists
            const exists = entries.some(e => e.employeeId === selectedEmployee && e.date === isoDate);
            if (exists) {
                continue;
            }

            // EndTime calculation: Start 08:00 + schedule.hours + 1 hour break
            const totalHoursWithBreak = schedule.hours + 1;
            const endHour = 8 + totalHoursWithBreak;
            const endTimeStr = `${Math.floor(endHour).toString().padStart(2, '0')}:${((endHour % 1) * 60).toString().padStart(2, '0')}`;

            newEntries.push({
                id: Math.random().toString(36).substr(2, 9),
                employeeId: selectedEmployee,
                date: isoDate,
                startTime: "08:00",
                endTime: endTimeStr,
                breakDuration: 60,
                type: "WORK",
                createdAt: new Date().toISOString()
            });
        }

        if (newEntries.length > 0) {
            addEntries(newEntries);
            alert(`${newEntries.length} Einträge wurden erfolgreich erstellt.`);
        } else {
            alert("Es konnten keine neuen Einträge erstellt werden (entweder sind alle Tage schon befüllt oder keine Arbeitstage definiert).");
        }
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.personalData.firstName} ${emp.personalData.lastName}` : "Unbekannt";
    };

    const getTypeStyle = (type: TimeEntryType) => {
        switch (type) {
            case "WORK": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "VACATION": return "bg-amber-50 text-amber-600 border-amber-100";
            case "SICK": return "bg-rose-50 text-rose-600 border-rose-100";
            case "HOLIDAY": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            default: return "bg-slate-50 text-slate-600";
        }
    };

    const getTypeLabel = (type: TimeEntryType) => {
        switch (type) {
            case "WORK": return "Arbeit";
            case "VACATION": return "Urlaub";
            case "SICK": return "Krank";
            case "HOLIDAY": return "Feiertag";
            default: return type;
        }
    };

    if (isLoading) {
        return (
            <div className="p-10 flex items-center justify-center">
                <div className="text-slate-400 font-bold">Laden...</div>
            </div>
        );
    }

    return (
        <div className="p-10 animate-in fade-in duration-500 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">HR Management</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Zeiten <span className="text-slate-300 font-light">Erfassen</span>
                    </h1>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[20px] font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer hover:bg-slate-50 appearance-none min-w-[200px]"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = new Date();
                                date.setMonth(date.getMonth() - (11 - i));
                                const value = date.toISOString().slice(0, 7);
                                const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                                return (
                                    <option key={value} value={value}>
                                        {label.charAt(0).toUpperCase() + label.slice(1)}
                                    </option>
                                );
                            })}
                        </select>
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Finalized Banner */}
                        {isFinalized && (
                            <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 flex items-center gap-3 text-amber-800 animate-in slide-in-from-top-2">
                                <Lock className="h-5 w-5" />
                                <div>
                                    <span className="font-bold">Dieser Monat ist archiviert.</span>
                                    <span className="opacity-80 ml-2">
                                        Am {finalizedDate ? new Date(finalizedDate).toLocaleDateString('de-DE') : ''} abgeschlossen.
                                        Klicken Sie auf "Bearbeiten", um Änderungen vorzunehmen.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setEditingEntry(undefined);
                            setIsModalOpen(true);
                        }}
                        disabled={isFinalized}
                        className={cn(
                            "px-8 py-4 rounded-[20px] font-bold shadow-xl flex items-center gap-3 transition-all",
                            isFinalized
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-primary-gradient text-white shadow-indigo-500/20 hover:scale-105 active:scale-95"
                        )}
                    >
                        {isFinalized ? <Lock className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        {isFinalized ? "Archiviert" : "Zeit erfassen"}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-indigo-600 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10">
                        <p className="text-indigo-200 font-bold text-xs uppercase tracking-widest mb-2">Gesamtstunden</p>
                        <p className="text-4xl font-black">{stats.totalHours.toFixed(1)} h</p>
                        <p className="text-indigo-200 text-sm mt-2 font-medium">im ausgewählten Monat</p>
                    </div>
                </div>
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm hover:border-emerald-100 transition-colors">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Arbeitstage</p>
                    <p className="text-3xl font-black text-slate-900">{stats.workDays} <span className="text-lg text-slate-400 font-medium">Tage</span></p>
                </div>
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Urlaub</p>
                    <p className="text-3xl font-black text-slate-900">{stats.vacationDays} <span className="text-lg text-slate-400 font-medium">Tage</span></p>
                </div>
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm hover:border-rose-100 transition-colors">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Krankheit</p>
                    <p className="text-3xl font-black text-slate-900">{stats.sickDays} <span className="text-lg text-slate-400 font-medium">Tage</span></p>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                        <User className="h-4 w-4 text-slate-400" />
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 min-w-[150px]"
                        >
                            <option value="ALL">Alle Mitarbeiter</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.personalData.firstName} {emp.personalData.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={() => setIsPreviewModalOpen(true)}
                        disabled={selectedEmployee === "ALL" || filteredEntries.length === 0}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                            (selectedEmployee === "ALL" || filteredEntries.length === 0)
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
                        )}
                    >
                        <Printer className="h-4 w-4" />
                        PDF Export
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={handleAutoFill}
                        disabled={selectedEmployee === "ALL"}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                            selectedEmployee === "ALL"
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        )}
                    >
                        <Zap className="h-4 w-4" />
                        Monat ausfüllen
                    </button>
                    <span className="text-slate-300">|</span>

                    {/* Finalize Control */}
                    <button
                        onClick={() => {
                            if (isFinalized) {
                                if (confirm("Möchten Sie diesen Monat wieder öffnen? Das Archiv-Datum wird gelöscht.")) {
                                    reopenMonth(selectedEmployee, selectedMonth);
                                }
                            } else {
                                if (confirm("Möchten Sie diesen Monat als 'Fertig' markieren und archivieren?")) {
                                    finalizeMonth(selectedEmployee, selectedMonth);
                                }
                            }
                        }}
                        disabled={selectedEmployee === "ALL"}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                            selectedEmployee === "ALL"
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : isFinalized
                                    ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        )}
                    >
                        {isFinalized ? (
                            <>
                                <Unlock className="h-4 w-4" />
                                Bearbeiten (Archiviert)
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Abschließen
                            </>
                        )}
                    </button>

                    <span className="text-slate-300">|</span>
                    <span className="text-slate-400 font-medium text-sm">
                        {filteredEntries.length} Einträge gefunden
                    </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Mitarbeiter</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Typ</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Zeit</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Pause</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Projekt</th>
                                <th className="px-6 py-4 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        Keine Einträge für diesen Zeitraum gefunden.
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600">
                                            {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {getEmployeeName(entry.employeeId)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getTypeStyle(entry.type))}>
                                                {getTypeLabel(entry.type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {entry.type === 'WORK' ? `${entry.startTime} - ${entry.endTime}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500">
                                            {entry.type === 'WORK' ? `${entry.breakDuration} min` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {entry.projectId && (
                                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                    {entry.projectId}
                                                </div>
                                            )}
                                            {entry.notes && (
                                                <span className="text-xs text-slate-400 italic block mt-1">{entry.notes}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                {!isFinalized && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingEntry(entry);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEntry(entry.id)}
                                                            className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {isFinalized && (
                                                    <span className="text-xs text-slate-300 font-bold px-2 py-1">Archiviert</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TimeEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEntry}
                employees={employees}
                initialEntry={editingEntry}
            />

            <TimeTrackingPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                entries={filteredEntries}
                employee={employees.find(e => e.id === selectedEmployee) || null}
                month={selectedMonth}
                companySettings={companySettings}
            />
        </div >
    );
}
