"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import { Employee } from '@/types/employee';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useEmployees() {
    const { user, currentEmployee, refreshEmployee } = useAuth();
    const { markDirty, lastSyncTime } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId ? `/api/employees?userId=${activeUserId}` : null;

    const { data = [], isLoading, mutate } = useSWR<Employee[]>(key, fetcher);

    // Re-fetch after a cloud sync
    useEffect(() => {
        if (lastSyncTime) mutate();
    }, [lastSyncTime]);

    const addEmployee = async (employee: Employee) => {
        const targetUserId = user?.id || currentEmployee?.userId;
        if (!targetUserId) return;
        const newEmployee = { ...employee, userId: targetUserId };
        mutate([...data, newEmployee], false);
        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId, employee: newEmployee })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }
            markDirty();
        } catch (e) {
            console.error('Failed to add employee', e);
            mutate();
        }
    };

    const updateEmployee = async (id: string, employee: Employee) => {
        const targetUserId = user?.id || employee.userId || currentEmployee?.userId;
        if (!targetUserId) return;
        const updated = { ...employee, userId: targetUserId };
        mutate(data.map(e => e.id === id ? updated : e), false);
        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId, employee: updated })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }
            markDirty();
            if (currentEmployee?.id === id) refreshEmployee();
        } catch (e) {
            console.error('Failed to update employee', e);
            mutate();
        }
    };

    const requestEmployeeUpdate = async (id: string, pendingChanges: Partial<Employee>) => {
        const employee = data.find(e => e.id === id);
        if (!employee || !activeUserId) return;
        if (!pendingChanges || Object.keys(pendingChanges).length === 0) {
            console.warn('[useEmployees] Skipping requestEmployeeUpdate: No changes detected.');
            return { success: true };
        }
        const updated = { ...employee, pendingChanges };
        mutate(data.map(e => e.id === id ? updated : e), false);
        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, employee: updated })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }
            markDirty();
            if (currentEmployee?.id === id) refreshEmployee();
            return { success: true };
        } catch (e) {
            console.error('Failed to request update', e);
            mutate();
            return { success: false, error: e };
        }
    };

    const deleteEmployee = async (id: string) => {
        if (!activeUserId) return;
        mutate(data.filter(e => e.id !== id), false);
        try {
            await fetch(`/api/employees/${id}?userId=${activeUserId}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error('Failed to delete employee', e);
            mutate();
        }
    };

    const getNextEmployeeNumber = () => {
        if (data.length === 0) return "100001";
        const max = Math.max(...data.map(e => parseInt(e.employeeNumber) || 0));
        const next = Math.max(max + 1, 100001);
        return next.toString();
    };

    return {
        employees: data,
        addEmployee,
        updateEmployee,
        requestEmployeeUpdate,
        deleteEmployee,
        getNextEmployeeNumber,
        isLoading
    };
}
