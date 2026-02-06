"use client";

import { useState, useEffect } from 'react';
import { Employee } from '@/types/employee';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'flowy_employees';

export function useEmployees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadEmployees = async () => {
            try {
                const response = await fetch(`/api/employees?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setEmployees(data);
                } else {
                    // Try to migrate from localStorage
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
    }, [user, authLoading]);

    const addEmployee = async (employee: Employee) => {
        if (!user) return;

        // Generate next employee number if not provided
        let employeeNumber = employee.employeeNumber;
        if (!employeeNumber) {
            const numbers = employees
                .map(e => parseInt(e.employeeNumber))
                .filter(n => !isNaN(n));
            const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000;
            employeeNumber = (maxNumber + 1).toString();
        }

        const newEmployee = { ...employee, employeeNumber, userId: user.id };

        try {
            await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, employee: newEmployee })
            });
            setEmployees(prev => [newEmployee, ...prev]);
        } catch (e) {
            console.error('Failed to add employee', e);
        }
    };

    const updateEmployee = async (id: string, employee: Employee) => {
        if (!user) return;
        const updated = { ...employee, userId: user.id };

        try {
            await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, employee: updated })
            });
            setEmployees(prev => prev.map(e => e.id === id ? updated : e));
        } catch (e) {
            console.error('Failed to update employee', e);
        }
    };

    const deleteEmployee = async (id: string) => {
        if (!user) return;
        try {
            await fetch(`/api/employees/${id}`, { method: 'DELETE' });
            setEmployees(prev => prev.filter(e => e.id !== id));
        } catch (e) {
            console.error('Failed to delete employee', e);
        }
    };

    const getNextEmployeeNumber = () => {
        const numbers = employees
            .map(e => {
                const n = parseInt(e.employeeNumber);
                return isNaN(n) ? 0 : n;
            })
            .filter(n => n > 0);

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000;
        return (maxNumber + 1).toString();
    };

    return {
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        getNextEmployeeNumber,
        isLoading: isLoading || authLoading
    };
}
