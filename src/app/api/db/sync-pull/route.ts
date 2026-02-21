import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { writeLog } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
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
        writeLog('SyncPull', `POST request received. userId from body: ${userId}`);

        // SECURITY: Verify that the request comes from the authenticated user
        const session = await getUserSession();
        if (!session) {
            writeLog('SyncPull', 'Unauthorized: No session found.');
            return NextResponse.json({ message: 'Unauthorized: No session found.' }, { status: 401 });
        }

        if (session.userId !== userId) {
            writeLog('SyncPull', `Unauthorized: Session mismatch. Session UID: ${session.userId}, Body UID: ${userId}`);
            return NextResponse.json({ message: 'Unauthorized: Session mismatch.' }, { status: 401 });
        }

        if (!userId) {
            return NextResponse.json({ message: 'User ID erforderlich.' }, { status: 400 });
        }

        writeLog('SyncPull', `Starting full data pull from Cloud for user: ${userId}`);
        let totalPulled = 0;

        // 3. Create authenticated client with user's token
        // This ensures RLS is bypassed OR respected correctly according to the user's rights
        // without requiring the sensitive service_role key in the packaged app.
        const client = session.accessToken
            ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: `Bearer ${session.accessToken}` } }
            })
            : (supabaseAdmin || supabase);

        if (session.accessToken) {
            writeLog('SyncPull', 'Using authenticated client with user token.');
        } else {
            writeLog('SyncPull', 'WARNING: No access token in session. Falling back to admin/anon client.');
        }

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        for (const table of tables) {
            try {
                writeLog('SyncPull', `Fetching table: ${table}...`);
                // 1. Fetch from Cloud
                const { data: cloudRecords, error } = await client
                    .from(table)
                    .select('*')
                    .eq('userId', userId);

                if (error) {
                    writeLog('SyncPull', `Error fetching ${table}: ${error.message}`);
                    throw error;
                }

                if (!cloudRecords || cloudRecords.length === 0) {
                    writeLog('SyncPull', `No records found in cloud for ${table}.`);
                    continue;
                }

                writeLog('SyncPull', `Found ${cloudRecords.length} records in cloud for ${table}.`);
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
