import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeUpsert } from '@/lib/supabase-helper';
import { logApiPerformance } from '@/lib/api-performance';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

function sanitizeEmailDeliveryForClient(delivery: any = {}) {
    const { smtpPassword, smtpPasswordEncrypted, ...safeDelivery } = delivery || {};
    return {
        ...safeDelivery,
        hasSmtpPassword: !!smtpPasswordEncrypted || !!smtpPassword,
    };
}

function sanitizeAccountSettingsForClient(accountSettings: any = {}) {
    if (!accountSettings?.emailDelivery) return accountSettings;
    return {
        ...accountSettings,
        emailDelivery: sanitizeEmailDeliveryForClient(accountSettings.emailDelivery),
    };
}

function prepareAccountSettingsForSave(nextAccountSettings: any = {}, currentAccountSettings: any = {}) {
    if (!nextAccountSettings?.emailDelivery) return nextAccountSettings;

    const incomingDelivery = nextAccountSettings.emailDelivery || {};
    const currentDelivery = currentAccountSettings.emailDelivery || {};
    const { smtpPassword, hasSmtpPassword, clearSmtpPassword, ...safeIncomingDelivery } = incomingDelivery;

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

    return {
        ...nextAccountSettings,
        emailDelivery: nextDelivery,
    };
}

function readSettingsBlock(settings: any = {}, key: string) {
    return settings?.[key] || settings?.accountSettings?.[key] || null;
}

function isMissingSettingsColumnError(error: any, key: string) {
    return !!error && (
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        String(error.message || '').includes(`'${key}' column`) ||
        String(error.message || '').includes(`"${key}" column`) ||
        String(error.message || '').includes(key)
    );
}

async function saveSettingsWithJsonFallback(client: any, updatedSettings: any, fallbackKey?: string) {
    const result = await safeUpsert(client, 'settings', updatedSettings);
    if (!result.error || !fallbackKey || !isMissingSettingsColumnError(result.error, fallbackKey)) {
        return result;
    }

    const { [fallbackKey]: fallbackValue, ...settingsWithoutMissingColumn } = updatedSettings;
    const fallbackSettings = {
        ...settingsWithoutMissingColumn,
        accountSettings: {
            ...(updatedSettings.accountSettings || {}),
            [fallbackKey]: fallbackValue,
        },
    };

    return safeUpsert(client, 'settings', fallbackSettings);
}

export async function GET(request: Request) {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { searchParams } = new URL(request.url);
        const accountUserId = searchParams.get('accountUserId');
        const settingsUserId = accountUserId && accountUserId === session?.userId
            ? session.userId
            : companyOwnerId;
        const { data, error } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            if (accountUserId && accountUserId === session?.userId) {
                const payload = {
                    accountSettings: data.accountSettings ? sanitizeAccountSettingsForClient(data.accountSettings) : null,
                };
                logApiPerformance('/api/settings', startedAt, { payload, note: 'account' });
                return NextResponse.json(payload);
            }

            // Employees get readonly numbering/document settings from the company owner.
            if (session?.role === 'employee') {
                const payload = {
                    companyData: data.companyData || {},
                    invoiceSettings: readSettingsBlock(data, 'invoiceSettings'),
                    offerSettings: readSettingsBlock(data, 'offerSettings'),
                    orderSettings: readSettingsBlock(data, 'orderSettings'),
                    projectSettings: readSettingsBlock(data, 'projectSettings'),
                    customerSettings: readSettingsBlock(data, 'customerSettings'),
                };
                logApiPerformance('/api/settings', startedAt, { payload, note: 'employee' });
                return NextResponse.json(payload);
            }

            const processed = { ...data };
            if (processed.companyData && Object.keys(processed.companyData).length === 0) processed.companyData = null;
            if (processed.accountSettings && Object.keys(processed.accountSettings).length === 0) processed.accountSettings = null;
            if (processed.accountSettings) processed.accountSettings = sanitizeAccountSettingsForClient(processed.accountSettings);
            processed.invoiceSettings = readSettingsBlock(processed, 'invoiceSettings');
            processed.offerSettings = readSettingsBlock(processed, 'offerSettings');
            processed.orderSettings = readSettingsBlock(processed, 'orderSettings');
            processed.projectSettings = readSettingsBlock(processed, 'projectSettings');
            processed.customerSettings = readSettingsBlock(processed, 'customerSettings');
            if (processed.invoiceSettings && Object.keys(processed.invoiceSettings).length === 0) processed.invoiceSettings = null;
            if (processed.offerSettings && Object.keys(processed.offerSettings).length === 0) processed.offerSettings = null;
            if (processed.orderSettings && Object.keys(processed.orderSettings).length === 0) processed.orderSettings = null;
            if (processed.projectSettings && Object.keys(processed.projectSettings).length === 0) processed.projectSettings = null;
            if (processed.customerSettings && Object.keys(processed.customerSettings).length === 0) processed.customerSettings = null;
            logApiPerformance('/api/settings', startedAt, { payload: processed });
            return NextResponse.json(processed);
        }

        logApiPerformance('/api/settings', startedAt, { payload: {}, note: 'empty' });
        return NextResponse.json({});
    } catch (e) {
        console.error('[SettingsAPI] GET failed:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const employeeWritableTypes: Record<string, string> = {
            account: 'self',
            customer: 'customers_write',
            invoice: 'invoices_write',
            offer: 'offers_write',
            order: 'orders_write',
            project: 'projects_write',
        };

        if (session?.role === 'employee') {
            const requiredPermission = payload?.type ? employeeWritableTypes[payload.type] : null;
            if (!requiredPermission || (requiredPermission !== 'self' && !hasPermission(session, requiredPermission))) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const settingsUserId = session?.role === 'employee' && payload?.type === 'account'
            ? session.userId
            : companyOwnerId;

        // 1. Fetch Existing Settings
        const { data } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .single();
        const currentSettings: any = data || {};

        // 2. Merge New Data
        let updatedSettings = {
            ...currentSettings,
            updatedAt: now,
            userId: settingsUserId,
            updated_by: session.userId
        };

        if (!currentSettings.userId) {
            updatedSettings.created_by = session.userId;
        }

        let fallbackKey: string | undefined;

        if (payload.type && payload.data) {
            if (payload.type === 'company') updatedSettings.companyData = payload.data;
            if (payload.type === 'account') {
                updatedSettings.accountSettings = prepareAccountSettingsForSave(payload.data, currentSettings.accountSettings || {});
            }
            if (payload.type === 'invoice') updatedSettings.invoiceSettings = payload.data;
            if (payload.type === 'offer') updatedSettings.offerSettings = payload.data;
            if (payload.type === 'order') {
                updatedSettings.orderSettings = payload.data;
                fallbackKey = 'orderSettings';
            }
            if (payload.type === 'project') updatedSettings.projectSettings = payload.data;
            if (payload.type === 'customer') updatedSettings.customerSettings = payload.data;
        } else {
            updatedSettings = {
                ...updatedSettings,
                companyData: payload.companyData || currentSettings.companyData || {},
                accountSettings: payload.accountSettings || currentSettings.accountSettings || {},
                invoiceSettings: payload.invoiceSettings || currentSettings.invoiceSettings || {},
                customerSettings: payload.customerSettings || currentSettings.customerSettings || {}
            };
        }

        // 3. Save
        const { error } = await saveSettingsWithJsonFallback(client, updatedSettings, fallbackKey);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[SettingsAPI] POST failed:', e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}


