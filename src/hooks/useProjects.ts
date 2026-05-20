"use client";

import useSWR from 'swr';
import { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from '@/lib/fetcher';
import { useProjectSettings } from './useProjectSettings';

export function useProjects() {
    const { user, currentEmployee } = useAuth();
    const { data: projectSettings, updateData: updateProjectSettings } = useProjectSettings();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId ? `/api/projects?userId=${activeUserId}` : null;
    const { data = [], isLoading, mutate } = useSWR<Project[]>(key, fetcher);

    const addProject = async (project: Project) => {
        if (!activeUserId) return;
        const projectNumber = `${projectSettings.projectNumberPrefix}${projectSettings.nextProjectNumber}`;
        const newProject = { ...project, userId: activeUserId, projectNumber };
        mutate([newProject, ...data], false);
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
        mutate(data.map(p => p.id === id ? updated : p), false);
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
        mutate(data.filter(p => p.id !== id), false);
        try {
            await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Failed to delete project", e);
            mutate();
        }
    };

    const getProject = (id: string) => data.find(p => p.id === id);

    return { projects: data, isLoading, addProject, updateProject, deleteProject, getProject };
}
