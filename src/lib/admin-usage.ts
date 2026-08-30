import { getTenantStorageUsage } from './account-backup';
import { supabaseAdmin } from './supabase-admin';

const COUNT_TABLES = [
    'customers', 'projects', 'offers', 'orders', 'invoices', 'employees', 'vehicles',
    'project_diary_entries', 'project_files', 'archive_files', 'employee_documents',
    'time_entries', 'todos',
] as const;

export interface TenantUsageSnapshot {
    companyOwnerId: string;
    counts: Record<string, number>;
    storageBytes: number;
    storageFiles: number;
    calculatedAt: string;
    calculationMs: number;
}

function isMissingRelation(error: { code?: string; message?: string } | null) {
    return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message || ''));
}

export async function calculateTenantUsage(companyOwnerId: string): Promise<TenantUsageSnapshot> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const startedAt = Date.now();
    const counts: Record<string, number> = {};

    // Sequential head-only counts keep database load predictable and transfer no row data.
    for (const table of COUNT_TABLES) {
        const { count, error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('userId', companyOwnerId);
        if (error && !isMissingRelation(error)) throw new Error(`Nutzungszählung ${table} fehlgeschlagen: ${error.message}`);
        counts[table] = count || 0;
    }

    const { count: activeMobileEmployees, error: mobileError } = await supabaseAdmin
        .from('employees').select('id', { count: 'exact', head: true }).eq('userId', companyOwnerId).eq('employment->>isActive', 'true');
    counts.active_employees = mobileError ? counts.employees : (activeMobileEmployees || 0);

    const storage = await getTenantStorageUsage(companyOwnerId);
    counts.storage_project_files = storage.byBucket['project-files']?.files || 0;
    counts.storage_employee_avatars = storage.byBucket['employee-avatars']?.files || 0;
    counts.storage_employee_documents = storage.byBucket['employee-mobile-documents']?.files || 0;
    counts.storage_diary_attachments = storage.byBucket['project-diary-attachments']?.files || 0;

    const snapshot: TenantUsageSnapshot = {
        companyOwnerId,
        counts,
        storageBytes: storage.bytes,
        storageFiles: storage.files,
        calculatedAt: new Date().toISOString(),
        calculationMs: Date.now() - startedAt,
    };
    const { error } = await supabaseAdmin.from('admin_tenant_usage_snapshots').upsert({
        company_owner_id: companyOwnerId,
        counts,
        storage_bytes: snapshot.storageBytes,
        storage_files: snapshot.storageFiles,
        calculated_at: snapshot.calculatedAt,
        calculation_ms: snapshot.calculationMs,
        last_error: null,
    }, { onConflict: 'company_owner_id' });
    if (error) throw new Error(`Nutzungssnapshot konnte nicht gespeichert werden: ${error.message}`);
    return snapshot;
}

export async function refreshAllTenantUsage(): Promise<{ refreshed: number; failed: number }> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { data: roles, error } = await supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role').eq('status', 'active');
    if (error) throw error;
    const ownerIds = Array.from(new Set((roles || []).filter(role => role.user_id === role.company_owner_id && role.role !== 'developer').map(role => role.company_owner_id)));
    let refreshed = 0;
    let failed = 0;
    for (const ownerId of ownerIds) {
        try {
            await calculateTenantUsage(ownerId);
            refreshed += 1;
        } catch (usageError) {
            failed += 1;
            await supabaseAdmin.from('admin_tenant_usage_snapshots').upsert({
                company_owner_id: ownerId,
                calculated_at: new Date().toISOString(),
                last_error: usageError instanceof Error ? usageError.message : 'Unbekannter Fehler',
            }, { onConflict: 'company_owner_id' });
        }
    }
    return { refreshed, failed };
}
