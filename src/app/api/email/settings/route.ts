import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';
import { safeUpsert } from '@/lib/supabase-helper';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sanitizeEmailDeliveryForClient(delivery: any = {}) {
    const { smtpPassword, smtpPasswordEncrypted, clearSmtpPassword, ...safeDelivery } = delivery || {};
    return {
        ...safeDelivery,
        hasSmtpPassword: !!smtpPasswordEncrypted || !!smtpPassword,
    };
}

function prepareEmailDeliveryForSave(nextDeliveryInput: any = {}, currentDelivery: any = {}) {
    const { smtpPassword, hasSmtpPassword, clearSmtpPassword, ...safeIncomingDelivery } = nextDeliveryInput || {};

    const nextDelivery: any = {
        ...currentDelivery,
        ...safeIncomingDelivery,
    };

    if (clearSmtpPassword) {
        delete nextDelivery.smtpPasswordEncrypted;
    } else if (typeof smtpPassword === 'string' && smtpPassword.trim()) {
        nextDelivery.smtpPasswordEncrypted = encrypt(smtpPassword.trim());
    } else if (currentDelivery.smtpPasswordEncrypted) {
        nextDelivery.smtpPasswordEncrypted = currentDelivery.smtpPasswordEncrypted;
    }

    delete nextDelivery.smtpPassword;
    delete nextDelivery.hasSmtpPassword;
    delete nextDelivery.clearSmtpPassword;

    return nextDelivery;
}

function toPayload(settings: any = {}) {
    const accountSettings = settings.accountSettings || {};
    return {
        delivery: sanitizeEmailDeliveryForClient(accountSettings.emailDelivery || {}),
        logs: Array.isArray(accountSettings.emailSendLogs) ? accountSettings.emailSendLogs : [],
    };
}

export async function GET() {
    const session = await getUserSession();
    const settingsUserId = session?.userId;

    if (!settingsUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json(toPayload(data || { accountSettings: {} }));
    } catch (e) {
        console.error('[EmailSettingsAPI] GET failed:', e);
        return NextResponse.json({ error: 'Failed to load email settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const settingsUserId = session?.userId;

    if (!settingsUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const client = supabaseAdmin || supabase;

        const { data, error: loadError } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .maybeSingle();

        if (loadError) throw loadError;

        const currentSettings: any = data || { userId: settingsUserId, accountSettings: {} };
        const currentAccountSettings = currentSettings.accountSettings || {};
        const updatedSettings = {
            ...currentSettings,
            userId: settingsUserId,
            updatedAt: new Date().toISOString(),
            updated_by: settingsUserId,
            accountSettings: {
                ...currentAccountSettings,
                emailDelivery: prepareEmailDeliveryForSave(payload.delivery || {}, currentAccountSettings.emailDelivery || {}),
            },
        };

        if (!data?.userId) {
            (updatedSettings as any).created_by = settingsUserId;
        }

        const { error } = await safeUpsert(client, 'settings', updatedSettings);
        if (error) throw error;

        return NextResponse.json({ success: true, ...toPayload(updatedSettings) });
    } catch (e) {
        console.error('[EmailSettingsAPI] POST failed:', e);
        return NextResponse.json({ error: 'Failed to save email settings' }, { status: 500 });
    }
}

export async function DELETE() {
    const session = await getUserSession();
    const settingsUserId = session?.userId;

    if (!settingsUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data, error: loadError } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .maybeSingle();

        if (loadError) throw loadError;

        const currentSettings: any = data || { userId: settingsUserId, accountSettings: {} };
        const currentAccountSettings = currentSettings.accountSettings || {};
        const { emailDelivery, ...remainingAccountSettings } = currentAccountSettings;

        const updatedSettings = {
            ...currentSettings,
            userId: settingsUserId,
            updatedAt: new Date().toISOString(),
            updated_by: settingsUserId,
            accountSettings: remainingAccountSettings,
        };

        if (!data?.userId) {
            (updatedSettings as any).created_by = settingsUserId;
        }

        const { error } = await safeUpsert(client, 'settings', updatedSettings);
        if (error) throw error;

        return NextResponse.json({ success: true, ...toPayload(updatedSettings) });
    } catch (e) {
        console.error('[EmailSettingsAPI] DELETE failed:', e);
        return NextResponse.json({ error: 'Failed to delete email settings' }, { status: 500 });
    }
}
