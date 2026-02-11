import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { data: row, error } = await supabase
                .from('settings')
                .select('*')
                .eq('userId', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

            if (!row) {
                return NextResponse.json({
                    companyData: null,
                    accountSettings: null,
                    invoiceSettings: null
                });
            }

            return NextResponse.json(row);
        } else {
            const stmt = sqliteDb.prepare('SELECT * FROM settings WHERE userId = ?');
            const row = stmt.get(userId) as any;

            if (!row) {
                return NextResponse.json({
                    companyData: null,
                    accountSettings: null,
                    invoiceSettings: null
                });
            }

            return NextResponse.json({
                companyData: row.companyData ? JSON.parse(row.companyData) : null,
                accountSettings: row.accountSettings ? JSON.parse(row.accountSettings) : null,
                invoiceSettings: row.invoiceSettings ? JSON.parse(row.invoiceSettings) : null
            });
        }
    } catch (e) {
        console.error('[API Settings] GET Error:', e);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, type, data } = await request.json();

        if (!userId || !type || !data) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const column = type === 'company' ? 'companyData' :
            type === 'account' ? 'accountSettings' :
                type === 'invoice' ? 'invoiceSettings' : null;

        if (!column) {
            return NextResponse.json({ error: 'Invalid settings type' }, { status: 400 });
        }

        if (isWeb) {
            // Incremental Update in Cloud
            const { error } = await supabase
                .from('settings')
                .upsert({
                    userId,
                    [column]: data,
                    updatedAt: new Date().toISOString()
                });
            if (error) throw error;
        } else {
            // Local Update
            const exists = sqliteDb.prepare('SELECT userId FROM settings WHERE userId = ?').get(userId);
            if (!exists) {
                sqliteDb.prepare('INSERT INTO settings (userId) VALUES (?)').run(userId);
            }

            const stmt = sqliteDb.prepare(`UPDATE settings SET ${column} = ?, updatedAt = ? WHERE userId = ?`);
            stmt.run(JSON.stringify(data), new Date().toISOString(), userId);

            // Fetch full row for sync
            const fullRow = sqliteDb.prepare('SELECT * FROM settings WHERE userId = ?').get(userId);
            UnifiedDB.syncToCloud('settings', fullRow, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[API Settings] POST Error:', e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
