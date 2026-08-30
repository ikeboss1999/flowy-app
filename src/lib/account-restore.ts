import { randomBytes } from 'crypto';
import { downloadDecryptedBackupObject, removeTenantStorage, TENANT_STORAGE_BUCKETS, TENANT_TABLES } from './account-backup';
import { supabaseAdmin } from './supabase-admin';

type JsonRow = Record<string, unknown>;
type BackupAuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> };
type BackupDatabase = { version: number; companyOwnerId: string; tables: Record<string, JsonRow[]>; authUsers: BackupAuthUser[] };
type BackupManifest = { version: number; backupId: string; companyOwnerId: string; expiresAt: string; files: Array<{ bucket: string; path: string; size: number; backupPath: string }> };

export interface RestoreResult {
    newCompanyOwnerId: string;
    restoredRows: number;
    restoredFiles: number;
    passwordResetSent: boolean;
}

const INSERT_ORDER = [
    'customers', 'employees', 'vehicles', 'service_folders', 'services', 'projects',
    'project_folders', 'project_files', 'archive_folders', 'archive_files', 'crm_inquiries',
    'offers', 'orders', 'order_confirmations', 'invoices', 'timesheets', 'time_entries',
    'calendar_events', 'credentials', 'todos', 'settings', 'project_assignments',
    'project_diary_entries', 'project_diary_attachments', 'employee_document_folders',
    'employee_documents', 'document_receipts', 'crm_inquiry_notes', 'user_roles',
] as const;

function remapValue(value: unknown, idMap: Map<string, string>): unknown {
    if (typeof value === 'string') return idMap.get(value) || value;
    if (Array.isArray(value)) return value.map(item => remapValue(item, idMap));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, remapValue(item, idMap)]));
    }
    return value;
}

function parseJson<T>(data: Buffer, label: string): T {
    try { return JSON.parse(data.toString('utf8')) as T; }
    catch { throw new Error(`${label} ist kein gültiges JSON.`); }
}

async function emailAlreadyExists(email: string): Promise<boolean> {
    if (!supabaseAdmin) return true;
    for (let page = 1; ; page += 1) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        if (data.users.some(user => user.email?.toLowerCase() === email.toLowerCase())) return true;
        if (data.users.length < 1000) return false;
    }
}

async function insertRows(table: string, rows: JsonRow[]): Promise<void> {
    if (!supabaseAdmin || !rows.length) return;
    for (let index = 0; index < rows.length; index += 200) {
        const { error } = await supabaseAdmin.from(table).insert(rows.slice(index, index + 200));
        if (error) throw new Error(`Wiederherstellung von ${table} fehlgeschlagen: ${error.message}`);
    }
}

async function rollbackRestore(newOwnerId: string, newAuthIds: string[], newSubUserIds: string[]) {
    if (!supabaseAdmin) return;
    try {
        const { data: inquiries } = await supabaseAdmin.from('crm_inquiries').select('id').eq('userId', newOwnerId);
        const inquiryIds = (inquiries || []).map(item => item.id);
        if (inquiryIds.length) await supabaseAdmin.from('crm_inquiry_notes').delete().in('inquiryId', inquiryIds);
        for (const table of [...TENANT_TABLES].reverse()) await supabaseAdmin.from(table).delete().eq('userId', newOwnerId);
        for (const id of newSubUserIds) {
            await supabaseAdmin.from('todos').delete().eq('userId', id);
            await supabaseAdmin.from('settings').delete().eq('userId', id);
        }
        await supabaseAdmin.from('user_roles').delete().eq('company_owner_id', newOwnerId);
        await removeTenantStorage(newOwnerId);
    } catch (error) {
        console.error('[AccountRestore] rollback data warning:', error);
    }
    for (const id of newAuthIds.reverse()) {
        try { await supabaseAdmin.auth.admin.deleteUser(id); } catch { }
    }
}

