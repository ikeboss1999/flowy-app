"use client";

import useSWR from 'swr';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useVehicles() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/vehicles?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<Vehicle[]>(key, fetcher);

    const addVehicle = async (vehicle: Vehicle) => {
        if (!user) return;
        const newVehicle: Vehicle = {
            ...vehicle,
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            createdAt: new Date().toISOString()
        };
        mutate([newVehicle, ...data], false);
        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, vehicle: newVehicle })
            });
            markDirty();
            return newVehicle;
        } catch (e) {
            console.error('Failed to add vehicle', e);
            mutate();
        }
    };

    const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
        if (!user) return;
        const current = data.find(v => v.id === id);
        if (!current) return;
        const updated = { ...current, ...updates };
        mutate(data.map(v => v.id === id ? updated : v), false);
        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, vehicle: updated })
            });
            markDirty();
        } catch (e) {
            console.error('Failed to update vehicle', e);
            mutate();
        }
    };

    const deleteVehicle = async (id: string) => {
        if (!user) return;
        mutate(data.filter(v => v.id !== id), false);
        try {
            await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error('Failed to delete vehicle', e);
            mutate();
        }
    };

    return { vehicles: data, addVehicle, updateVehicle, deleteVehicle, isLoading };
}
