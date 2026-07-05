import { supabaseAdmin } from './supabase-admin';
import { supabase } from './supabase';

export interface WipeResult {
    success: boolean;
    message: string;
    details?: string;
}

/**
 * Centrally performs account deletion and data wipe procedures.
 * Supports both full company/tenant wipes and sub-user/employee account deletions.
 */
export async function wipeAccount(userId: string): Promise<WipeResult> {
    if (!userId || userId.length < 5) {
        return { success: false, message: 'Ungültige oder fehlende Benutzer-ID.' };
    }

    if (!supabaseAdmin) {
        return { success: false, message: 'Admin-Client nicht konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt).' };
    }

    console.log(`[AccountWipe] Initiating wipe procedure for userId: ${userId}`);

    try {
        const client = supabaseAdmin;

        // 1. Determine user role and company context
        const { data: userRole, error: roleError } = await client
            .from('user_roles')
            .select('company_owner_id, role')
            .eq('user_id', userId)
            .maybeSingle();

        if (roleError) {
            console.warn(`[AccountWipe] Error checking user role: ${roleError.message}`);
        }

        // If no user role is found, we assume they are a tenant owner (backward compatibility)
        const companyOwnerId = userRole?.company_owner_id || userId;
        const isTenantOwner = !userRole || userRole.company_owner_id === userId;

        if (isTenantOwner) {
            console.log(`[AccountWipe] User ${userId} is Tenant Owner of company: ${companyOwnerId}. Performing FULL WIPE.`);

            // A. Find all sub-users belonging to this company
            const { data: subUsers, error: subUsersError } = await client
                .from('user_roles')
                .select('user_id')
                .eq('company_owner_id', companyOwnerId);

            if (subUsersError) {
                console.error(`[AccountWipe] Error fetching sub-users: ${subUsersError.message}`);
            }

            const subUserIds = (subUsers || [])
                .map(su => su.user_id)
                .filter(id => id !== companyOwnerId);

            console.log(`[AccountWipe] Found sub-users to delete:`, subUserIds);

            // B. Delete CRM inquiry notes which don't have direct userId/user_id column
            try {
                const { data: inquiries } = await client
                    .from('crm_inquiries')
                    .select('id')
                    .eq('userId', companyOwnerId);

                const inquiryIds = (inquiries || []).map(i => i.id);
                if (inquiryIds.length > 0) {
                    const { error: notesDelError } = await client
                        .from('crm_inquiry_notes')
                        .delete()
                        .in('inquiryId', inquiryIds);
                    
                    if (notesDelError) {
                        console.warn(`[AccountWipe] CRM inquiry notes deletion warning:`, notesDelError.message);
                    }
                }
            } catch (e: any) {
                console.warn(`[AccountWipe] CRM inquiry notes deletion error (skipping):`, e.message);
            }

            // C. Delete all tenant records from database tables (ordered for FK safety)
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
                'settings',
                'credentials',
                'crm_inquiries',
                'letters',
                'user_roles'
            ];

            for (const table of tables) {
                try {
                    const { error: delError1 } = await client.from(table).delete().eq('userId', companyOwnerId);
                    if (delError1) console.warn(`[AccountWipe] Table "${table}" delete by userId warning:`, delError1.message);

                    const { error: delError2 } = await client.from(table).delete().eq('user_id', companyOwnerId);
                    if (delError2) console.warn(`[AccountWipe] Table "${table}" delete by user_id warning:`, delError2.message);
                } catch (err: any) {
                    console.warn(`[AccountWipe] Failed deleting from table "${table}":`, err.message);
                }
            }

            // D. Delete To-Dos of sub-users
            if (subUserIds.length > 0) {
                try {
                    await client.from('todos').delete().in('userId', subUserIds);
                } catch (err: any) {
                    console.warn(`[AccountWipe] Failed deleting sub-user To-Dos:`, err.message);
                }
            }

            // E. Clean up storage files in folders named after the company owner
            const buckets = ['project-files', 'avatars', 'project-photos', 'employee-docs', 'backups'];
            for (const bucketName of buckets) {
                try {
                    const { data: items, error: listError } = await client.storage.from(bucketName).list(companyOwnerId);
                    if (listError) continue;

                    if (items && items.length > 0) {
                        const deleteFolder = async (path: string) => {
                            const { data: subItems, error: subError } = await client.storage.from(bucketName).list(path);
                            if (subError) return;

                            const filesToDelete = subItems
                                .filter(item => item.id !== null && item.id !== undefined)
                                .map(item => `${path}/${item.name}`);
                            
                            const folders = subItems
                                .filter(item => item.id === null || item.id === undefined)
                                .map(item => item.name);

                            if (filesToDelete.length > 0) {
                                await client.storage.from(bucketName).remove(filesToDelete);
                            }

                            for (const folder of folders) {
                                await deleteFolder(`${path}/${folder}`);
                            }
                        };

                        await deleteFolder(companyOwnerId);
                        await client.storage.from(bucketName).remove([companyOwnerId]);
                    }
                } catch (storageError: any) {
                    console.error(`[AccountWipe] Storage cleanup error in bucket ${bucketName}:`, storageError.message);
                }
            }

            // F. Delete sub-users from Supabase Auth
            for (const subUserId of subUserIds) {
                try {
                    const { error: authDelError } = await client.auth.admin.deleteUser(subUserId);
                    if (authDelError) {
                        console.warn(`[AccountWipe] Failed to delete sub-user auth ${subUserId}:`, authDelError.message);
                    }
                } catch (err: any) {
                    console.warn(`[AccountWipe] Failed deleting sub-user auth ${subUserId}:`, err.message);
                }
            }

            // G. Delete tenant owner from Supabase Auth
            const { error: ownerAuthDelError } = await client.auth.admin.deleteUser(companyOwnerId);
            if (ownerAuthDelError) {
                console.error(`[AccountWipe] Failed to delete owner auth ${companyOwnerId}:`, ownerAuthDelError.message);
            }

            return {
                success: true,
                message: 'Mandantenkonto, alle verknüpften Mitarbeiter-Zugänge, Projektdaten, Datenbank-Einträge und Dateien wurden erfolgreich gelöscht.'
            };

        } else {
            console.log(`[AccountWipe] User ${userId} is a SUB-USER of company: ${companyOwnerId}. Performing SINGLE USER DELETION.`);

            // A. Delete user role
            const { error: roleDelError } = await client
                .from('user_roles')
                .delete()
                .eq('user_id', userId);

            if (roleDelError) {
                console.error(`[AccountWipe] Failed to delete sub-user role:`, roleDelError.message);
            }

            // B. Delete sub-user's personal todos
            try {
                await client.from('todos').delete().eq('userId', userId);
            } catch (err: any) {
                console.warn(`[AccountWipe] Failed to delete sub-user todos:`, err.message);
            }

            // C. Delete sub-user from Supabase Auth
            const { error: subAuthDelError } = await client.auth.admin.deleteUser(userId);
            if (subAuthDelError) {
                console.error(`[AccountWipe] Failed to delete sub-user auth:`, subAuthDelError.message);
            }

            return {
                success: true,
                message: 'Mitarbeiter-Zugang und dessen persönliche Aufgaben wurden erfolgreich gelöscht.'
            };
        }
    } catch (e: any) {
        console.error(`[AccountWipe] Fatal error during account wipe:`, e);
        return {
            success: false,
            message: 'Ein kritischer Fehler ist beim Löschen des Kontos aufgetreten.',
            details: e.message
        };
    }
}
