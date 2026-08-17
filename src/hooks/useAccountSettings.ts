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

function getCachedAccountSettings(userId?: string): AccountSettings {
    if (typeof window !== 'undefined') {
        try {
            const cachedName = localStorage.getItem(userId ? `flowy_account_name_${userId}` : 'flowy_account_name');
            if (cachedName) {
                return { ...DEFAULT_SETTINGS, name: cachedName };
            }
        } catch { }
    }
    return DEFAULT_SETTINGS;
}

export function useAccountSettings() {
    const { user, currentEmployee, profile } = useAuth();

    const activeUserId = profile?.role === 'employee'
        ? (user?.id || currentEmployee?.id)
        : (profile?.companyOwnerId || currentEmployee?.userId || user?.id);
    const key = activeUserId ? `/api/settings?accountUserId=${activeUserId}` : null;
    const { data: allSettings, isLoading, error, mutate } = useSWR(key, fetcher);

    const cacheKey = activeUserId ? `flowy_account_name_${activeUserId}` : 'flowy_account_name';
    const initialFallback = getCachedAccountSettings(activeUserId);
    const settings: AccountSettings = allSettings?.accountSettings
        ? { ...DEFAULT_SETTINGS, ...allSettings.accountSettings }
        : (allSettings ? DEFAULT_SETTINGS : initialFallback);

    if (typeof window !== 'undefined' && allSettings?.accountSettings?.name) {
        try {
            if (localStorage.getItem(cacheKey) !== allSettings.accountSettings.name) {
                localStorage.setItem(cacheKey, allSettings.accountSettings.name);
            }
        } catch { }
    }

    const updateSettings = async (newSettings: Partial<AccountSettings>) => {
        if (!activeUserId) return;
        const updated = { ...settings, ...newSettings };
        if (typeof window !== 'undefined' && updated.name) {
            try {
                localStorage.setItem(cacheKey, updated.name);
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
