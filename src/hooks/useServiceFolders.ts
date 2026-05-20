"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export interface ServiceFolder {
    id: string;
    userId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export function useServiceFolders() {
    const { user, currentEmployee } = useAuth();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId ? `/api/service-folders` : null;
    const { data: folders = [], isLoading, mutate } = useSWR<ServiceFolder[]>(key, fetcher);

    const addFolder = async (name: string): Promise<ServiceFolder> => {
        if (!activeUserId) throw new Error('Not authenticated');
        const res = await fetch('/api/service-folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error('Failed to create folder');
        const newFolder = await res.json();
        await mutate();
        return newFolder;
    }

    const renameFolder = async (id: string, newName: string): Promise<void> => {
        const res = await fetch(`/api/service-folders?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error('Failed to rename folder');
        await mutate();
    }

    const deleteFolder = async (id: string): Promise<void> => {
        const res = await fetch(`/api/service-folders?id=${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete folder');
        await mutate();
    }

    return { folders, isLoading, addFolder, renameFolder, deleteFolder };
}
