"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { OrderSettings } from '@/types/order';
import { fetcher } from '@/lib/fetcher';

const DEFAULT_INTRO = `Vielen Dank für Ihr Vertrauen. Hiermit bestätigen wir Ihren Auftrag wie folgt:`;

const DEFAULT_TERMS = `Zahlungsbedingungen: 14 Tage netto nach Rechnungserhalt ohne Abzug.
Es gelten unsere allgemeinen Geschäftsbedingungen.`;

const NEUTRAL_DEFAULT_TERMS = 'Zahlungsbedingungen gemäß Vereinbarung.';

const initialData: OrderSettings = {
    nextOrderNumber: 1,
    prefix: "AB-",
    // Bewahrt das bisherige Auftragsformat AB-001, kann in den Einstellungen angepasst werden.
    mindestLaenge: 3,
    defaultIntroText: DEFAULT_INTRO,
    defaultTerms: NEUTRAL_DEFAULT_TERMS,
    emailSubject: "Auftragsbestätigung {documentNumber}",
    emailBody: "Sehr geehrte Kundin, Sehr geehrter Kunde,\n\nvielen Dank für Ihre Beauftragung. Hiermit erhalten Sie unsere Auftragsbestätigung {documentNumber}.\n\nMit freundlichen Grüßen"
};

export function useOrderSettings() {
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;

    const key = ownerId ? `/api/settings?userId=${ownerId}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    const data: OrderSettings = allSettings?.orderSettings
        ? {
            ...initialData,
            ...allSettings.orderSettings,
            // Den bisherigen voreingestellten 14-Tage-Text nicht weiter als Standard anzeigen.
            defaultTerms: allSettings.orderSettings.defaultTerms === DEFAULT_TERMS
                ? NEUTRAL_DEFAULT_TERMS
                : (allSettings.orderSettings.defaultTerms ?? NEUTRAL_DEFAULT_TERMS),
        }
        : initialData;

    const updateData = async (newData: Partial<OrderSettings>) => {
        if (!ownerId) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, orderSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: ownerId, type: 'order', data: updated })
            });
        } catch (e) {
            console.error('Failed to update order settings', e);
            mutate();
        }
    };

    return { data, updateData, isLoading };
}
