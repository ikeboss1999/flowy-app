import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/db/sync-identity
 * Updates all userId columns in the local SQLite database to a new ID.
 * Useful if the user wiped the cloud, re-registered, and now has a new UUID.
 */
export async function POST(request: Request) {
    if (isWeb) return NextResponse.json({ message: 'Only local.' }, { status: 403 });

    try {
        const { newUserId } = await request.json();
        if (!newUserId) return NextResponse.json({ message: 'New ID required.' }, { status: 400 });

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalUpdated = 0;

        for (const table of tables) {
            try {
                // Find records that don't belong to the new ID
                const result = sqliteDb.prepare(`
                    UPDATE ${table} SET userId = ? WHERE userId != ? OR userId IS NULL
                `).run(newUserId, newUserId);

                totalUpdated += result.changes;
            } catch (err) {
                console.error(`[IdentityMigration] Failed for table ${table}:`, err);
            }
        }

        return NextResponse.json({
            message: 'Identität lokal migriert.',
            totalUpdated
        });

    } catch (error: any) {
        return NextResponse.json({ message: 'Fehler bei Migration.', error: error.message }, { status: 500 });
    }
}
