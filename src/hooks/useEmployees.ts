"use client";

import useSWR from 'swr';
import { useCallback } from 'react';
import { Employee } from '@/types/employee';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';
import { useCompanySettings } from '@/hooks/useCompanySettings';

export function useEmployees() {
    const { user, currentEmployee, profile, refreshEmployee } = useAuth();

    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const { data: companySettings, updateData: updateCompanySettings } = useCompanySettings();
    const key = activeUserId ? `/api/employees?summary=1&userId=${activeUserId}` : null;

    const { data = [], isLoading, mutate } = useSWR<Employee[]>(key, fetcher);

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
            const highestEmployeeNumber = [...data, newEmployee].reduce((highest, item) => {
                const numericValue = parseInt(String(item.employeeNumber || '').replace(/\D/g, ''), 10) || 0;
                return Math.max(highest, numericValue);
            }, 0);
            const configuredNextNumber = parseInt(String(companySettings.nextEmployeeNumber || '').replace(/\D/g, ''), 10) || 1;
            if (highestEmployeeNumber >= configuredNextNumber) {
                await updateCompanySettings({ nextEmployeeNumber: String(highestEmployeeNumber + 1) });
            }
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
        } catch (e) {
            console.error('Failed to delete employee', e);
            mutate();
        }
    };

    const getNextEmployeeNumber = useCallback(() => {
        const prefix = companySettings.employeeNumberPrefix ?? 'MA-';
        const padding = Math.min(10, Math.max(1, Number(companySettings.employeeNumberPadding) || 1));
        const configuredStart = Math.max(1, Number(String(companySettings.nextEmployeeNumber ?? '').replace(/\D/g, '')) || 100001);
        if (data.length === 0) return `${prefix}${String(configuredStart).padStart(padding, '0')}`;
        const max = Math.max(...data.map(e => parseInt(String(e.employeeNumber || '').replace(/\D/g, ''), 10) || 0));
        const next = Math.max(max + 1, configuredStart);
        return `${prefix}${String(next).padStart(padding, '0')}`;
    }, [companySettings, data]);

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
