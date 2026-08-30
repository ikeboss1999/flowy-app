import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { supabaseAdmin } from './supabase-admin';

const BACKUP_BUCKET = 'user-backups';
const RETENTION_DAYS = 30;
const PAGE_SIZE = 1000;

// Every tenant-owned table currently used by the web and employee apps.
export const TENANT_TABLES = [
    'archive_files',
    'archive_folders',
    'calendar_events',
    'credentials',
    'crm_inquiries',
    'customers',
    'document_receipts',
    'employee_document_folders',
    'employee_documents',
    'employee_mobile_sessions',
    'employees',
    'invoices',
    'mobile_activation_codes',
    'offers',
    'order_confirmations',
    'orders',
    'project_assignments',
    'project_diary_attachments',
    'project_diary_entries',
    'project_files',
    'project_folders',
    'projects',
    'service_folders',
    'services',
    'settings',
    'time_entries',
    'timesheets',
    'todos',
    'vehicles',
] as const;

export const TENANT_STORAGE_BUCKETS = [
    'project-files',
    'employee-avatars',
    'employee-mobile-documents',
    'project-diary-attachments',
] as const;

type BackupFile = { bucket: string; path: string; size: number; backupPath: string };

export interface AccountBackupResult {
    backupId: string;
    expiresAt: string;
    tableCounts: Record<string, number>;
    fileCount: number;
    totalBytes: number;
}

function encryptionKey(): Buffer {
    const secret = process.env.ACCOUNT_BACKUP_ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
        throw new Error('ACCOUNT_BACKUP_ENCRYPTION_KEY fehlt oder ist zu kurz (mindestens 32 Zeichen).');
    }
    return createHash('sha256').update(secret, 'utf8').digest();
}

function encrypt(data: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Header: FLOWYBK1 + 12-byte IV + 16-byte GCM tag + ciphertext.
    return Buffer.concat([Buffer.from('FLOWYBK1'), iv, tag, encrypted]);
}

export function decryptAccountBackup(data: Buffer): Buffer {
    const header = data.subarray(0, 8).toString('utf8');
    if (header !== 'FLOWYBK1' || data.length < 36) throw new Error('Ungültiges oder beschädigtes FlowY-Backup.');
    const iv = data.subarray(8, 20);
    const tag = data.subarray(20, 36);
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    try {
        return Buffer.concat([decipher.update(data.subarray(36)), decipher.final()]);
    } catch {
        throw new Error('Backup konnte nicht entschlüsselt werden. Schlüssel oder Integrität ist ungültig.');
    }
}

export async function downloadDecryptedBackupObject(path: string): Promise<Buffer> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { data, error } = await supabaseAdmin.storage.from(BACKUP_BUCKET).download(path);
    if (error || !data) throw new Error(`Backup-Objekt ${path} konnte nicht geladen werden: ${error?.message || 'kein Inhalt'}`);
    return decryptAccountBackup(Buffer.from(await data.arrayBuffer()));
}

export async function removeBackupObjects(storagePath: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const files = await listFilesRecursively(BACKUP_BUCKET, storagePath);
    for (let index = 0; index < files.length; index += 100) {
        const { error } = await supabaseAdmin.storage.from(BACKUP_BUCKET).remove(files.slice(index, index + 100).map(file => file.path));
        if (error) throw new Error(`Backup-Dateien konnten nicht entfernt werden: ${error.message}`);
    }
    const remaining = await listFilesRecursively(BACKUP_BUCKET, storagePath);
    if (remaining.length) throw new Error(`Backup-Bereinigung unvollständig: ${remaining.length} Dateien verblieben.`);
}

function encodedPath(path: string): string {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
    return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message || ''));
}

async function readAllRows(table: string, column: string, value: string): Promise<Record<string, unknown>[]> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin.from(table).select('*').eq(column, value).range(from, from + PAGE_SIZE - 1);
        if (error) {
            if (isMissingRelation(error)) return [];
            throw new Error(`Backup-Abfrage für ${table} fehlgeschlagen: ${error.message}`);
        }
        const page = (data || []) as Record<string, unknown>[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }
    return rows;
}

