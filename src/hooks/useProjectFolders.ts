"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export interface ProjectFolder {
    id: string;
    projectId: string;
    userId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export function useProjectFolders(projectId: string) {
    const { user, currentEmployee } = useAuth();
    const { markDirty } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId && projectId ? `/api/project-folders?projectId=${projectId}` : null;
    const { data: folders = [], isLoading, mutate } = useSWR<ProjectFolder[]>(key, fetcher);

    const addFolder = async (name: string): Promise<ProjectFolder> => {
        if (!activeUserId) throw new Error('Not authenticated');
        const res = await fetch('/api/project-folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, name })
        });
        if (!res.ok) throw new Error('Failed to create folder');
        const newFolder = await res.json();
        await mutate();
        markDirty();
        return newFolder;
    };

    const renameFolder = async (id: string, newName: string): Promise<void> => {
        const res = await fetch(`/api/project-folders?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error('Failed to rename folder');
        await mutate();
        markDirty();
    };

    const deleteFolder = async (id: string): Promise<void> => {
        const res = await fetch(`/api/project-folders?id=${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete folder');
        await mutate();
        markDirty();
    };

    return { folders, isLoading, addFolder, renameFolder, deleteFolder };
}
