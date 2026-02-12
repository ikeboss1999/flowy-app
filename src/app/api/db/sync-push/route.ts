import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';

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
        if (!userId) {
            return NextResponse.json({ message: 'User ID erforderlich.' }, { status: 400 });
        }

        console.log(`[SyncPush] Starting full data push to Cloud for user: ${userId}`);

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalSynced = 0;

        for (const table of tables) {
            try {
                // 1. Fetch all local records
                const records = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
                if (!records || records.length === 0) continue;

                console.log(`[SyncPush] Found ${records.length} records for ${table}. Syncing...`);

                // 2. Prepare and Upsert in batches of 100
                const batchSize = 100;
                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    const syncData = UnifiedDB.prepareForCloud(table, batch, userId);

                    const { error } = await supabase
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
                // Continue with other tables, but report partial failure if needed
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
