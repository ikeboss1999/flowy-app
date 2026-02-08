"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

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
    const { user, isLoading: authLoading } = useAuth();
    const [settings, setSettings] = useState<AccountSettings>(DEFAULT_SETTINGS);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount
    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setError(null);
            try {
                const response = await fetch(`/api/settings?userId=${user.id}`);

                if (!response.ok) {
                    throw new Error(`Server Error: ${response.status}`);
                }

                const allSettings = await response.json();

                if (allSettings.accountSettings) {
                    setSettings({ ...DEFAULT_SETTINGS, ...allSettings.accountSettings });
                } else {
                    // Migration
                    const storageKey = `account_settings_${user.id}`;
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            await fetch('/api/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, type: 'account', data: parsed })
                            });
                            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
                        } catch (e) {
                            console.error('Migration failed', e);
                        }
                    }
                }
            } catch (e: any) {
                console.error('Failed to load account settings', e);
                setError(e.message || 'Unknown Error');
                // IMPORTANT: Do NOT set isLoading to false if it's a critical error?
                // Actually, we must process 'error' in the consuming component.
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user, authLoading]);

    const updateSettings = async (newSettings: Partial<AccountSettings>) => {
        if (!user) return;
        const updated = { ...settings, ...newSettings };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'account', data: updated })
            });
            setSettings(updated);
        } catch (e) {
            console.error('Failed to update account settings', e);
        }
    };

    return {
        data: settings,
        isLoading: isLoading || authLoading,
        error,
        updateSettings
    };
}
