"use client";

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { EmailDeliverySettings, EmailSendLog } from '@/types/email';

export const DEFAULT_EMAIL_DELIVERY_SETTINGS: EmailDeliverySettings = {
    smtpHost: '',
    smtpPort: 587,
    smtpSecurity: 'starttls',
    smtpUser: '',
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
    sendCopyToSelf: false,
    signature: '',
    signatureHtml: '',
    hasSmtpPassword: false,
};

export function useEmailSettings() {
    const { data, isLoading, error, mutate } = useSWR('/api/email/settings', fetcher);

    const delivery: EmailDeliverySettings = {
        ...DEFAULT_EMAIL_DELIVERY_SETTINGS,
        ...(data?.delivery || {}),
        smtpPassword: '',
    };
    const logs: EmailSendLog[] = Array.isArray(data?.logs)
        ? data.logs
        : [];

    const updateDelivery = async (updates: Partial<EmailDeliverySettings> & { clearSmtpPassword?: boolean }) => {
        const { smtpPassword, clearSmtpPassword, ...nonSecretUpdates } = updates;
        const nextDeliveryForCache = {
            ...delivery,
            ...nonSecretUpdates,
            smtpPassword: '',
            hasSmtpPassword: clearSmtpPassword ? false : delivery.hasSmtpPassword || !!smtpPassword,
        };
        const nextDeliveryForServer = {
            ...nextDeliveryForCache,
            smtpPassword: smtpPassword || undefined,
            clearSmtpPassword,
        };

        mutate({ ...(data || {}), delivery: nextDeliveryForCache, logs }, false);
        try {
            const response = await fetch('/api/email/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delivery: nextDeliveryForServer }),
            });
            if (!response.ok) throw new Error('Failed to save email settings');
            mutate();
        } catch (e) {
            console.error('Failed to update email settings', e);
            mutate();
            throw e;
        }
    };

    const deleteConnection = async () => {
        const response = await fetch('/api/email/settings', { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete email settings');
        await mutate();
    };

    const refresh = async () => {
        await mutate();
    };

    return {
        delivery,
        logs,
        updateDelivery,
        deleteConnection,
        isLoading,
        error: error?.message ?? null,
        refresh,
    };
}
