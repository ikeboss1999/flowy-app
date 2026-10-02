"use client";

import useSWR from 'swr';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export function useVehicles() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;

    const key = activeUserId ? `/api/vehicles?userId=${activeUserId}` : null;
    const { data = [], isLoading, mutate } = useSWR<Vehicle[]>(key, fetcher);

    const addVehicle = async (vehicle: Vehicle) => {
        if (!activeUserId) return;
        const newVehicle: Vehicle = {
            ...vehicle,
            id: Math.random().toString(36).substr(2, 9),
            userId: activeUserId,
            createdAt: new Date().toISOString()
        };
        mutate([newVehicle, ...data], false);
        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, vehicle: newVehicle })
            });
            return newVehicle;
        } catch (e) {
            console.error('Failed to add vehicle', e);
            mutate();
        }
    };

    const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
        if (!activeUserId) return;
        const current = data.find(v => v.id === id);
        if (!current) return;
        const updated = { ...current, ...updates };
        mutate(data.map(v => v.id === id ? updated : v), false);
        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, vehicle: updated })
            });
        } catch (e) {
            console.error('Failed to update vehicle', e);
            mutate();
        }
    };

    const deleteVehicle = async (id: string) => {
        if (!activeUserId) return;
        mutate(data.filter(v => v.id !== id), false);
        try {
            await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error('Failed to delete vehicle', e);
            mutate();
        }
    };

    return { vehicles: data, addVehicle, updateVehicle, deleteVehicle, isLoading };
}
