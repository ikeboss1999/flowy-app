import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';

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
        if (!userId) {
            return NextResponse.json({ message: 'User ID erforderlich.' }, { status: 400 });
        }

        console.log(`[SyncPull] Starting full data pull from Cloud for user: ${userId}`);

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalPulled = 0;

        for (const table of tables) {
            try {
                // 1. Fetch from Cloud
                const { data: cloudRecords, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('userId', userId);

                if (error) throw error;
                if (!cloudRecords || cloudRecords.length === 0) continue;

                console.log(`[SyncPull] Found ${cloudRecords.length} records in cloud for ${table}.`);

                // 2. Insert into Local SQLite
                // Note: We need to handle the conversion back from JSON objects to JSON strings for SQLite
                for (const record of cloudRecords) {
                    const keys = Object.keys(record).filter(k => k !== 'userId'); // userId is often handled differently or implicit

                    // Simple logic: we only care about tables where we have schema.
                    // To be safe, we'll try to insert and ignore conflicts.
                    // But first, let's prepare the object.
                    const prepared: any = { ...record };
                    for (const key in prepared) {
                        if (typeof prepared[key] === 'object' && prepared[key] !== null) {
                            prepared[key] = JSON.stringify(prepared[key]);
                        }
                        if (typeof prepared[key] === 'boolean') {
                            prepared[key] = prepared[key] ? 1 : 0;
                        }
                    }

                    const columns = Object.keys(prepared);
                    const placeholders = columns.map(() => '?').join(',');
                    const values = columns.map(k => prepared[k]);

                    try {
                        // Conflict resolution: only overwrite if cloud record is newer or local record doesn't exist
                        const pkColumn = table === 'settings' ? 'userId' : 'id';
                        const pkValue = record[pkColumn];

                        const localRecord = sqliteDb.prepare(`SELECT updatedAt FROM ${table} WHERE ${pkColumn} = ?`).get(pkValue) as { updatedAt?: string } | undefined;

                        const isCloudNewer = !localRecord || !localRecord.updatedAt || !record.updatedAt ||
                            new Date(record.updatedAt) > new Date(localRecord.updatedAt);

                        if (isCloudNewer) {
                            sqliteDb.prepare(`
                                INSERT OR REPLACE INTO ${table} (${columns.join(',')})
                                VALUES (${placeholders})
                            `).run(...values);
                            totalPulled++;
                        } else {
                            console.log(`[SyncPull] Skipping ${table} record ${pkValue} - Local version is newer.`);
                        }
                    } catch (dbErr: any) {
                        console.error(`[SyncPull] DB Error during insert into ${table}:`, dbErr.message);
                        console.error(`[SyncPull] Record PK: ${record.id || record.userId || 'N/A'}`);
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
