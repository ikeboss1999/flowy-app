import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth-server';
import { removeBackupObjects } from '@/lib/account-backup';
import { restoreAccountBackup } from '@/lib/account-restore';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('restore'), confirmation: z.literal('WIEDERHERSTELLEN') }),
    z.object({ action: z.literal('extend'), days: z.number().int().min(1).max(30) }),
]);

async function audit(developerUserId: string, action: string, backupId: string, details: Record<string, unknown> = {}) {
    if (!supabaseAdmin) return;
    await supabaseAdmin.from('admin_audit_logs').insert({ developer_user_id: developerUserId, action, target_type: 'account_backup', target_id: backupId, details });
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: 'Ungültige oder fehlende Bestätigung.' }, { status: 400 });

    try {
        if (parsed.data.action === 'restore') {
            await audit(admin.userId, 'backup.restore_started', params.id);
            const result = await restoreAccountBackup(params.id);
            await audit(admin.userId, 'backup.restored', params.id, { ...result });
            return NextResponse.json({ success: true, result });
        }

        const { data: backup, error } = await supabaseAdmin.from('account_backups').select('expires_at, status').eq('id', params.id).maybeSingle();
        if (error || !backup) return NextResponse.json({ message: 'Backup nicht gefunden.' }, { status: 404 });
        if (backup.status !== 'ready') return NextResponse.json({ message: `Backup kann im Status ${backup.status} nicht verlängert werden.` }, { status: 409 });
        const base = Math.max(Date.now(), new Date(backup.expires_at).getTime());
        const expiresAt = new Date(base + parsed.data.days * 86400000).toISOString();
        const { error: updateError } = await supabaseAdmin.from('account_backups').update({ expires_at: expiresAt }).eq('id', params.id);
        if (updateError) throw updateError;
        await audit(admin.userId, 'backup.extended', params.id, { days: parsed.data.days, expiresAt });
        return NextResponse.json({ success: true, expiresAt });
    } catch (error) {
        await audit(admin.userId, 'backup.action_failed', params.id, { message: error instanceof Error ? error.message : 'Unbekannter Fehler' });
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Aktion fehlgeschlagen' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const body = await request.json().catch(() => null);
    if (body?.confirmation !== 'ENDGÜLTIG LÖSCHEN') return NextResponse.json({ message: 'Bestätigung ist ungültig.' }, { status: 400 });
    const { data: backup, error } = await supabaseAdmin.from('account_backups').select('storage_path, status, owner_email').eq('id', params.id).maybeSingle();
    if (error || !backup) return NextResponse.json({ message: 'Backup nicht gefunden.' }, { status: 404 });
    if (backup.status === 'restore_pending') return NextResponse.json({ message: 'Backup wird gerade wiederhergestellt.' }, { status: 409 });
    try {
        await removeBackupObjects(backup.storage_path);
        const { error: deleteError } = await supabaseAdmin.from('account_backups').delete().eq('id', params.id);
        if (deleteError) throw deleteError;
        await audit(admin.userId, 'backup.deleted_permanently', params.id, { ownerEmail: backup.owner_email, previousStatus: backup.status });
        return NextResponse.json({ success: true });
    } catch (actionError) {
        return NextResponse.json({ message: actionError instanceof Error ? actionError.message : 'Löschen fehlgeschlagen' }, { status: 500 });
    }
}
