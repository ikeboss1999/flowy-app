"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export interface AccountSettings {
    name: string;
    pinCode?: string;
    onboardingCompleted: boolean;
}

const DEFAULT_SETTINGS: AccountSettings = {
    name: 'Benutzer',
    onboardingCompleted: false,
};

export function useAccountSettings() {
    const { user } = useAuth();

    const key = user ? `/api/settings?userId=${user.id}` : null;
    const { data: allSettings, isLoading, error, mutate } = useSWR(key, fetcher);

    const settings: AccountSettings = allSettings?.accountSettings
        ? { ...DEFAULT_SETTINGS, ...allSettings.accountSettings }
        : DEFAULT_SETTINGS;

    const updateSettings = async (newSettings: Partial<AccountSettings>) => {
        if (!user) return;
        const updated = { ...settings, ...newSettings };
        mutate({ ...allSettings, accountSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'account', data: updated })
            });
        } catch (e) {
            console.error('Failed to update account settings', e);
            mutate();
        }
    };

    return {
        data: settings,
        isLoading,
        error: error?.message ?? null,
        updateSettings
    };
}
