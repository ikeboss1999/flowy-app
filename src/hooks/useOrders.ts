"use client";

import useSWR from 'swr';
import { OrderConfirmation } from '@/types/order';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useOrders() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/orders?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<OrderConfirmation[]>(key, fetcher);

    const addOrder = async (order: OrderConfirmation) => {
        if (!user) return;
        const newOrder = { ...order, userId: user.id };
        mutate([newOrder, ...data], false);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`API Error: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error("Failed to add order", e);
            mutate();
            throw e;
        }
    };

    const updateOrder = async (id: string, updatedOrder: Partial<OrderConfirmation>) => {
        if (!user) return;
        const current = data.find(o => o.id === id);
        if (!current) return;
        const updated = { ...current, ...updatedOrder, updatedAt: new Date().toISOString() };
        mutate(data.map(o => o.id === id ? updated : o), false);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`API Error: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error("Failed to update order", e);
            mutate();
            throw e;
        }
    };

    const deleteOrder = async (id: string) => {
        mutate(data.filter(o => o.id !== id), false);
        try {
            await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error("Failed to delete order", e);
            mutate();
        }
    };

    return { orders: data, addOrder, updateOrder, deleteOrder, isLoading };
}
