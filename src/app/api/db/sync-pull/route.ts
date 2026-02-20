import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isWeb, SCHEMA_KEYS } from '@/lib/database';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/db/sync-pull
 * Local-only endpoint that pulls all user data from Supabase and populates SQLite.
 */
export async function POST(request: Request) {
    if (isWeb) {
        return NextResponse.json({ message: 'Sync-Pull ist nur in der lokalen App verfügbar.' }, { status: 403 });
    }

    try {
        const { userId } = await request.json();

        // SECURITY: Verify that the request comes from the authenticated user
        const session = await getUserSession();
        if (!session || session.userId !== userId) {
            return NextResponse.json({ message: 'Unauthorized: Session mismatch.' }, { status: 401 });
        }

        if (!userId) {
            return NextResponse.json({ message: 'User ID erforderlich.' }, { status: 400 });
        }

        console.log(`[SyncPull] Starting full data pull from Cloud for user: ${userId}`);

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalPulled = 0;
        const client = supabaseAdmin || supabase;

        for (const table of tables) {
            try {
                // 1. Fetch from Cloud
                const { data: cloudRecords, error } = await client
                    .from(table)
                    .select('*')
                    .eq('userId', userId);

                if (error) throw error;
                if (!cloudRecords || cloudRecords.length === 0) continue;

                console.log(`[SyncPull] Found ${cloudRecords.length} records in cloud for ${table}.`);

                const validKeys = SCHEMA_KEYS[table];

                // 2. Insert into Local SQLite
                for (const record of cloudRecords) {
                    const prepared: any = {};

                    // Only include keys that exist in our local schema
                    const columnsToSync = validKeys || Object.keys(record);

                    for (const key of columnsToSync) {
                        // Check for key, snake_case key, or lowercase key
                        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                        const lowerKey = key.toLowerCase();

                        let val = record[key];

                        if (val === undefined) val = record[snakeKey];
                        if (val === undefined) val = record[lowerKey];

                        if (val === undefined) continue;

                        // Convert objects to JSON strings for SQLite
                        if (typeof val === 'object' && val !== null) {
                            val = JSON.stringify(val);
                        }
                        // Convert booleans to 0/1 for SQLite
                        if (typeof val === 'boolean') {
                            val = val ? 1 : 0;
                        }
                        prepared[key] = val;
                    }

                    // Ensure userId is present if table has it
                    if (validKeys?.includes('userId') && !prepared.userId) {
                        prepared.userId = userId;
                    }

                    try {
                        const pkColumn = table === 'settings' ? 'userId' : 'id';
                        const pkValue = record[pkColumn];

                        const localRecord = sqliteDb.prepare(`SELECT updatedAt FROM ${table} WHERE ${pkColumn} = ?`).get(pkValue) as { updatedAt?: string } | undefined;

                        const isCloudNewer = !localRecord || !localRecord.updatedAt || !record.updatedAt ||
                            new Date(record.updatedAt) > new Date(localRecord.updatedAt);

                        if (isCloudNewer) {
                            const columns = Object.keys(prepared);
                            const placeholders = columns.map(() => '?').join(',');
                            const values = columns.map(k => prepared[k]);

                            sqliteDb.prepare(`
                                INSERT OR REPLACE INTO ${table} (${columns.join(',')})
                                VALUES (${placeholders})
                            `).run(...values);
                            totalPulled++;
                        }
                    } catch (dbErr: any) {
                        console.error(`[SyncPull] DB Error during insert into ${table}:`, dbErr.message);
                    }
                }

            } catch (err) {
                console.error(`[SyncPull] Failed to pull table ${table}:`, err);
            }
        }

        return NextResponse.json({
            message: 'Cloud-Stand erfolgreich geladen.',
            totalPulled
        });

    } catch (error: any) {
        console.error('[SyncPull] Critical failure:', error);
        return NextResponse.json({
            message: 'Fehler beim Laden aus der Cloud.',
            error: error.message
        }, { status: 500 });
    }
}
