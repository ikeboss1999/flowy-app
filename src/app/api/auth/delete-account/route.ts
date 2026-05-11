import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let userId = '';

        const token = cookies().get('session_token')?.value;
        if (token) {
            const decoded = await verifySessionToken(token);
            if (decoded?.userId) userId = decoded.userId;
        }

        if (!userId) {
            try {
                const body = await req.json();
                userId = body.userId;
            } catch (e) { /* ignore */ }
        }

        if (!userId) {
            return NextResponse.json({ message: 'Nicht autorisiert oder Benutzer-ID fehlt' }, { status: 401 });
        }

        const tables = ['customers', 'invoices', 'projects', 'settings', 'todos', 'vehicles', 'employees', 'time_entries', 'timesheets', 'calendar_events', 'services'];

        // Delete all user data from Supabase tables
        for (const table of tables) {
            const { error } = await supabase.from(table).delete().eq('userId', userId);
            if (error) console.error(`[AccountDeletion] Failed to wipe Supabase table ${table}:`, error);
        }

        // Delete files from Supabase Storage
        if (supabaseAdmin) {
            try {
                const bucket = 'backups';

                const deleteRecursive = async (path: string) => {
                    if (!supabaseAdmin) return;
                    const { data: items, error: listError } = await supabaseAdmin.storage.from(bucket).list(path);
                    if (listError) throw listError;
                    if (items && items.length > 0) {
                        const filesToDelete = items
                            .filter(item => item.id !== undefined && item.metadata !== undefined)
                            .map(item => `${path}/${item.name}`);
                        const subFolders = items
                            .filter(item => item.id === undefined || item.metadata === undefined)
                            .map(item => item.name);
                        if (filesToDelete.length > 0) {
                            await supabaseAdmin.storage.from(bucket).remove(filesToDelete);
                        }
                        for (const folder of subFolders) {
                            await deleteRecursive(`${path}/${folder}`);
                        }
                    }
                };

                await deleteRecursive(userId);
                await supabaseAdmin.storage.from(bucket).remove([userId]);
            } catch (storageError) {
                console.error('Supabase Storage cleanup error:', storageError);
            }

            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) console.error('Supabase Auth deletion error:', authError);
        }

        cookies().delete('session_token');

        return NextResponse.json({
            success: true,
            message: 'Konto und alle Daten wurden erfolgreich gelöscht.',
            authDeleted: !!supabaseAdmin
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json({ message: 'Fehler beim Löschen des Kontos: ' + (error as any).message }, { status: 500 });
    }
}
