"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';
import { ProjectFile, FileFolder } from '@/types/project_file';

export function useProjectFiles(projectId: string) {
    const { user, currentEmployee } = useAuth();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId && projectId ? `/api/project-files?projectId=${projectId}` : null;
    const { data: files = [], isLoading, mutate } = useSWR<ProjectFile[]>(key, fetcher);

    const uploadFile = async (file: File, folder: FileFolder): Promise<void> => {
        if (!activeUserId) throw new Error('Not authenticated');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('folder', folder);

        const res = await fetch('/api/project-files', { method: 'POST', body: formData });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Upload failed');
        }
        await mutate();
    };

    const deleteFile = async (id: string): Promise<void> => {
        mutate(files.filter(f => f.id !== id), false);
        try {
            const res = await fetch(`/api/project-files?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
        } catch (e) {
            mutate();
            throw e;
        }
    };

    const updateFile = async (id: string, updates: Partial<ProjectFile>): Promise<void> => {
        const res = await fetch(`/api/project-files?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Update failed');
        await mutate();
    };

    const getSignedUrl = async (storagePath: string): Promise<string> => {
        const res = await fetch(`/api/project-files/signed-url?path=${encodeURIComponent(storagePath)}`);
        if (!res.ok) throw new Error('Failed to get signed URL');
        const { url } = await res.json();
        return url;
    };

    return { files, isLoading, uploadFile, deleteFile, getSignedUrl, updateFile };
}
