"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export interface CustomerSettings {
    prefix: string;
    nextNumber: number;
    mindestLaenge: number;
}

const initialData: CustomerSettings = {
    prefix: "KD-",
    nextNumber: 10000,
    mindestLaenge: 5,
};

export function useCustomerSettings() {
    const { user } = useAuth();

    const key = user ? `/api/settings?userId=${user.id}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    const data: CustomerSettings = allSettings?.customerSettings
        ? { ...initialData, ...allSettings.customerSettings }
        : initialData;

    const updateData = async (newData: Partial<CustomerSettings>) => {
        if (!user) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, customerSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'customer', data: updated })
            });
        } catch (e) {
            console.error('Failed to update customer settings', e);
            mutate();
        }
    };

    return { data, updateData, isLoading };
}
