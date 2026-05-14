"use client";

import useSWR from 'swr';
import { Offer } from '@/types/offer';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useOffers() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/offers?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<Offer[]>(key, fetcher);

    const addOffer = async (offer: Offer) => {
        if (!user) return;
        const newOffer = { ...offer, userId: user.id };
        mutate([newOffer, ...data], false);
        try {
            const res = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOffer)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`API Error: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error("Failed to add offer", e);
            mutate();
            throw e;
        }
    };

    const updateOffer = async (id: string, updatedOffer: Partial<Offer>) => {
        if (!user) return;
        const current = data.find(o => o.id === id);
        if (!current) return;
        const updated = { ...current, ...updatedOffer, updatedAt: new Date().toISOString() };
        mutate(data.map(o => o.id === id ? updated : o), false);
        try {
            const res = await fetch('/api/offers', {
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
            console.error("Failed to update offer", e);
            mutate();
            throw e;
        }
    };

    const deleteOffer = async (id: string) => {
        mutate(data.filter(o => o.id !== id), false);
        try {
            await fetch(`/api/offers?id=${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error("Failed to delete offer", e);
            mutate();
        }
    };

    return { offers: data, addOffer, updateOffer, deleteOffer, isLoading };
}
