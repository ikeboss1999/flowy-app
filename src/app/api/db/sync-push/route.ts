import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { writeLog } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/db/sync-push
 * Local-only endpoint that pushes all existing SQLite data to Supabase Tables.
 */
export async function POST(request: Request) {
    if (isWeb) {
        return NextResponse.json({ message: 'Sync-Push ist nur in der lokalen App verfügbar.' }, { status: 403 });
    }

    try {
        const { userId } = await request.json();
        writeLog('SyncPush', `POST request received. userId from body: ${userId}`);

        if (!userId) {
            return NextResponse.json({ message: 'User ID erforderlich.' }, { status: 400 });
        }

        // SECURITY: Verify that the request comes from the authenticated user
        const session = await getUserSession();
        if (!session) {
            writeLog('SyncPush', 'Unauthorized: No session found.');
            return NextResponse.json({ message: 'Unauthorized: No session found.' }, { status: 401 });
        }

        if (session.userId !== userId) {
            writeLog('SyncPush', `Unauthorized: Session mismatch. Session UID: ${session.userId}, Body UID: ${userId}`);
            return NextResponse.json({ message: 'Unauthorized: Session mismatch.' }, { status: 401 });
        }

        writeLog('SyncPush', `Starting full data push to Cloud for user: ${userId}`);
        console.log(`[SyncPush] Starting full data push to Cloud for user: ${userId}`);

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalSynced = 0;

        // 3. Create authenticated client with user's token
        const client = session.accessToken
            ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: `Bearer ${session.accessToken}` } }
            })
            : (supabaseAdmin || supabase);

        if (session.accessToken) {
            writeLog('SyncPush', 'Using authenticated client with user token.');
        } else {
            writeLog('SyncPush', 'WARNING: No access token in session. Falling back to admin/anon client.');
        }

        for (const table of tables) {
            try {
                // 1. Fetch all local records
                const records = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
                if (!records || records.length === 0) {
                    writeLog('SyncPush', `No local records found for ${table}.`);
                    continue;
                }

                writeLog('SyncPush', `Found ${records.length} records for ${table}. Syncing...`);
                console.log(`[SyncPush] Found ${records.length} records for ${table}. Syncing...`);

                // 2. Prepare and Upsert in batches of 100
                const batchSize = 100;
                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    const syncData = UnifiedDB.prepareForCloud(table, batch, userId);

                    const { error } = await client
                        .from(table)
                        .upsert(syncData);

                    if (error) {
                        console.error(`[SyncPush] Error syncing ${table} batch:`, error);
                        throw error;
                    }
                }

                totalSynced += records.length;
            } catch (err) {
                console.error(`[SyncPush] Failed to sync table ${table}:`, err);
            }
        }

        return NextResponse.json({
            message: 'Synchronisierung abgeschlossen.',
            totalSynced
        });

    } catch (error: any) {
        console.error('[SyncPush] Critical failure:', error);
        return NextResponse.json({
            message: 'Fehler bei der Synchronisierung.',
            error: error.message
        }, { status: 500 });
    }
}
