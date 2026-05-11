"use client";

import useSWR from 'swr';
import { Invoice } from '@/types/invoice';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useInvoices() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/invoices?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<Invoice[]>(key, fetcher);

    const addInvoice = async (invoice: Invoice) => {
        if (!user) return;
        const newInvoice = { ...invoice, userId: user.id };
        mutate([newInvoice, ...data], false);
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInvoice)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`API Error: ${text}`);
            }
            markDirty();
        } catch (e) {
            console.error("Failed to add invoice", e);
            mutate();
            throw e;
        }
    };

    const updateInvoice = async (id: string, updatedInvoice: Partial<Invoice>) => {
        if (!user) return;
        const current = data.find(i => i.id === id);
        if (!current) return;
        const updated = { ...current, ...updatedInvoice, updatedAt: new Date().toISOString() };
        mutate(data.map(inv => inv.id === id ? updated : inv), false);
        try {
            const res = await fetch('/api/invoices', {
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
            console.error("Failed to update invoice", e);
            mutate();
            throw e;
        }
    };

    const deleteInvoice = async (id: string) => {
        mutate(data.filter(inv => inv.id !== id), false);
        try {
            await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error("Failed to delete invoice", e);
            mutate();
        }
    };

    return { invoices: data, addInvoice, updateInvoice, deleteInvoice, isLoading };
}