async function listFilesRecursively(bucket: string, path: string): Promise<Array<{ path: string; size: number }>> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const result: Array<{ path: string; size: number }> = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, {
            limit: 1000,
            offset,
            sortBy: { column: 'name', order: 'asc' },
        });
        if (error) {
            if (/not found|does not exist/i.test(error.message)) return result;
            throw new Error(`Storage-Liste ${bucket}/${path} fehlgeschlagen: ${error.message}`);
        }
        const items = data || [];
        for (const item of items) {
            const itemPath = path ? `${path}/${item.name}` : item.name;
            if (item.id) result.push({ path: itemPath, size: Number(item.metadata?.size || 0) });
            else result.push(...await listFilesRecursively(bucket, itemPath));
        }
        if (items.length < 1000) break;
        offset += items.length;
    }
    return result;
}

async function uploadEncrypted(path: string, value: Buffer, contentType = 'application/octet-stream') {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { error } = await supabaseAdmin.storage.from(BACKUP_BUCKET).upload(path, encrypt(value), {
        contentType,
        upsert: false,
    });
    if (error) throw new Error(`Backup-Upload ${path} fehlgeschlagen: ${error.message}`);
}

export async function createAccountBackup(companyOwnerId: string): Promise<AccountBackupResult> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    encryptionKey(); // Validate before creating metadata or reading user data.

    const backupId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const root = `${backupId}`;
    const { data: ownerAuth, error: ownerAuthError } = await supabaseAdmin.auth.admin.getUserById(companyOwnerId);
    if (ownerAuthError || !ownerAuth.user) throw new Error(`Auth-Konto konnte nicht gesichert werden: ${ownerAuthError?.message || 'nicht gefunden'}`);

    const { error: metaError } = await supabaseAdmin.from('account_backups').insert({
        id: backupId,
        company_owner_id: companyOwnerId,
        owner_email: ownerAuth.user.email || null,
        status: 'creating',
        storage_path: root,
        expires_at: expiresAt,
    });
    if (metaError) throw new Error(`Backup-Metadaten konnten nicht angelegt werden: ${metaError.message}`);

    try {
        const database: Record<string, Record<string, unknown>[]> = {};
        const tableCounts: Record<string, number> = {};
        const roles = await readAllRows('user_roles', 'company_owner_id', companyOwnerId);
        database.user_roles = roles;
        tableCounts.user_roles = roles.length;
        const subUserIds = roles.map(row => String(row.user_id || '')).filter(id => id && id !== companyOwnerId);
        for (const table of TENANT_TABLES) {
            const rows = await readAllRows(table, 'userId', companyOwnerId);
            if (table === 'todos' || table === 'settings') {
                for (const subUserId of subUserIds) rows.push(...await readAllRows(table, 'userId', subUserId));
            }
            database[table] = rows;
            tableCounts[table] = rows.length;
        }
        const inquiryIds = database.crm_inquiries.map(row => String(row.id || '')).filter(Boolean);
        const inquiryNotes: Record<string, unknown>[] = [];
        for (let index = 0; index < inquiryIds.length; index += 200) {
            const ids = inquiryIds.slice(index, index + 200);
            const { data, error } = await supabaseAdmin.from('crm_inquiry_notes').select('*').in('inquiryId', ids);
            if (error && !isMissingRelation(error)) throw new Error(`Backup-Abfrage für crm_inquiry_notes fehlgeschlagen: ${error.message}`);
            inquiryNotes.push(...((data || []) as Record<string, unknown>[]));
        }
        database.crm_inquiry_notes = inquiryNotes;
        tableCounts.crm_inquiry_notes = inquiryNotes.length;
        const authUsers = [ownerAuth.user];
        for (const id of subUserIds) {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
            if (error || !data.user) throw new Error(`Unterbenutzer ${id} konnte nicht gesichert werden: ${error?.message || 'nicht gefunden'}`);
            authUsers.push(data.user);
        }

        await uploadEncrypted(`${root}/database.json.enc`, Buffer.from(JSON.stringify({
            version: 1,
            companyOwnerId,
            createdAt: createdAt.toISOString(),
            expiresAt,
            tables: database,
            authUsers,
        })), 'application/octet-stream');

        const files: BackupFile[] = [];
        let totalBytes = 0;
        for (const bucket of TENANT_STORAGE_BUCKETS) {
            const bucketFiles = await listFilesRecursively(bucket, companyOwnerId);
            for (const file of bucketFiles) {
                const { data, error } = await supabaseAdmin.storage.from(bucket).download(file.path);
                if (error || !data) throw new Error(`Datei ${bucket}/${file.path} konnte nicht gesichert werden: ${error?.message || 'kein Inhalt'}`);
                const buffer = Buffer.from(await data.arrayBuffer());
                const backupPath = `${root}/storage/${bucket}/${encodedPath(file.path)}.enc`;
                await uploadEncrypted(backupPath, buffer);
                files.push({ bucket, path: file.path, size: buffer.length, backupPath });
                totalBytes += buffer.length;
            }
        }

        const manifest = {
            version: 1,
            backupId,
            companyOwnerId,
            createdAt: createdAt.toISOString(),
            expiresAt,
            tableCounts,
            files,
            totalBytes,
        };
        await uploadEncrypted(`${root}/manifest.json.enc`, Buffer.from(JSON.stringify(manifest)), 'application/octet-stream');

        const expectedObjects = files.length + 2;
        const storedObjects = await listFilesRecursively(BACKUP_BUCKET, root);
        if (storedObjects.length !== expectedObjects) {
            throw new Error(`Backup-Prüfung fehlgeschlagen: ${expectedObjects} Objekte erwartet, ${storedObjects.length} gefunden.`);
        }

        const { error: finishError } = await supabaseAdmin.from('account_backups').update({
            status: 'ready',
            table_counts: tableCounts,
            file_count: files.length,
            total_bytes: totalBytes,
            completed_at: new Date().toISOString(),
            failure_reason: null,
        }).eq('id', backupId);
        if (finishError) throw new Error(`Backup konnte nicht finalisiert werden: ${finishError.message}`);

        return { backupId, expiresAt, tableCounts, fileCount: files.length, totalBytes };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Backup-Fehler';
        await supabaseAdmin.from('account_backups').update({ status: 'failed', failure_reason: message }).eq('id', backupId);
        throw error;
    }
}

