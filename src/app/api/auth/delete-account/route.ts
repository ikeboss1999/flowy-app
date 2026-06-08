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

        // CRITICAL SAFETY CHECK: Never delete without a valid userId
        if (!userId || userId.length < 5) {
            return NextResponse.json({ message: 'Ungültige oder fehlende Benutzer-ID' }, { status: 400 });
        }

        console.log(`[AccountDeletion] Starting wipe for user: ${userId}`);

        // 1. Database Cleanup (Ordered for Foreign Key safety)
        const tables = [
            'project_files', 
            'project_folders',
            'archive_files',
            'archive_folders',
            'offers', 
            'order_confirmations',
            'order_confirmation',
            'orders',
            'order',
            'auftraege',
            'auftrag',
            'invoices', 
            'time_entries', 
            'timesheets', 
            'calendar_events', 
            'todos', 
            'projects', 
            'customers', 
            'employees', 
            'vehicles', 
            'services', 
            'service_folders',
            'einsaetze', 
            'project_photos', 
            'settings'
        ];

        const client = supabaseAdmin || supabase;

        for (const table of tables) {
            // Try both CamelCase and snake_case column names to be absolutely sure
            await client.from(table).delete().eq('userId', userId);
            await client.from(table).delete().eq('user_id', userId);
        }

        // 2. Storage Cleanup
        if (supabaseAdmin) {
            const buckets = ['project-files', 'avatars', 'project-photos', 'employee-docs', 'backups'];
            
            for (const bucketName of buckets) {
                try {
                    // List all files in the user's folder
                    const { data: items, error: listError } = await supabaseAdmin.storage.from(bucketName).list(userId);
                    
                    if (listError) {
                        console.warn(`[AccountDeletion] Could not list bucket ${bucketName}:`, listError.message);
                        continue;
                    }

                    if (items && items.length > 0) {
                        // Recursively delete files and folders
                        const deleteFolder = async (path: string) => {
                            const { data: subItems, error: subError } = await supabaseAdmin!.storage.from(bucketName).list(path);
                            if (subError) return;

                            const filesToDelete = subItems
                                .filter(item => item.id !== null && item.id !== undefined)
                                .map(item => `${path}/${item.name}`);
                            
                            const folders = subItems
                                .filter(item => item.id === null || item.id === undefined)
                                .map(item => item.name);

                            if (filesToDelete.length > 0) {
                                await supabaseAdmin!.storage.from(bucketName).remove(filesToDelete);
                            }

                            for (const folder of folders) {
                                await deleteFolder(`${path}/${folder}`);
                            }
                        };

                        await deleteFolder(userId);
                        // Finally remove the empty folder itself (some providers need this)
                        await supabaseAdmin!.storage.from(bucketName).remove([userId]);
                    }
                } catch (storageError) {
                    console.error(`[AccountDeletion] Storage cleanup error in bucket ${bucketName}:`, storageError);
                }
            }

            // 3. Auth User Deletion
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) {
                console.error('[AccountDeletion] Supabase Auth deletion error:', authError);
                // We still proceed as the database data is already gone
            }
        }

        cookies().delete('session_token');

        return NextResponse.json({
            success: true,
            message: 'Konto und alle verknüpften Daten wurden erfolgreich gelöscht.',
            authDeleted: !!supabaseAdmin
        });
    } catch (error) {
        console.error('[AccountDeletion] Fatal error:', error);
        return NextResponse.json({ message: 'Fehler beim Löschen des Kontos: ' + (error as any).message }, { status: 500 });
    }
}
