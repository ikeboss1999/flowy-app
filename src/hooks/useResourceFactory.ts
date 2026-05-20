"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

interface ResourceItem {
    id: string;
    userId?: string;
    updatedAt?: string;
}

export function createResourceHook<T extends ResourceItem>(endpoint: string) {
    return function () {
        const { user } = useAuth();
        const key = user ? `${endpoint}?userId=${user.id}` : null;
        const { data = [], isLoading, mutate } = useSWR<T[]>(key, fetcher);

        const add = async (item: T): Promise<void> => {
            if (!user) return;
            const newItem = { ...item, userId: user.id };
            mutate([newItem, ...data], false);
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem),
                });
                if (!res.ok) throw new Error(await res.text());
            } catch (e) {
                console.error(`Failed to save to ${endpoint}`, e);
                mutate();
                throw e;
            }
        };

        const update = async (id: string, updates: Partial<T>): Promise<void> => {
            if (!user) return;
            const current = data.find(i => i.id === id);
            if (!current) return;
            const updated = { ...current, ...updates, updatedAt: new Date().toISOString() } as T;
            mutate(data.map(i => i.id === id ? updated : i), false);
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated),
                });
                if (!res.ok) throw new Error(await res.text());
            } catch (e) {
                console.error(`Failed to update in ${endpoint}`, e);
                mutate();
                throw e;
            }
        };

        const remove = async (id: string): Promise<void> => {
            mutate(data.filter(i => i.id !== id), false);
            try {
                await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
            } catch (e) {
                console.error(`Failed to delete from ${endpoint}`, e);
                mutate();
            }
        };

        return { items: data, add, update, remove, isLoading, mutate };
    };
}
