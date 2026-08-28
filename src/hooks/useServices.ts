"use client";

import useSWR from 'swr';
import { Service } from '@/types/service';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';
import { serviceFromStorage } from '@/lib/service-nickname';

export function useServices() {
    const { user } = useAuth();

    const key = user ? `/api/services?userId=${user.id}` : null;
    const { data: rawData = [], isLoading, mutate } = useSWR<Service[]>(key, fetcher);
    const data = rawData.map(serviceFromStorage);

    const addService = async (service: Service) => {
        if (!user) return;
        const newService = { ...service, userId: user.id };
        mutate([newService, ...data], false);
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, service: newService })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const updateService = async (id: string, service: Service) => {
        if (!user) return;
        const updatedService = { ...service, userId: user.id };
        mutate(data.map(s => s.id === id ? updatedService : s), false);
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, service: updatedService })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const deleteService = async (id: string) => {
        if (!user) return;
        mutate(data.filter(s => s.id !== id), false);
        try {
            await fetch(`/api/services/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const refreshServices = () => mutate();

    return { services: data, addService, updateService, deleteService, refreshServices, isLoading };
}
