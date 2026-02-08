import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import sqliteDb from '@/lib/sqlite';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let userId = "";

        const token = cookies().get('session_token')?.value;
        if (token) {
            const decoded = await verifySessionToken(token);
            if (decoded && decoded.userId) {
                userId = decoded.userId;
            }
        }

        // Fallback: Read from body (Supabase Auth frontend doesn't use the custom token)
        if (!userId) {
            try {
                const body = await req.json();
                userId = body.userId;
            } catch (e) { /* ignore */ }
        }

        if (!userId) {
            return NextResponse.json({ message: 'Nicht autorisiert oder Benutzer-ID fehlt' }, { status: 401 });
        }

        // 1. Delete data from SQLite
        const tables = [
            'customers',
            'invoices',
            'projects',
            'settings',
            'todos',
            'vehicles',
            'employees',
            'time_entries',
            'timesheets',
            'calendar_events',
            'services'
        ];

        for (const table of tables) {
            try {
                const stmt = sqliteDb.prepare(`DELETE FROM ${table} WHERE ${table === 'settings' ? 'userId' : 'userId'} = ?`);
                stmt.run(userId);
            } catch (e) {
                console.warn(`Table ${table} deletion failed or does not exist:`, e);
            }
        }

        // 2. Delete user and tokens from DB
        const deleted = db.deleteUser(userId);

        if (!deleted) {
            console.warn(`User ${userId} not found in DB during deletion.`);
        }

        // 3. Delete folders and files from Supabase Storage (if admin client is configured)
        if (supabaseAdmin) {
            try {
                const bucket = 'backups';

                // Helper to recursively list and delete everything in a folder
                const deleteRecursive = async (path: string) => {
                    const { data: items, error: listError } = await supabaseAdmin.storage
                        .from(bucket)
                        .list(path);

                    if (listError) throw listError;

                    if (items && items.length > 0) {
                        // Separate files and folders (folders have no metadata or specific properties in list)
                        // In Supabase, if metadata is null, it's often a folder, but better check properties
                        const filesToDelete = items
                            .filter(item => item.id !== undefined && item.metadata !== undefined)
                            .map(item => `${path}/${item.name}`);

                        const subFolders = items
                            .filter(item => item.id === undefined || item.metadata === undefined)
                            .map(item => item.name);

                        // Delete files in current folder
                        if (filesToDelete.length > 0) {
                            const { error: delError } = await supabaseAdmin.storage
                                .from(bucket)
                                .remove(filesToDelete);
                            if (delError) console.error(`Failed to delete files in ${path}:`, delError);
                            else console.log(`Deleted ${filesToDelete.length} files from ${path}`);
                        }

                        // Recursively delete subfolders
                        for (const folder of subFolders) {
                            await deleteRecursive(`${path}/${folder}`);
                        }
                    }
                };

                console.log(`Starting recursive storage cleanup for user ${userId}...`);
                await deleteRecursive(userId);

                // Final check: Some systems leave the folder 'object' if it was explicitly created
                await supabaseAdmin.storage.from(bucket).remove([userId]);

            } catch (storageError) {
                console.error('Supabase Storage cleanup error:', storageError);
                // Continue anyway
            }

            // 4. Delete user from Supabase Auth
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) {
                console.error('Supabase Auth deletion error:', authError);
            } else {
                console.log(`User ${userId} successfully deleted from Supabase Auth.`);
            }
        } else {
            console.warn('Supabase Admin client not configured. Skipping Storage and Auth cleanup.');
        }

        // 5. Clear auth cookie
        cookies().delete('session_token');

        return NextResponse.json({
            success: true,
            message: 'Konto und alle Daten wurden erfolgreich gelöscht.',
            authDeleted: !!supabaseAdmin
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { message: 'Fehler beim Löschen des Kontos: ' + (error as any).message },
            { status: 500 }
        );
    }
}
