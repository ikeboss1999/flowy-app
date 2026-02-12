"use client";

import { useState, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

const STORAGE_KEY = 'flowy_vehicles';

export function useVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isLoading: authLoading } = useAuth();
    const { markDirty } = useSync();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadVehicles = async () => {
            try {
                const response = await fetch(`/api/vehicles?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setVehicles(data);
                } else {
                    // Try to migrate from localStorage
                    const savedData = localStorage.getItem(STORAGE_KEY);
                    if (savedData) {
                        try {
                            const localVehicles: Vehicle[] = JSON.parse(savedData);
                            const userVehicles = localVehicles.filter(v => v.userId === user.id);

                            // Save each to SQLite
                            for (const vehicle of userVehicles) {
                                await fetch('/api/vehicles', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, vehicle })
                                });
                            }

                            setVehicles(userVehicles);
                        } catch (e) {
                            console.error('Migration failed', e);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch vehicles', e);
            }
            setIsLoading(false);
        };

        loadVehicles();
    }, [user, authLoading]);

    const addVehicle = async (vehicle: Vehicle) => {
        if (!user) return;

        const newVehicle: Vehicle = {
            ...vehicle,
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            createdAt: new Date().toISOString()
        };

        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, vehicle: newVehicle })
            });
            setVehicles(prev => [newVehicle, ...prev]);
            markDirty();
            return newVehicle;
        } catch (e) {
            console.error('Failed to add vehicle', e);
        }
    };

    const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
        if (!user) return;

        const vehicleToUpdate = vehicles.find(v => v.id === id);
        if (!vehicleToUpdate) return;

        const updated = { ...vehicleToUpdate, ...updates };

        try {
            await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, vehicle: updated })
            });
            setVehicles(prev => prev.map(v => v.id === id ? updated : v));
            markDirty();
        } catch (e) {
            console.error('Failed to update vehicle', e);
        }
    };

    const deleteVehicle = async (id: string) => {
        if (!user) return;

        try {
            await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
            setVehicles(prev => prev.filter(v => v.id !== id));
            markDirty();
        } catch (e) {
            console.error('Failed to delete vehicle', e);
        }
    };

    return { vehicles, addVehicle, updateVehicle, deleteVehicle, isLoading: isLoading || authLoading };
}
