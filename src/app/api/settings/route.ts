import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data, error } = await client
                .from('settings')
                .select('*')
                .eq('userId', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Post-process to ensure empty objects are null
            if (data) {
                const processed = { ...data };
                if (processed.companyData && Object.keys(processed.companyData).length === 0) processed.companyData = null;
                if (processed.accountSettings && Object.keys(processed.accountSettings).length === 0) processed.accountSettings = null;
                if (processed.invoiceSettings && Object.keys(processed.invoiceSettings).length === 0) processed.invoiceSettings = null;
                return NextResponse.json(processed);
            }

            return NextResponse.json({});
        } else {
            const row = sqliteDb.prepare('SELECT * FROM settings WHERE userId = ?').get(userId) as any;
            if (row) {
                const parseOrNull = (json: string) => {
                    if (!json) return null;
                    try {
                        const parsed = JSON.parse(json);
                        return Object.keys(parsed).length > 0 ? parsed : null;
                    } catch (e) { return null; }
                };

                return NextResponse.json({
                    ...row,
                    companyData: parseOrNull(row.companyData),
                    accountSettings: parseOrNull(row.accountSettings),
                    invoiceSettings: parseOrNull(row.invoiceSettings)
                });
            }
            return NextResponse.json({});
        }
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

        // 1. Fetch Existing Settings
        let currentSettings: any = {};
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data } = await client.from('settings').select('*').eq('userId', userId).single();
            if (data) currentSettings = data;
        } else {
            const row = sqliteDb.prepare('SELECT * FROM settings WHERE userId = ?').get(userId) as any;
            if (row) {
                currentSettings = {
                    ...row,
                    companyData: row.companyData ? JSON.parse(row.companyData) : {},
                    accountSettings: row.accountSettings ? JSON.parse(row.accountSettings) : {},
                    invoiceSettings: row.invoiceSettings ? JSON.parse(row.invoiceSettings) : {}
                };
            }
        }

        // 2. Merge New Data
        let updatedSettings = { ...currentSettings, updatedAt: now, userId };

        if (payload.type && payload.data) {
            // Incremental update from hooks (type: 'company', 'account', 'invoice')
            if (payload.type === 'company') updatedSettings.companyData = payload.data;
            if (payload.type === 'account') updatedSettings.accountSettings = payload.data;
            if (payload.type === 'invoice') updatedSettings.invoiceSettings = payload.data;
        } else {
            // Full-object update (fallback)
            updatedSettings = {
                ...updatedSettings,
                companyData: payload.companyData || currentSettings.companyData || {},
                accountSettings: payload.accountSettings || currentSettings.accountSettings || {},
                invoiceSettings: payload.invoiceSettings || currentSettings.invoiceSettings || {}
            };
        }

        // 3. Save
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('settings').upsert(updatedSettings);
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO settings 
                (userId, companyData, accountSettings, invoiceSettings, updatedAt)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(
                userId,
                JSON.stringify(updatedSettings.companyData),
                JSON.stringify(updatedSettings.accountSettings),
                JSON.stringify(updatedSettings.invoiceSettings),
                now
            );

            // Silent Sync to Cloud
            UnifiedDB.syncToCloud('settings', updatedSettings, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[SettingsAPI] POST failed:', e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
