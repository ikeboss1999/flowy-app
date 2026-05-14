"use client";

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/context/AuthContext';

export interface ProjectSettings {
    projectNumberPrefix: string;
    nextProjectNumber: number;
}

const DEFAULT: ProjectSettings = {
    projectNumberPrefix: 'PRJ-',
    nextProjectNumber: 1,
};

export function useProjectSettings() {
    const { user, currentEmployee } = useAuth();
    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId ? `/api/settings?userId=${activeUserId}` : null;

    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    const data: ProjectSettings = { ...DEFAULT, ...(allSettings?.projectSettings || {}) };

    const updateData = async (updates: Partial<ProjectSettings>) => {
        const newSettings = { ...data, ...updates };
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'project', data: newSettings }),
        });
        mutate();
    };

    return { data, isLoading, updateData };
}
