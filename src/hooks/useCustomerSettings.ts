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
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;

    const key = ownerId ? `/api/settings?userId=${ownerId}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    const data: CustomerSettings = allSettings?.customerSettings
        ? { ...initialData, ...allSettings.customerSettings }
        : initialData;

    const updateData = async (newData: Partial<CustomerSettings>) => {
        if (!ownerId) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, customerSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: ownerId, type: 'customer', data: updated })
            });
        } catch (e) {
            console.error('Failed to update customer settings', e);
            mutate();
        }
    };

    return { data, updateData, isLoading };
}
