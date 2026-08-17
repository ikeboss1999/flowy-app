"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { OfferSettings } from '@/types/offer';
import { fetcher } from '@/lib/fetcher';

const DEFAULT_INTRO = `Vielen Dank für Ihre Anfrage. Wir erlauben uns, Ihnen folgendes Angebot zu unterbreiten:`;

const initialData: OfferSettings = {
    nextOfferNumber: 1,
    defaultIntroText: DEFAULT_INTRO,
    defaultValidityDays: 20,
    defaultDiscountEnabled: false,
    defaultDiscountDays: 5,
    defaultDiscountPercent: 3,
    emailSubject: "Angebot {documentNumber}",
    emailBody: "Sehr geehrte Kundin, Sehr geehrter Kunde,\n\nvielen Dank für Ihr Interesse an unseren Tätigkeiten. Wie vereinbart erhalten Sie beigefügt unser Angebot {documentNumber}.\n\nMit freundlichen Grüßen"
};

export function useOfferSettings() {
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;

    const key = ownerId ? `/api/settings?userId=${ownerId}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);

    const data: OfferSettings = allSettings?.offerSettings
        ? { ...initialData, ...allSettings.offerSettings }
        : initialData;

    const updateData = async (newData: Partial<OfferSettings>) => {
        if (!ownerId) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, offerSettings: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: ownerId, type: 'offer', data: updated })
            });
        } catch (e) {
            console.error('Failed to update offer settings', e);
            mutate();
        }
    };

    return { data, updateData, isLoading };
}
