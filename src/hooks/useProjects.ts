"use client";

import useSWR from 'swr';
import { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from '@/lib/fetcher';
import { useNotification } from '@/context/NotificationContext';

const LEGACY_CACHE_KEY = "flowy_projects_cache";

function getProjectCacheKey(companyOwnerId: string) {
    return `flowy_projects_cache:${companyOwnerId}`;
}

function getCachedProjects(companyOwnerId?: string): Project[] {
    if (!companyOwnerId) return [];
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem(getProjectCacheKey(companyOwnerId));
            if (cached) return JSON.parse(cached);
        } catch { }
    }
    return [];
}

function cacheProjects(companyOwnerId: string, projects: Project[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(getProjectCacheKey(companyOwnerId), JSON.stringify(projects));
        localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch { }
}

async function readErrorMessage(response: Response) {
    const text = await response.text();
    if (!text) return `HTTP ${response.status}`;

    try {
        const parsed = JSON.parse(text);
        return parsed.issues?.[0]?.message || parsed.message || parsed.error || text;
    } catch {
        return text;
    }
}

export function useProjects() {
    const { user, currentEmployee, profile } = useAuth();
    const { showToast } = useNotification();

    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    // The scope only separates SWR caches. The API derives the actual company from the session.
    const key = activeUserId ? `/api/projects?scope=${encodeURIComponent(activeUserId)}` : null;
    const initialFallback = getCachedProjects(activeUserId);

    const { data = initialFallback, isLoading, mutate } = useSWR<Project[]>(key, fetcher, {
        fallbackData: initialFallback,
        revalidateOnFocus: false,
        onSuccess: (freshData) => {
            if (typeof window !== "undefined" && freshData && Array.isArray(freshData)) {
                try {
                    cacheProjects(activeUserId!, freshData);
                } catch { }
            }
        }
    });

    const addProject = async (project: Project) => {
        if (!activeUserId) return;
        const newProject = { ...project, userId: activeUserId, projectNumber: undefined };
        const updatedList = [newProject, ...data];
        mutate(updatedList, false);
        cacheProjects(activeUserId, updatedList);
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProject)
            });
            if (!response.ok) throw new Error(await readErrorMessage(response));

            const result = await response.json();
            const savedProject: Project = result.project || { ...newProject, projectNumber: result.projectNumber };
            const confirmedList = updatedList.map(item => item.id === project.id ? savedProject : item);
            mutate(confirmedList, false);
            cacheProjects(activeUserId, confirmedList);
        } catch (e) {
            console.error("Failed to add project", e);
            mutate(data, false);
            cacheProjects(activeUserId, data);
            showToast(e instanceof Error ? e.message : 'Baustelle konnte nicht gespeichert werden.', 'error');
        }
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        if (!activeUserId) return false;
        const current = data.find(p => p.id === id);
        if (!current) return false;
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        const updatedList = data.map(p => p.id === id ? updated : p);
        mutate(updatedList, false);
        cacheProjects(activeUserId, updatedList);
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            if (!response.ok) throw new Error(await readErrorMessage(response));

            const result = await response.json();
            const savedProject: Project = result.project || updated;
            const confirmedList = updatedList.map(item => item.id === id ? savedProject : item);
            mutate(confirmedList, false);
            cacheProjects(activeUserId, confirmedList);
            return true;
        } catch (e) {
            console.error("Failed to update project", e);
            mutate(data, false);
            cacheProjects(activeUserId, data);
            showToast(e instanceof Error ? e.message : 'Änderungen an der Baustelle konnten nicht gespeichert werden.', 'error');
            return false;
        }
    };

    const deleteProject = async (id: string) => {
        if (!activeUserId) return;
        const updatedList = data.filter(p => p.id !== id);
        mutate(updatedList, false);
        cacheProjects(activeUserId, updatedList);
        try {
            const response = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await readErrorMessage(response));
        } catch (e) {
            console.error("Failed to delete project", e);
            mutate(data, false);
            cacheProjects(activeUserId, data);
            showToast('Baustelle konnte nicht gelöscht werden.', 'error');
        }
    };

    const getProject = (id: string) => data.find(p => p.id === id);

    return { projects: data, isLoading: isLoading && data.length === 0, addProject, updateProject, deleteProject, getProject };
}
