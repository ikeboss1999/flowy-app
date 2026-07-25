"use client";

import useSWR from 'swr';
import { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from '@/lib/fetcher';
import { useProjectSettings } from './useProjectSettings';

function getCachedProjects(): Project[] {
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem("flowy_projects_cache");
            if (cached) return JSON.parse(cached);
        } catch { }
    }
    return [];
}

export function useProjects() {
    const { user, currentEmployee, profile } = useAuth();
    const { data: projectSettings, updateData: updateProjectSettings } = useProjectSettings();

    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? `/api/projects?userId=${activeUserId}` : null;
    const initialFallback = getCachedProjects();

    const { data = initialFallback, isLoading, mutate } = useSWR<Project[]>(key, fetcher, {
        fallbackData: initialFallback,
        revalidateOnFocus: false,
        onSuccess: (freshData) => {
            if (typeof window !== "undefined" && freshData && Array.isArray(freshData)) {
                try {
                    localStorage.setItem("flowy_projects_cache", JSON.stringify(freshData));
                } catch { }
            }
        }
    });

    const addProject = async (project: Project) => {
        if (!activeUserId) return;
        const projectNumber = `${projectSettings.projectNumberPrefix}${projectSettings.nextProjectNumber}`;
        const newProject = { ...project, userId: activeUserId, projectNumber };
        const updatedList = [newProject, ...data];
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_projects_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProject)
            });
            await updateProjectSettings({ nextProjectNumber: projectSettings.nextProjectNumber + 1 });
        } catch (e) {
            console.error("Failed to add project", e);
            mutate();
        }
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        if (!activeUserId) return;
        const current = data.find(p => p.id === id);
        if (!current) return;
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        const updatedList = data.map(p => p.id === id ? updated : p);
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_projects_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        } catch (e) {
            console.error("Failed to update project", e);
            mutate();
        }
    };

    const deleteProject = async (id: string) => {
        if (!activeUserId) return;
        const updatedList = data.filter(p => p.id !== id);
        mutate(updatedList, false);
        if (typeof window !== "undefined") {
            try { localStorage.setItem("flowy_projects_cache", JSON.stringify(updatedList)); } catch { }
        }
        try {
            await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Failed to delete project", e);
            mutate();
        }
    };

    const getProject = (id: string) => data.find(p => p.id === id);

    return { projects: data, isLoading: isLoading && data.length === 0, addProject, updateProject, deleteProject, getProject };
}
