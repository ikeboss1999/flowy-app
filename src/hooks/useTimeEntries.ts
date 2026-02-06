"use client";

import { useState, useEffect } from 'react';
import { TimeEntry, TimesheetMeta } from '@/types/time-tracking';
import { useAuth } from '@/context/AuthContext';

const ENTRIES_KEY = 'flowy_time_entries';
const SHEETS_KEY = 'flowy_timesheets';

export function useTimeEntries() {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Load Time Entries
                const entryRes = await fetch(`/api/time-entries?userId=${user.id}`);
                const entryData = await entryRes.json();

                if (Array.isArray(entryData) && entryData.length > 0) {
                    setEntries(entryData);
                } else {
                    // Migrate entries
                    const saved = localStorage.getItem(ENTRIES_KEY);
                    if (saved) {
                        const local = JSON.parse(saved).filter((e: any) => e.userId === user.id || !e.userId);
                        for (const item of local) {
                            await fetch('/api/time-entries', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, entry: { ...item, userId: user.id } })
                            });
                        }
                        setEntries(local.map((e: any) => ({ ...e, userId: user.id })));
                    }
                }

                // Load Timesheets
                const sheetRes = await fetch(`/api/timesheets?userId=${user.id}`);
                const sheetData = await sheetRes.json();

                if (Array.isArray(sheetData) && sheetData.length > 0) {
                    setTimesheets(sheetData);
                } else {
                    // Migrate sheets
                    const saved = localStorage.getItem(SHEETS_KEY);
                    if (saved) {
                        const local = JSON.parse(saved).filter((t: any) => t.userId === user.id || !t.userId);
                        for (const item of local) {
                            await fetch('/api/timesheets', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, timesheet: { ...item, userId: user.id } })
                            });
                        }
                        setTimesheets(local.map((t: any) => ({ ...t, userId: user.id })));
                    }
                }
            } catch (e) {
                console.error(e);
            }
            setIsLoading(false);
        };
        loadData();
    }, [user, authLoading]);

    const addEntry = async (entry: TimeEntry) => {
        if (!user) throw new Error("User not authenticated");
        const newEntry = { ...entry, userId: user.id };
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, entry: newEntry })
            });
            if (!res.ok) throw new Error("Failed to save entry");
            setEntries(prev => [newEntry, ...prev]);
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
        if (!user) throw new Error("User not authenticated");
        const entry = entries.find(e => e.id === id);
        if (!entry) throw new Error("Entry not found");
        const updated = { ...entry, ...updates };
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, entry: updated })
            });
            if (!res.ok) throw new Error("Failed to update entry");
            setEntries(prev => prev.map(e => e.id === id ? updated : e));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deleteEntry = async (id: string) => {
        if (!user) return;
        try {
            await fetch(`/api/time-entries/${id}`, { method: 'DELETE' });
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (e) { console.error(e); }
    };

    const addEntries = async (newEntries: TimeEntry[]) => {
        if (!user) return;
        for (const entry of newEntries) {
            await addEntry(entry);
        }
    };

    const finalizeMonth = async (employeeId: string, month: string) => {
        if (!user) return;
        const id = `${employeeId}-${month}`;
        const newTimesheet: TimesheetMeta = {
            id,
            employeeId,
            month,
            status: 'finalized',
            finalizedAt: new Date().toISOString(),
            userId: user.id
        };
        try {
            await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, timesheet: newTimesheet })
            });
            setTimesheets(prev => {
                const others = prev.filter(t => t.id !== id);
                return [...others, newTimesheet];
            });
        } catch (e) { console.error(e); }
    };

    const reopenMonth = async (employeeId: string, month: string) => {
        if (!user) return;
        const id = `${employeeId}-${month}`;
        // In this implementation, reopening just means deleting the timesheet record 
        // OR updating its status. For simplicity with existing UI, let's keep it as is.
        // But we need a way to "reopen" in SQLite.
        const current = timesheets.find(t => t.id === id);
        if (!current) return;
        const updated = { ...current, status: 'draft' as const, finalizedAt: undefined };
        try {
            await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, timesheet: updated })
            });
            setTimesheets(prev => prev.filter(t => t.id !== id));
        } catch (e) { console.error(e); }
    };

    const getMonthStatus = (employeeId: string, month: string) => {
        const found = timesheets.find(t => t.employeeId === employeeId && t.month === month);
        return found ? found.status : 'draft';
    };

    const getFinalizedDate = (employeeId: string, month: string) => {
        const found = timesheets.find(t => t.employeeId === employeeId && t.month === month);
        return found ? found.finalizedAt : null;
    };

    return {
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        addEntries,
        isLoading: isLoading || authLoading,
        finalizeMonth,
        reopenMonth,
        getMonthStatus,
        getFinalizedDate,
        timesheets
    };
}
