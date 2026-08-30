import { createAccountBackup, removeTenantStorage, TENANT_TABLES } from './account-backup';
import { supabaseAdmin } from './supabase-admin';

export interface WipeResult {
    success: boolean;
    message: string;
    details?: string;
    backupId?: string;
    backupExpiresAt?: string;
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
    return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message || ''));
}

async function deleteTenantRows(table: string, companyOwnerId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { error } = await supabaseAdmin.from(table).delete().eq('userId', companyOwnerId);
    if (error && !isMissingRelation(error)) throw new Error(`Löschen aus ${table} fehlgeschlagen: ${error.message}`);
}

async function verifyTenantTableEmpty(table: string, companyOwnerId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { count, error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('userId', companyOwnerId);
    if (error && !isMissingRelation(error)) throw new Error(`Kontrolle von ${table} fehlgeschlagen: ${error.message}`);
    if ((count || 0) > 0) throw new Error(`Löschung unvollständig: ${count} Datensätze in ${table} verblieben.`);
}

/**
 * Creates a verified, encrypted 30-day backup and only then removes the tenant.
 * Any backup, database, storage, or auth error is returned as a hard failure.
 */
export async function wipeAccount(userId: string): Promise<WipeResult> {
    if (!userId || userId.length < 5) return { success: false, message: 'Ungültige oder fehlende Benutzer-ID.' };
    if (!supabaseAdmin) return { success: false, message: 'Admin-Client nicht konfiguriert.' };

    try {
        const { data: userRole, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select('company_owner_id, role')
            .eq('user_id', userId)
            .maybeSingle();
        if (roleError) throw new Error(`Benutzerrolle konnte nicht geprüft werden: ${roleError.message}`);

        const companyOwnerId = userRole?.company_owner_id || userId;
        const isTenantOwner = !userRole || userRole.company_owner_id === userId;

        // Sub-users do not own the company data and are deleted separately.
        if (!isTenantOwner) {
            const { error: roleDeleteError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
            if (roleDeleteError) throw new Error(`Benutzerrolle konnte nicht gelöscht werden: ${roleDeleteError.message}`);
            const { error: todoDeleteError } = await supabaseAdmin.from('todos').delete().eq('userId', userId);
            if (todoDeleteError && !isMissingRelation(todoDeleteError)) throw new Error(`Persönliche Aufgaben konnten nicht gelöscht werden: ${todoDeleteError.message}`);
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authDeleteError) throw new Error(`Auth-Konto konnte nicht gelöscht werden: ${authDeleteError.message}`);
            return { success: true, message: 'Mitarbeiter-Zugang und persönliche Aufgaben wurden gelöscht.' };
        }

        const backup = await createAccountBackup(companyOwnerId);

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .eq('company_owner_id', companyOwnerId);
        if (rolesError) throw new Error(`Unterbenutzer konnten nicht geladen werden: ${rolesError.message}`);
        const subUserIds = (roles || []).map(role => role.user_id).filter(id => id && id !== companyOwnerId);

        const { data: inquiries, error: inquiriesError } = await supabaseAdmin
            .from('crm_inquiries')
            .select('id')
            .eq('userId', companyOwnerId);
        if (inquiriesError && !isMissingRelation(inquiriesError)) throw new Error(`CRM-Anfragen konnten nicht geladen werden: ${inquiriesError.message}`);
        const inquiryIds = (inquiries || []).map(inquiry => inquiry.id);
        if (inquiryIds.length) {
            const { error } = await supabaseAdmin.from('crm_inquiry_notes').delete().in('inquiryId', inquiryIds);
            if (error && !isMissingRelation(error)) throw new Error(`CRM-Notizen konnten nicht gelöscht werden: ${error.message}`);
        }

        // Children first; settings/user roles last. Missing optional legacy tables are harmless,
        // but every error on an existing table aborts the success response.
        const deletionOrder: string[] = [
            'document_receipts',
            'project_diary_attachments',
            'project_diary_entries',
            'project_assignments',
            'employee_documents',
            'employee_document_folders',
            'employee_mobile_sessions',
            'mobile_activation_codes',
            'project_files',
            'project_folders',
            'archive_files',
            'archive_folders',
            'order_confirmations',
            'invoices',
            'offers',
            'orders',
            'time_entries',
            'timesheets',
            'todos',
            'calendar_events',
            'credentials',
            'crm_inquiries',
            'services',
            'service_folders',
            'projects',
            'customers',
            'employees',
            'vehicles',
        ];
        for (const table of deletionOrder) await deleteTenantRows(table, companyOwnerId);
        for (const subUserId of subUserIds) await deleteTenantRows('todos', subUserId);
        await deleteTenantRows('settings', companyOwnerId);
        for (const subUserId of subUserIds) await deleteTenantRows('settings', subUserId);

        const { error: rolesDeleteError } = await supabaseAdmin.from('user_roles').delete().eq('company_owner_id', companyOwnerId);
        if (rolesDeleteError) throw new Error(`Benutzerrollen konnten nicht gelöscht werden: ${rolesDeleteError.message}`);

        await removeTenantStorage(companyOwnerId);

        for (const table of TENANT_TABLES) await verifyTenantTableEmpty(table, companyOwnerId);
        for (const subUserId of subUserIds) {
            await verifyTenantTableEmpty('todos', subUserId);
            await verifyTenantTableEmpty('settings', subUserId);
        }
        if (inquiryIds.length) {
            const { count, error } = await supabaseAdmin.from('crm_inquiry_notes')
                .select('id', { count: 'exact', head: true }).in('inquiryId', inquiryIds);
            if (error && !isMissingRelation(error)) throw new Error(`CRM-Notizen konnten nicht kontrolliert werden: ${error.message}`);
            if ((count || 0) > 0) throw new Error(`Löschung unvollständig: ${count} CRM-Notizen verblieben.`);
        }
        const { count: remainingRoles, error: rolesVerifyError } = await supabaseAdmin
            .from('user_roles').select('user_id', { count: 'exact', head: true }).eq('company_owner_id', companyOwnerId);
        if (rolesVerifyError) throw new Error(`Benutzerrollen konnten nicht kontrolliert werden: ${rolesVerifyError.message}`);
        if ((remainingRoles || 0) > 0) throw new Error(`Löschung unvollständig: ${remainingRoles} Benutzerrollen verblieben.`);

        for (const subUserId of subUserIds) {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(subUserId);
            if (error) throw new Error(`Unterbenutzer ${subUserId} konnte nicht gelöscht werden: ${error.message}`);
        }
        const { error: ownerDeleteError } = await supabaseAdmin.auth.admin.deleteUser(companyOwnerId);
        if (ownerDeleteError) throw new Error(`Eigentümer-Auth-Konto konnte nicht gelöscht werden: ${ownerDeleteError.message}`);

        return {
            success: true,
            message: 'Konto und aktive Daten wurden gelöscht. Das verschlüsselte Sicherheitsbackup wird nach 30 Tagen endgültig gelöscht.',
            backupId: backup.backupId,
            backupExpiresAt: backup.expiresAt,
        };
    } catch (error) {
        const details = error instanceof Error ? error.message : 'Unbekannter Fehler';
        console.error('[AccountWipe] Aborted:', details);
        return { success: false, message: 'Kontolöschung wurde nicht vollständig abgeschlossen.', details };
    }
}
