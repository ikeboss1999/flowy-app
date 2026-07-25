"use client";

import useSWR from 'swr';
import { Customer } from '@/types/customer';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

function getCachedCustomers(): Customer[] {
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem("flowy_customers_cache");
            if (cached) return JSON.parse(cached);
        } catch { }
    }
    return [];
}

export function useCustomers() {
    const { user, currentEmployee, profile } = useAuth();

    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? `/api/customers?userId=${activeUserId}` : null;
    const initialFallback = getCachedCustomers();

    const { data = initialFallback, isLoading, mutate } = useSWR<Customer[]>(key, fetcher, {
        fallbackData: initialFallback,
        revalidateOnFocus: false,
        onSuccess: (freshData) => {
            if (typeof window !== "undefined" && freshData && Array.isArray(freshData)) {
                try {
                    localStorage.setItem("flowy_customers_cache", JSON.stringify(freshData));
                } catch { }
            }
        }
    });

    const addCustomer = async (customer: Customer) => {
        if (!activeUserId) return;
        const newCustomer = { ...customer, userId: activeUserId, updatedAt: customer.createdAt };
        const updatedList = [newCustomer, ...data];
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_customers_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            });
        } catch (e) {
            console.error("Failed to add customer", e);
            mutate();
        }
    };

    const updateCustomer = async (id: string, updatedCustomer: Customer) => {
        if (!activeUserId) return;
        const updated = { ...updatedCustomer, userId: activeUserId, updatedAt: new Date().toISOString() };
        const updatedList = data.map(c => c.id === id ? updated : c);
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_customers_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        } catch (e) {
            console.error("Failed to update customer", e);
            mutate();
        }
    };

    const deleteCustomer = async (id: string) => {
        const updatedList = data.filter(c => c.id !== id);
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_customers_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Failed to delete customer", e);
            mutate();
        }
    };

    return { customers: data, addCustomer, updateCustomer, deleteCustomer, isLoading: isLoading && data.length === 0 };
}