export async function restoreAccountBackup(backupId: string): Promise<RestoreResult> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { data: metadata, error: metadataError } = await supabaseAdmin.from('account_backups').select('*').eq('id', backupId).maybeSingle();
    if (metadataError || !metadata) throw new Error(`Backup wurde nicht gefunden: ${metadataError?.message || backupId}`);
    if (metadata.status !== 'ready') throw new Error(`Backup kann im Status „${metadata.status}“ nicht wiederhergestellt werden.`);
    if (new Date(metadata.expires_at).getTime() <= Date.now()) throw new Error('Backup ist bereits abgelaufen.');

    const root = metadata.storage_path;
    const database = parseJson<BackupDatabase>(await downloadDecryptedBackupObject(`${root}/database.json.enc`), 'Datenbankbackup');
    const manifest = parseJson<BackupManifest>(await downloadDecryptedBackupObject(`${root}/manifest.json.enc`), 'Backup-Manifest');
    if (database.version !== 1 || manifest.version !== 1 || manifest.backupId !== backupId || database.companyOwnerId !== manifest.companyOwnerId) {
        throw new Error('Backup-Manifest und Datenbankbackup passen nicht zusammen.');
    }
    if (!database.authUsers?.length) throw new Error('Backup enthält kein Auth-Konto.');
    if (manifest.files.length !== Number(metadata.file_count || 0)) throw new Error('Backup-Dateiliste ist unvollständig.');

    const owner = database.authUsers.find(user => user.id === database.companyOwnerId) || database.authUsers[0];
    if (!owner.email) throw new Error('Das ursprüngliche Eigentümerkonto enthält keine E-Mail-Adresse.');
    for (const authUser of database.authUsers) {
        if (authUser.email && await emailAlreadyExists(authUser.email)) throw new Error(`E-Mail-Adresse ${authUser.email} ist bereits einem aktiven Konto zugeordnet.`);
    }

    await supabaseAdmin.from('account_backups').update({ status: 'restore_pending', failure_reason: null }).eq('id', backupId);
    const idMap = new Map<string, string>();
    const createdAuthIds: string[] = [];
    let newOwnerId = '';
    try {
        for (const authUser of database.authUsers) {
            if (!authUser.email) continue;
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: authUser.email,
                password: randomBytes(32).toString('base64url'),
                email_confirm: true,
                user_metadata: authUser.user_metadata || {},
                app_metadata: authUser.app_metadata || {},
            });
            if (error || !data.user) throw new Error(`Auth-Konto ${authUser.email} konnte nicht neu angelegt werden: ${error?.message || 'kein Benutzer'}`);
            idMap.set(authUser.id, data.user.id);
            createdAuthIds.push(data.user.id);
        }
        newOwnerId = idMap.get(database.companyOwnerId) || '';
        if (!newOwnerId) throw new Error('Neue Eigentümer-ID konnte nicht ermittelt werden.');

        let restoredRows = 0;
        for (const table of INSERT_ORDER) {
            // Active login artifacts are intentionally never restored.
            const sourceRows = database.tables[table] || [];
            const rows = sourceRows.map(row => remapValue(row, idMap) as JsonRow);
            await insertRows(table, rows);
            restoredRows += rows.length;
        }

        let restoredFiles = 0;
        for (const file of manifest.files) {
            if (!(TENANT_STORAGE_BUCKETS as readonly string[]).includes(file.bucket)) throw new Error(`Unbekannter Storage-Bucket im Backup: ${file.bucket}`);
            const targetPath = file.path === database.companyOwnerId
                ? newOwnerId
                : file.path.startsWith(`${database.companyOwnerId}/`)
                    ? `${newOwnerId}${file.path.slice(database.companyOwnerId.length)}`
                    : file.path;
            const content = await downloadDecryptedBackupObject(file.backupPath);
            if (content.length !== file.size) throw new Error(`Dateigröße stimmt nicht: ${file.bucket}/${file.path}`);
            const { error } = await supabaseAdmin.storage.from(file.bucket).upload(targetPath, content, { upsert: false, contentType: 'application/octet-stream' });
            if (error) throw new Error(`Datei ${file.bucket}/${targetPath} konnte nicht wiederhergestellt werden: ${error.message}`);
            restoredFiles += 1;
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(owner.email, appUrl ? { redirectTo: `${appUrl.replace(/\/$/, '')}/reset-password` } : undefined);
        const passwordResetSent = !resetError;

        const { error: finishError } = await supabaseAdmin.from('account_backups').update({
            status: 'restored', restored_at: new Date().toISOString(), failure_reason: resetError?.message || null,
        }).eq('id', backupId);
        if (finishError) throw new Error(`Wiederherstellungsstatus konnte nicht gespeichert werden: ${finishError.message}`);
        return { newCompanyOwnerId: newOwnerId, restoredRows, restoredFiles, passwordResetSent };
    } catch (error) {
        const newSubUserIds = createdAuthIds.filter(id => id !== newOwnerId);
        if (newOwnerId) await rollbackRestore(newOwnerId, createdAuthIds, newSubUserIds);
        else for (const id of createdAuthIds.reverse()) await supabaseAdmin.auth.admin.deleteUser(id);
        const message = error instanceof Error ? error.message : 'Unbekannter Wiederherstellungsfehler';
        await supabaseAdmin.from('account_backups').update({ status: 'ready', failure_reason: message }).eq('id', backupId);
        throw error;
    }
}
