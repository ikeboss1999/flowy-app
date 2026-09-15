"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';
import { ProjectFile, FileFolder } from '@/types/project_file';
import { supabase } from '@/lib/supabase';

async function readApiError(response: Response, fallback: string) {
    const body = await response.json().catch(() => null);
    return body?.error || body?.message || fallback;
}

export function useProjectFiles(projectId: string) {
    const { user, currentEmployee } = useAuth();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId && projectId ? `/api/project-files?projectId=${projectId}` : null;
    const { data: files = [], isLoading, mutate } = useSWR<ProjectFile[]>(key, fetcher);

    const uploadFile = async (file: File, folder: FileFolder): Promise<void> => {
        if (!activeUserId) throw new Error('Not authenticated');
        const prepare = await fetch('/api/project-files/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, folder, name: file.name, mimeType: file.type, size: file.size }),
        });
        if (!prepare.ok) throw new Error(await readApiError(prepare, 'Upload konnte nicht vorbereitet werden.'));
        const { path, token } = await prepare.json();

        const { error: uploadError } = await supabase.storage.from('project-files').uploadToSignedUrl(path, token, file);
        if (uploadError) throw new Error(uploadError.message || 'Datei konnte nicht hochgeladen werden.');

        const complete = await fetch('/api/project-files/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, folder, name: file.name, mimeType: file.type, size: file.size, storagePath: path }),
        });
        if (!complete.ok) throw new Error(await readApiError(complete, 'Datei konnte nicht gespeichert werden.'));
        await mutate();
    };

    const deleteFile = async (id: string): Promise<void> => {
        mutate(files.filter(f => f.id !== id), false);
        try {
            const res = await fetch(`/api/project-files?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await readApiError(res, 'Datei konnte nicht gelöscht werden.'));
        } catch (e) {
            mutate();
            throw e;
        }
    };

    const updateFile = async (id: string, updates: Partial<ProjectFile>): Promise<void> => {
        const res = await fetch(`/api/project-files?id=${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error(await readApiError(res, 'Datei konnte nicht aktualisiert werden.'));
        await mutate();
    };

    const getSignedUrl = async (storagePath: string): Promise<string> => {
        const res = await fetch(`/api/project-files/signed-url?path=${encodeURIComponent(storagePath)}`);
        if (!res.ok) throw new Error(await readApiError(res, 'Datei konnte nicht geöffnet werden.'));
        const { url } = await res.json();
        return url;
    };

    return { files, isLoading, uploadFile, deleteFile, getSignedUrl, updateFile, mutate };
}