export async function removeTenantStorage(companyOwnerId: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    for (const bucket of TENANT_STORAGE_BUCKETS) {
        const files = await listFilesRecursively(bucket, companyOwnerId);
        for (let index = 0; index < files.length; index += 100) {
            const paths = files.slice(index, index + 100).map(file => file.path);
            if (!paths.length) continue;
            const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
            if (error) throw new Error(`Storage-Bereinigung in ${bucket} fehlgeschlagen: ${error.message}`);
        }
        const remaining = await listFilesRecursively(bucket, companyOwnerId);
        if (remaining.length) throw new Error(`Storage-Bereinigung unvollständig: ${remaining.length} Dateien in ${bucket} verblieben.`);
    }
}

export async function getTenantStorageUsage(companyOwnerId: string): Promise<{ bytes: number; files: number; byBucket: Record<string, { bytes: number; files: number }> }> {
    const byBucket: Record<string, { bytes: number; files: number }> = {};
    let bytes = 0;
    let files = 0;
    for (const bucket of TENANT_STORAGE_BUCKETS) {
        const items = await listFilesRecursively(bucket, companyOwnerId);
        const bucketBytes = items.reduce((sum, item) => sum + Number(item.size || 0), 0);
        byBucket[bucket] = { bytes: bucketBytes, files: items.length };
        bytes += bucketBytes;
        files += items.length;
    }
    return { bytes, files, byBucket };
}

export async function purgeExpiredAccountBackups(): Promise<number> {
    if (!supabaseAdmin) throw new Error('Supabase Admin-Client ist nicht konfiguriert.');
    const { data: backups, error } = await supabaseAdmin
        .from('account_backups')
        .select('id, storage_path')
        .lt('expires_at', new Date().toISOString())
        .in('status', ['ready', 'failed']);
    if (error) throw new Error(`Abgelaufene Backups konnten nicht geladen werden: ${error.message}`);

    let purged = 0;
    for (const backup of backups || []) {
        await removeBackupObjects(backup.storage_path);
        const { error: metadataError } = await supabaseAdmin.from('account_backups').delete().eq('id', backup.id);
        if (metadataError) throw new Error(`Backup-Metadaten ${backup.id} konnten nicht entfernt werden: ${metadataError.message}`);
        purged += 1;
    }
    return purged;
}
