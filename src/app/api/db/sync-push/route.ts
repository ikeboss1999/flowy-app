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
                const records = sqliteDb.prepare(`SELECT * FROM ${table}`).all() as any[];
                if (!records || records.length === 0) {
                    writeLog('SyncPush', `No local records found for ${table}.`);
                    continue;
                }

                // 2. Fetch remote timestamps to prevent pushing massive unchanged loops
                const { data: remoteTimestamps, error: tsError } = await client
                    .from(table)
                    .select('id, updatedAt');

                let recordsToPush = records;

                if (!tsError && remoteTimestamps) {
                    const remoteMap = new Map(remoteTimestamps.map(r => [r.id, r.updatedAt]));
                    recordsToPush = records.filter(local => {
                        const remoteUpdated = remoteMap.get(local.id);
                        if (!remoteUpdated) return true; // New record

                        const localTime = new Date(local.updatedAt || 0).getTime();
                        const remoteTime = new Date(remoteUpdated || 0).getTime();

                        return localTime > remoteTime; // Only push if local is actually newer
                    });
                } else {
                    writeLog('SyncPush', `Warning: Could not fetch remote timestamps for ${table}, pushing all.`);
                }

                if (recordsToPush.length === 0) {
                    writeLog('SyncPush', `No newer local records found for ${table}. Skipping push.`);
                    console.log(`[SyncPush] No newer records for ${table}.`);
                    continue;
                }

                writeLog('SyncPush', `Found ${recordsToPush.length} newer records for ${table} (out of ${records.length}). Syncing...`);
                console.log(`[SyncPush] Found ${recordsToPush.length} newer records for ${table} (out of ${records.length}). Syncing...`);

                // 2. Prepare and Upsert in batches
                // Optimization: Use smaller batches for tables with potential large Base64 data (avatars, diary images)
                const isLargeDataTable = table === 'employees' || table === 'projects';
                const batchSize = isLargeDataTable ? 5 : 50;

                for (let i = 0; i < recordsToPush.length; i += batchSize) {
                    const batch = recordsToPush.slice(i, i + batchSize);
                    const syncData = UnifiedDB.prepareForCloud(table, batch, userId);

                    const { error } = await client
                        .from(table)
                        .upsert(syncData);

                    if (error) {
                        console.error(`[SyncPush] Error syncing ${table} batch:`, error);
                        writeLog('SyncPush', `Error syncing ${table} batch: ${error.message}`);
                        throw error;
                    }
                }

                totalSynced += recordsToPush.length;
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
