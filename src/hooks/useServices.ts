"use client";

import { useState, useEffect } from 'react';
import { Service } from '@/types/service';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

const STORAGE_KEY = 'flowy_services';

export function useServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isLoading: authLoading } = useAuth();
    const { markDirty } = useSync();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadServices = async () => {
            try {
                const response = await fetch(`/api/services?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setServices(data);
                } else {
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const local: Service[] = JSON.parse(saved).filter((s: any) => s.userId === user.id);
                            for (const item of local) {
                                await fetch('/api/services', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, service: item })
                                });
                            }
                            setServices(local);
                        } catch (e) { console.error(e); }
                    }
                }
            } catch (e) { console.error(e); }
            setIsLoading(false);
        };
        loadServices();
    }, [user, authLoading]);

    const addService = async (service: Service) => {
        if (!user) return;
        const newService = { ...service, userId: user.id };
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, service: newService })
            });
            const updated = [newService, ...services];
            setServices(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            markDirty();
        } catch (e) { console.error(e); }
    };

    const updateService = async (id: string, service: Service) => {
        if (!user) return;
        const updatedService = { ...service, userId: user.id };
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, service: updatedService })
            });
            const updated = services.map(s => s.id === id ? updatedService : s);
            setServices(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            markDirty();
        } catch (e) { console.error(e); }
    };

    const deleteService = async (id: string) => {
        if (!user) return;
        try {
            await fetch(`/api/services/${id}`, { method: 'DELETE' });
            const updated = services.filter(s => s.id !== id);
            setServices(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            markDirty();
        } catch (e) { console.error(e); }
    };

    return { services, addService, updateService, deleteService, isLoading: isLoading || authLoading };
}
