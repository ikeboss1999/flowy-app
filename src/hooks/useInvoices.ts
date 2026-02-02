"use client";

import { useState, useEffect } from 'react';
import { Invoice } from '@/types/invoice';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'flowy_invoices';

const MOCK_INVOICES: Invoice[] = [];

export function useInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const loadInvoices = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Try to load from SQLite API
                const response = await fetch(`/api/invoices?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setInvoices(data);
                } else {
                    // 2. Migration: If SQLite is empty, check localStorage
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const localInvoices: Invoice[] = JSON.parse(saved);
                            const userInvoices = localInvoices.filter(i => i.userId === user.id || !i.userId);

                            if (userInvoices.length > 0) {
                                // Push to SQLite
                                for (const inv of userInvoices) {
                                    await fetch('/api/invoices', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ...inv, userId: user.id })
                                    });
                                }
                                setInvoices(userInvoices.map(inv => ({ ...inv, userId: user.id })));
                            }
                        } catch (e) {
                            console.error("Migration failed", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load invoices from API", e);
            }
            setIsLoading(false);
        };

        loadInvoices();
    }, [user]);

    const addInvoice = async (invoice: Invoice) => {
        if (!user) return;
        const newInvoice = { ...invoice, userId: user.id };

        try {
            await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInvoice)
            });
            setInvoices(prev => [newInvoice, ...prev]);
        } catch (e) {
            console.error("Failed to add invoice", e);
        }
    };

    const updateInvoice = async (id: string, updatedInvoice: Partial<Invoice>) => {
        if (!user) return;

        const current = invoices.find(i => i.id === id);
        if (!current) return;

        const updated = { ...current, ...updatedInvoice, updatedAt: new Date().toISOString() };

        try {
            await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
        } catch (e) {
            console.error("Failed to update invoice", e);
        }
    };

    const deleteInvoice = async (id: string) => {
        try {
            await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' });
            setInvoices(prev => prev.filter(inv => inv.id !== id));
        } catch (e) {
            console.error("Failed to delete invoice", e);
        }
    };

    return { invoices, addInvoice, updateInvoice, deleteInvoice, isLoading };
}
