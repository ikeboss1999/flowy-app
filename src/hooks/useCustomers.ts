"use client";

import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

const STORAGE_KEY = 'flowy_customers';

const MOCK_CUSTOMERS: Customer[] = [];

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { markDirty } = useSync();

    useEffect(() => {
        const loadCustomers = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Try to load from SQLite API
                const response = await fetch(`/api/customers?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setCustomers(data);
                } else {
                    // 2. Migration: If SQLite is empty, check localStorage
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const localCustomers: Customer[] = JSON.parse(saved);
                            const userCustomers = localCustomers.filter(c => c.userId === user.id || !c.userId);

                            if (userCustomers.length > 0) {
                                // Push to SQLite
                                for (const c of userCustomers) {
                                    await fetch('/api/customers', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...c, userId: user.id, updatedAt: c.createdAt })
                                    });
                                }
                                setCustomers(userCustomers.map(c => ({ ...c, userId: user.id, updatedAt: c.createdAt })));
                            }
                        } catch (e) {
                            console.error("Migration failed", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load customers from API", e);
            }
            setIsLoading(false);
        };

        loadCustomers();
    }, [user]);

    const addCustomer = async (customer: Customer) => {
        if (!user) return;
        const newCustomer = { ...customer, userId: user.id, updatedAt: customer.createdAt };

        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            });
            setCustomers(prev => [newCustomer, ...prev]);
            markDirty();
        } catch (e) {
            console.error("Failed to add customer", e);
        }
    };

    const updateCustomer = async (id: string, updatedCustomer: Customer) => {
        if (!user) return;
        const updated = { ...updatedCustomer, userId: user.id, updatedAt: new Date().toISOString() };

        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setCustomers(prev => prev.map(c => c.id === id ? updated : c));
            markDirty();
        } catch (e) {
            console.error("Failed to update customer", e);
        }
    };

    const deleteCustomer = async (id: string) => {
        try {
            await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
            setCustomers(prev => prev.filter(c => c.id !== id));
            markDirty();
        } catch (e) {
            console.error("Failed to delete customer", e);
        }
    };

    return { customers, addCustomer, updateCustomer, deleteCustomer, isLoading };
}
