import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('settings')
            .select('*')
            .eq('userId', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            const processed = { ...data };
            if (processed.companyData && Object.keys(processed.companyData).length === 0) processed.companyData = null;
            if (processed.accountSettings && Object.keys(processed.accountSettings).length === 0) processed.accountSettings = null;
            if (processed.invoiceSettings && Object.keys(processed.invoiceSettings).length === 0) processed.invoiceSettings = null;
            return NextResponse.json(processed);
        }

        return NextResponse.json({});
    } catch (e) {
        console.error('[SettingsAPI] GET failed:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        // 1. Fetch Existing Settings
        const { data } = await client.from('settings').select('*').eq('userId', userId).single();
        const currentSettings: any = data || {};

        // 2. Merge New Data
        let updatedSettings = { ...currentSettings, updatedAt: now, userId };

        if (payload.type && payload.data) {
            if (payload.type === 'company') updatedSettings.companyData = payload.data;
            if (payload.type === 'account') updatedSettings.accountSettings = payload.data;
            if (payload.type === 'invoice') updatedSettings.invoiceSettings = payload.data;
        } else {
            updatedSettings = {
                ...updatedSettings,
                companyData: payload.companyData || currentSettings.companyData || {},
                accountSettings: payload.accountSettings || currentSettings.accountSettings || {},
                invoiceSettings: payload.invoiceSettings || currentSettings.invoiceSettings || {}
            };
        }

        // 3. Save
        const { error } = await client.from('settings').upsert(updatedSettings);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[SettingsAPI] POST failed:', e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
