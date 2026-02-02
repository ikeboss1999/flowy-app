"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { InvoiceSettings } from '@/types/invoice';

const STORAGE_KEY = 'flowy_invoice_settings';

const initialData: InvoiceSettings = {
    invoicePrefix: '',
    nextInvoiceNumber: 1,
    employeePrefix: 'MA-',
    nextEmployeeNumber: 1,
    defaultPaymentTerm: 'sofort nach Rechnungserhalt',
    defaultTaxRate: 20,
    defaultCurrency: 'EUR (€)',
    dunningLevels: {
        level1: { fee: 0, period: 7 },
        level2: { fee: 10, period: 7 },
        level3: { fee: 10, period: 7 },
        level4: { fee: 0, period: 3 }
    }
};

export function useInvoiceSettings() {
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<InvoiceSettings>(initialData);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const response = await fetch(`/api/settings?userId=${user.id}`);
                const allSettings = await response.json();

                if (allSettings.invoiceSettings) {
                    setData(allSettings.invoiceSettings);
                } else {
                    // Migration
                    const storageKey = `${STORAGE_KEY}_${user.id}`;
                    const savedData = localStorage.getItem(storageKey);
                    if (savedData) {
                        try {
                            const parsed = JSON.parse(savedData);
                            await fetch('/api/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, type: 'invoice', data: parsed })
                            });
                            setData(parsed);
                        } catch (e) {
                            console.error('Migration failed', e);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load invoice settings', e);
            }
            setIsLoading(false);
        };

        loadData();
    }, [user, authLoading]);

    const updateData = async (newData: Partial<InvoiceSettings>) => {
        if (!user) return;
        const updated = { ...data, ...newData };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'invoice', data: updated })
            });
            setData(updated);
        } catch (e) {
            console.error('Failed to update invoice settings', e);
        }
    };

    const updateDunningLevel = async (levelKey: keyof InvoiceSettings['dunningLevels'], newData: Partial<{ fee: number; period: number }>) => {
        if (!user) return;

        const updatedDunning = {
            ...data.dunningLevels,
            [levelKey]: { ...data.dunningLevels[levelKey], ...newData }
        };
        const updated = { ...data, dunningLevels: updatedDunning };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'invoice', data: updated })
            });
            setData(updated);
        } catch (e) {
            console.error('Failed to update dunning levels', e);
        }
    };

    return { data, updateData, updateDunningLevel, isLoading: isLoading || authLoading };
}
