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

function getCachedAccountSettings(): AccountSettings {
    if (typeof window !== 'undefined') {
        try {
            const cachedName = localStorage.getItem('flowy_account_name');
            if (cachedName) {
                return { ...DEFAULT_SETTINGS, name: cachedName };
            }
        } catch { }
    }
    return DEFAULT_SETTINGS;
}

export function useAccountSettings() {
    const { user, currentEmployee, profile } = useAuth();

    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? `/api/settings?userId=${activeUserId}` : null;
    const { data: allSettings, isLoading, error, mutate } = useSWR(key, fetcher);

    const initialFallback = getCachedAccountSettings();
    const settings: AccountSettings = allSettings?.accountSettings
        ? { ...DEFAULT_SETTINGS, ...allSettings.accountSettings }
        : (allSettings ? DEFAULT_SETTINGS : initialFallback);

    if (typeof window !== 'undefined' && allSettings?.accountSettings?.name) {
        try {
            if (localStorage.getItem('flowy_account_name') !== allSettings.accountSettings.name) {
                localStorage.setItem('flowy_account_name', allSettings.accountSettings.name);
            }
        } catch { }
    }

    const updateSettings = async (newSettings: Partial<AccountSettings>) => {
        if (!activeUserId) return;
        const updated = { ...settings, ...newSettings };
        if (typeof window !== 'undefined' && updated.name) {
            try {
                localStorage.setItem('flowy_account_name', updated.name);
            } catch { }
        }
        mutate({ ...allSettings, accountSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, type: 'account', data: updated })
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
