"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import { TimeEntry, TimesheetMeta } from '@/types/time-tracking';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useTimeEntries() {
    const { user, currentEmployee } = useAuth();
    const { markDirty } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;

    const entriesKey = activeUserId ? `/api/time-entries?userId=${activeUserId}` : null;
    const sheetsKey = activeUserId ? `/api/timesheets?userId=${activeUserId}` : null;

    const { data: rawEntries = [], isLoading: entriesLoading, mutate: mutateEntries } =
        useSWR<TimeEntry[]>(entriesKey, fetcher);
    const { data: timesheets = [], isLoading: sheetsLoading, mutate: mutateTimesheets } =
        useSWR<TimesheetMeta[]>(sheetsKey, fetcher);

    const entries = currentEmployee && !user
        ? rawEntries.filter(e => e.employeeId === currentEmployee.id)
        : rawEntries;

    const addEntry = async (entry: TimeEntry) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const newEntry = { ...entry, userId: activeUserId };
        // Functional updater avoids stale-closure bug in bulk-save loops
        mutateEntries(current => [newEntry, ...(current ?? [])], { revalidate: false });
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, entry: newEntry })
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to save entry: ${res.status} ${errorText}`);
            }
            markDirty();
        } catch (e) {
            console.error(e);
            mutateEntries();
            throw e;
        }
    };

    const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const entry = rawEntries.find(e => e.id === id);
        if (!entry) throw new Error("Entry not found");
        const updated = { ...entry, ...updates };
        mutateEntries(current => (current ?? []).map(e => e.id === id ? updated : e), { revalidate: false });
        try {
            const res = await fetch('/api/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, entry: updated })
            });
            if (!res.ok) throw new Error("Failed to update entry");
            markDirty();
        } catch (e) {
            console.error(e);
            mutateEntries();
            throw e;
        }
    };

    const deleteEntry = async (id: string) => {
        if (!activeUserId) return;
        mutateEntries(current => (current ?? []).filter(e => e.id !== id), { revalidate: false });
        try {
            await fetch(`/api/time-entries/${id}?userId=${activeUserId}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error(e);
            mutateEntries();
        }
    };

    const addEntries = async (newEntries: TimeEntry[]) => {
        if (!user) return;
        for (const entry of newEntries) {
            await addEntry(entry);
        }
    };

    const finalizeMonth = async (employeeId: string, month: string) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const id = `${employeeId}-${month}`;
        const newTimesheet: TimesheetMeta = {
            id, employeeId, month,
            status: 'finalized',
            finalizedAt: new Date().toISOString(),
            userId: activeUserId
        };
        const updated = [...timesheets.filter(t => t.id !== id), newTimesheet];
        mutateTimesheets(updated, false);
        try {
            const res = await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, timesheet: newTimesheet })
            });
            if (!res.ok) {
                const text = await res.text().catch(() => String(res.status));
                throw new Error(`HTTP ${res.status}: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error('[finalizeMonth]', e);
            mutateTimesheets();
            throw e;
        }
    };

    const reopenMonth = async (employeeId: string, month: string) => {
        if (!activeUserId) throw new Error("Not authenticated");
        const id = `${employeeId}-${month}`;
        const current = timesheets.find(t => t.id === id);
        if (!current) return;
        mutateTimesheets(timesheets.filter(t => t.id !== id), false);
        try {
            const res = await fetch('/api/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, timesheet: { ...current, status: 'draft', finalizedAt: undefined } })
            });
            if (!res.ok) {
                const text = await res.text().catch(() => String(res.status));
                throw new Error(`HTTP ${res.status}: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error('[reopenMonth]', e);
            mutateTimesheets();
            throw e;
        }
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
        isLoading: entriesLoading || sheetsLoading,
        finalizeMonth,
        reopenMonth,
        getMonthStatus,
        getFinalizedDate,
        timesheets,
        refreshEntries: () => mutateEntries()
    };
}
