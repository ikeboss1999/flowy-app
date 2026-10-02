"use client";

import useSWR from 'swr';
import { Service } from '@/types/service';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';
import { serviceFromStorage } from '@/lib/service-nickname';

export function useServices() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;

    const key = activeUserId ? `/api/services?userId=${activeUserId}` : null;
    const { data: rawData = [], isLoading, mutate } = useSWR<Service[]>(key, fetcher);
    const data = rawData.map(serviceFromStorage);

    const addService = async (service: Service) => {
        if (!activeUserId) return;
        const newService = { ...service, userId: activeUserId };
        mutate([newService, ...data], false);
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, service: newService })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const updateService = async (id: string, service: Service) => {
        if (!activeUserId) return;
        const updatedService = { ...service, userId: activeUserId };
        mutate(data.map(s => s.id === id ? updatedService : s), false);
        try {
            await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, service: updatedService })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const deleteService = async (id: string) => {
        if (!activeUserId) return;
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
