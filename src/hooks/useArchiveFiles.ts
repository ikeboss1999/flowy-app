"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export interface ArchiveFile {
    id: string;
    userId: string;
    folder: string;
    name: string;
    storagePath: string;
    mimeType?: string;
    size?: number;
    createdAt: string;
    updatedAt: string;
}

export function useArchiveFiles() {
    const { user, currentEmployee } = useAuth();
    const activeUserId = user?.id || currentEmployee?.userId;

    const key = activeUserId ? '/api/archive-files' : null;
    const { data: files = [], isLoading, mutate } = useSWR<ArchiveFile[]>(key, fetcher);

    const uploadFile = async (file: File, folder: string): Promise<void> => {
        if (!activeUserId) throw new Error('Not authenticated');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const res = await fetch('/api/archive-files', { method: 'POST', body: formData });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Upload failed');
        }
        await mutate();
    };

    const deleteFile = async (id: string): Promise<void> => {
        mutate(files.filter(f => f.id !== id), false);
        try {
            const res = await fetch(`/api/archive-files?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
        } catch (e) {
            mutate();
            throw e;
        }
    };

    const getSignedUrl = async (storagePath: string): Promise<string> => {
        const res = await fetch(`/api/project-files/signed-url?path=${encodeURIComponent(storagePath)}`);
        if (!res.ok) throw new Error('Failed to get signed URL');
        const { url } = await res.json();
        return url;
    };

    const updateFile = async (id: string, updates: Partial<ArchiveFile>): Promise<void> => {
        const res = await fetch(`/api/archive-files?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Update failed');
        await mutate();
    };

    return { files, isLoading, uploadFile, deleteFile, getSignedUrl, updateFile };
}
