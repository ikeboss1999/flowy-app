"use client";

import { useState, useEffect } from 'react';
import { TimeEntry, TimesheetMeta } from '@/types/time-tracking';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

const ENTRIES_KEY = 'flowy_time_entries';
const SHEETS_KEY = 'flowy_timesheets';

export function useTimeEntries() {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, currentEmployee, isLoading: authLoading } = useAuth();
    const { markDirty } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;

    useEffect(() => {
        if (authLoading || !activeUserId) {
            if (!authLoading && !activeUserId) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Load Time Entries
                const entryRes = await fetch(`/api/time-entries?userId=${activeUserId}`);
                const entryData = await entryRes.json();

                if (Array.isArray(entryData) && entryData.length > 0) {
                    // Filter for current employee if not admin
                    const filteredData = currentEmployee && !user
                        ? entryData.filter((e: TimeEntry) => e.employeeId === currentEmployee.id)
                        : entryData;
                    setEntries(filteredData);
                } else {
                    // Only migrate if admin
                    if (user) {
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
                }

                // Load Timesheets
                const sheetRes = await fetch(`/api/timesheets?userId=${activeUserId}`);
                const sheetData = await sheetRes.json();

                if (Array.isArray(sheetData) && sheetData.length > 0) {
                    setTimesheets(sheetData);
                }
            } catch (e) {
                console.error(e);
            }
            setIsLoading(false);
        };
        loadData();
    }, [activeUserId, authLoading, currentEmployee?.id, user?.id]);

    const addEntry = async (entry: TimeEntry) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const newEntry = { ...entry, userId: activeUserId };
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, entry: newEntry })
            });
            if (!res.ok) throw new Error("Failed to save entry");
            setEntries(prev => [newEntry, ...prev]);
            markDirty();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const entry = entries.find(e => e.id === id);
        if (!entry) throw new Error("Entry not found");
        const updated = { ...entry, ...updates };
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, entry: updated })
            });
            if (!res.ok) throw new Error("Failed to update entry");
            setEntries(prev => prev.map(e => e.id === id ? updated : e));
            markDirty();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deleteEntry = async (id: string) => {
        if (!activeUserId) return;
        try {
            await fetch(`/api/time-entries/${id}?userId=${activeUserId}`, { method: 'DELETE' });
            setEntries(prev => prev.filter(e => e.id !== id));
            markDirty();
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
            markDirty();
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
            markDirty();
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
