"use client";

import { useState, useEffect } from 'react';
import { Employee } from '@/types/employee';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

const STORAGE_KEY = 'flowy_employees';

export function useEmployees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, currentEmployee, isLoading: authLoading } = useAuth();
    const { markDirty } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;

    useEffect(() => {
        if (authLoading || !activeUserId) {
            if (!authLoading && !activeUserId) setIsLoading(false);
            return;
        }

        const loadEmployees = async () => {
            try {
                const response = await fetch(`/api/employees?userId=${activeUserId}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setEmployees(data);
                } else if (user) {
                    // Try to migrate from localStorage (admin only)
                    const savedData = localStorage.getItem(STORAGE_KEY);
                    if (savedData) {
                        try {
                            const localEmployees: Employee[] = JSON.parse(savedData);
                            const userEmployees = localEmployees.filter(e => e.userId === user.id || !e.userId);

                            // Save each to SQLite
                            for (const employee of userEmployees) {
                                await fetch('/api/employees', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, employee: { ...employee, userId: user.id } })
                                });
                            }

                            setEmployees(userEmployees.map(e => ({ ...e, userId: user.id })));
                        } catch (e) {
                            console.error('Migration failed', e);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch employees', e);
            }
            setIsLoading(false);
        };

        loadEmployees();
    }, [activeUserId, authLoading, user]);

    const addEmployee = async (employee: Employee) => {
        if (!user) return;
        // ... (rest of addEmployee remains same)
    }

    const updateEmployee = async (id: string, employee: Employee) => {
        const targetUserId = user?.id || employee.userId || currentEmployee?.userId;
        if (!targetUserId) return;

        const updated = { ...employee, userId: targetUserId };

        try {
            await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId, employee: updated })
            });
            setEmployees(prev => prev.map(e => e.id === id ? updated : e));
            markDirty();
        } catch (e) {
            console.error('Failed to update employee', e);
        }
    };

    const requestEmployeeUpdate = async (id: string, pendingChanges: Partial<Employee>) => {
        const employee = employees.find(e => e.id === id);
        if (!employee || !activeUserId) return;

        const updated = { ...employee, pendingChanges };

        try {
            await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, employee: updated })
            });
            setEmployees(prev => prev.map(e => e.id === id ? updated : e));
            markDirty();
            return { success: true };
        } catch (e) {
            console.error('Failed to request update', e);
            return { success: false, error: e };
        }
    };

    const deleteEmployee = async (id: string) => {
        if (!activeUserId) return;
        try {
            await fetch(`/api/employees/${id}?userId=${activeUserId}`, { method: 'DELETE' });
            setEmployees(prev => prev.filter(e => e.id !== id));
            markDirty();
        } catch (e) {
            console.error('Failed to delete employee', e);
        }
    };

    const getNextEmployeeNumber = () => {
        if (employees.length === 0) return "1001";
        const max = Math.max(...employees.map(e => parseInt(e.employeeNumber) || 0));
        return (max + 1).toString();
    }

    return {
        employees,
        addEmployee,
        updateEmployee,
        requestEmployeeUpdate,
        deleteEmployee,
        getNextEmployeeNumber,
        isLoading: isLoading || authLoading
    };
}
