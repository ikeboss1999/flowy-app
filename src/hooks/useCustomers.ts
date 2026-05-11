"use client";

import useSWR from 'swr';
import { Customer } from '@/types/customer';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useCustomers() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/customers?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<Customer[]>(key, fetcher);

    const addCustomer = async (customer: Customer) => {
        if (!user) return;
        const newCustomer = { ...customer, userId: user.id, updatedAt: customer.createdAt };
        mutate([newCustomer, ...data], false);
        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            });
            markDirty();
        } catch (e) {
            console.error("Failed to add customer", e);
            mutate();
        }
    };

    const updateCustomer = async (id: string, updatedCustomer: Customer) => {
        if (!user) return;
        const updated = { ...updatedCustomer, userId: user.id, updatedAt: new Date().toISOString() };
        mutate(data.map(c => c.id === id ? updated : c), false);
        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            markDirty();
        } catch (e) {
            console.error("Failed to update customer", e);
            mutate();
        }
    };

    const deleteCustomer = async (id: string) => {
        mutate(data.filter(c => c.id !== id), false);
        try {
            await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error("Failed to delete customer", e);
            mutate();
        }
    };

    return { customers: data, addCustomer, updateCustomer, deleteCustomer, isLoading };
}
