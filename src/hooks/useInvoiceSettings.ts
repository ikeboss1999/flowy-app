"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { InvoiceSettings } from '@/types/invoice';
import { fetcher } from '@/lib/fetcher';

const initialData: InvoiceSettings = {
    nextInvoiceNumber: 1,
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
    const { user } = useAuth();

    const key = user ? `/api/settings?userId=${user.id}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    let data: InvoiceSettings = initialData;
    if (allSettings?.invoiceSettings) {
        const s = allSettings.invoiceSettings;
        data = s.paymentTerms
            ? s
            : { ...s, paymentTerms: initialData.paymentTerms, defaultPaymentTermId: initialData.defaultPaymentTermId };
    }

    const updateData = async (newData: Partial<InvoiceSettings>) => {
        if (!user) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, invoiceSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'invoice', data: updated })
            });
        } catch (e) {
            console.error('Failed to update invoice settings', e);
            mutate();
        }
    };

    const updateDunningLevel = async (levelKey: keyof InvoiceSettings['dunningLevels'], newData: Partial<{ fee: number; period: number }>) => {
        if (!user) return;
        const updatedDunning = { ...data.dunningLevels, [levelKey]: { ...data.dunningLevels[levelKey], ...newData } };
        const updated = { ...data, dunningLevels: updatedDunning };
        mutate({ ...allSettings, invoiceSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'invoice', data: updated })
            });
        } catch (e) {
            console.error('Failed to update dunning levels', e);
            mutate();
        }
    };

    return { data, updateData, updateDunningLevel, isLoading };
}
