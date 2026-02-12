"use client";

import { useState, useEffect } from "react";
import { Project } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/context/SyncContext";

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { markDirty } = useSync();

    const STORAGE_KEY = 'flowy_projects';

    useEffect(() => {
        const loadProjects = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Try to load from SQLite API
                const response = await fetch(`/api/projects?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setProjects(data);
                } else {
                    // 2. Migration: If SQLite is empty, check localStorage
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const localProjects: Project[] = JSON.parse(saved);
                            const userProjects = localProjects.filter(p => p.userId === user.id || !p.userId);

                            if (userProjects.length > 0) {
                                // Push to SQLite
                                for (const p of userProjects) {
                                    await fetch('/api/projects', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...p, userId: user.id })
                                    });
                                }
                                setProjects(userProjects.map(p => ({ ...p, userId: user.id })));

                                // Optional: Clear localStorage after migration? 
                                // For safety, let's keep it but mark it as migrated in another key if needed.
                                // localStorage.removeItem(STORAGE_KEY);
                            }
                        } catch (e) {
                            console.error("Migration failed", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load projects from API", e);
            }
            setIsLoading(false);
        };

        loadProjects();
    }, [user]);

    const addProject = async (project: Project) => {
        if (!user) return;
        const newProject = { ...project, userId: user.id };

        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProject)
            });
            setProjects(prev => [newProject, ...prev]);
            markDirty();
        } catch (e) {
            console.error("Failed to add project", e);
        }
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        if (!user) return;

        const current = projects.find(p => p.id === id);
        if (!current) return;

        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };

        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setProjects(prev => prev.map(p => p.id === id ? updated : p));
            markDirty();
        } catch (e) {
            console.error("Failed to update project", e);
        }
    };

    const deleteProject = async (id: string) => {
        try {
            await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
            setProjects(prev => prev.filter(p => p.id !== id));
            markDirty();
        } catch (e) {
            console.error("Failed to delete project", e);
        }
    };

    const getProject = (id: string) => {
        return projects.find(p => p.id === id);
    };

    return {
        projects,
        isLoading,
        addProject,
        updateProject,
        deleteProject,
        getProject
    };
}
