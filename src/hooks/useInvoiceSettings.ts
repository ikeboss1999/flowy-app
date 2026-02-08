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
    paymentTerms: [
        { id: '1', name: 'Sofort', text: 'sofort nach Rechnungserhalt', days: 0 },
        { id: '2', name: '7 Tage', text: 'zahlbar innerhalb von 7 Tagen ohne Abzug', days: 7 },
        { id: '3', name: '14 Tage', text: 'zahlbar innerhalb von 14 Tagen ohne Abzug', days: 14 },
        { id: '4', name: '30 Tage', text: 'zahlbar innerhalb von 30 Tagen ohne Abzug', days: 30 }
    ],
    defaultPaymentTermId: '1',
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
    const { user, isLoading: authLoading } = useAuth();
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
                    let settings = allSettings.invoiceSettings;
                    // Migration: Ensure paymentTerms exist
                    if (!settings.paymentTerms) {
                        settings = {
                            ...settings,
                            paymentTerms: initialData.paymentTerms,
                            defaultPaymentTermId: initialData.defaultPaymentTermId
                        };
                        // Note: We don't necessarily need to POST back immediately, 
                        // it will be saved on next update.
                    }
                    setData(settings);
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
