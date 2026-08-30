import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateTenantUsage } from '@/lib/admin-usage';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';

export const dynamic = 'force-dynamic';

const billingSchema = z.object({
    companyOwnerId: z.string().uuid(),
    planName: z.string().trim().min(1).max(80),
    billingCycle: z.enum(['monthly', 'yearly', 'manual', 'free']),
    priceAmount: z.number().min(0).max(1_000_000),
    paymentStatus: z.enum(['unknown', 'trial', 'paid', 'open', 'overdue', 'failed', 'cancelled', 'free']),
    trialEndsAt: z.string().datetime().nullable().optional(),
    lastPaymentAt: z.string().datetime().nullable().optional(),
    nextPaymentAt: z.string().datetime().nullable().optional(),
    internalNotes: z.string().max(2000).nullable().optional(),
});

async function authUsers() {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return data.users;
}

export async function GET(request: Request) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const section = new URL(request.url).searchParams.get('section') || 'users';

    try {
        if (section === 'sessions') {
            const [sessions, mobileSessions, users, employees] = await Promise.all([
                supabaseAdmin.from('admin_user_sessions').select('*').order('last_seen_at', { ascending: false }).limit(500),
                supabaseAdmin.from('employee_mobile_sessions').select('id,userId,employeeId,platform,deviceName,appVersion,lastSeenAt,createdAt,expiresAt,revokedAt').order('lastSeenAt', { ascending: false }).limit(500),
                authUsers(),
                supabaseAdmin.from('employees').select('*'),
            ]);
            if (sessions.error) throw sessions.error;
            const userMap = new Map(users.map(user => [user.id, user]));
            const employeeMap = new Map((employees.data || []).map(item => {
                const employee = decryptEmployee(item as Employee);
                return [employee.id, `${employee.personalData?.firstName || ''} ${employee.personalData?.lastName || ''}`.trim() || employee.employeeNumber];
            }));
            const web = (sessions.data || []).map(session => ({
                ...session,
                sessionType: 'web',
                email: userMap.get(session.user_id)?.email || '',
                name: userMap.get(session.user_id)?.user_metadata?.full_name || userMap.get(session.user_id)?.email?.split('@')[0] || 'Unbekannt',
                isActive: !session.revoked_at && new Date(session.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000,
            }));
            const mobile = (mobileSessions.data || []).map(session => ({
                id: session.id, sessionType: 'mobile', user_id: session.employeeId, company_owner_id: session.userId,
                name: employeeMap.get(session.employeeId) || 'Mitarbeiter', email: '', app_source: 'Mitarbeiter-App',
                user_agent: [session.deviceName, session.platform, session.appVersion].filter(Boolean).join(' · '),
                created_at: session.createdAt, last_seen_at: session.lastSeenAt, revoked_at: session.revokedAt,
                isActive: !session.revokedAt && new Date(session.lastSeenAt).getTime() > Date.now() - 5 * 60 * 1000 && new Date(session.expiresAt).getTime() > Date.now(),
            }));
            return NextResponse.json([...web, ...mobile].sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()));
        }

        if (section === 'billing') {
            const [billing, users, roles] = await Promise.all([
                supabaseAdmin.from('admin_tenant_billing').select('*').order('updated_at', { ascending: false }),
                authUsers(),
                supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role'),
            ]);
            if (billing.error) throw billing.error;
            if (roles.error) throw roles.error;
            const billingMap = new Map((billing.data || []).map(item => [item.company_owner_id, item]));
            const roleMap = new Map((roles.data || []).map(role => [role.user_id, role]));
            return NextResponse.json(users.filter(user => {
                const role = roleMap.get(user.id);
                return role?.role !== 'developer' && (!role || role.user_id === role.company_owner_id);
            }).map(user => ({
                companyOwnerId: user.id,
                email: user.email || '',
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ohne Name',
                billing: billingMap.get(user.id) || null,
            })));
        }

        if (section === 'backups') {
            const { data, error } = await supabaseAdmin.from('account_backups').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return NextResponse.json(data || []);
        }

        if (section === 'audit') {
            const [{ data, error }, users] = await Promise.all([
                supabaseAdmin.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
                authUsers(),
            ]);
            if (error) throw error;
            const userMap = new Map(users.map(user => [user.id, user.email || user.id]));
            return NextResponse.json((data || []).map(item => ({ ...item, developer_email: userMap.get(item.developer_user_id) || item.developer_user_id })));
        }

        if (section === 'system') {
            const startedAt = Date.now();
            const checks = await Promise.all([
                supabaseAdmin.from('settings').select('userId', { count: 'exact', head: true }),
                supabaseAdmin.from('account_backups').select('id', { count: 'exact', head: true }),
                supabaseAdmin.from('admin_user_sessions').select('id', { count: 'exact', head: true }),
                supabaseAdmin.storage.listBuckets(),
                supabaseAdmin.from('admin_system_jobs').select('*').order('started_at', { ascending: false }),
                supabaseAdmin.from('account_backups').select('id,owner_email,failure_reason,created_at').eq('status', 'failed').order('created_at', { ascending: false }).limit(20),
                supabaseAdmin.from('settings').select('accountSettings'),
            ]);
            const emailConfigured = (checks[6].data || []).filter(item => {
                const delivery = item.accountSettings?.emailDelivery;
                return !!(delivery?.smtpHost && delivery?.smtpUser && delivery?.fromEmail);
            }).length;
            return NextResponse.json({
                checkedAt: new Date().toISOString(),
                responseTimeMs: Date.now() - startedAt,
                checks: [
                    { name: 'Datenbank', ok: !checks[0].error, detail: checks[0].error?.message || 'Erreichbar' },
                    { name: 'Backup-Metadaten', ok: !checks[1].error, detail: checks[1].error?.message || `${checks[1].count || 0} Backups` },
                    { name: 'Aktivitätstracking', ok: !checks[2].error, detail: checks[2].error?.message || 'Bereit' },
                    { name: 'Storage', ok: !checks[3].error, detail: checks[3].error?.message || `${checks[3].data?.length || 0} Buckets` },
                    { name: 'Backup-Verschlüsselung', ok: !!process.env.ACCOUNT_BACKUP_ENCRYPTION_KEY, detail: process.env.ACCOUNT_BACKUP_ENCRYPTION_KEY ? 'Konfiguriert' : 'Secret fehlt' },
                    { name: 'Cron-Schutz', ok: !!process.env.CRON_SECRET, detail: process.env.CRON_SECRET ? 'Konfiguriert' : 'Secret fehlt' },
                    { name: 'Cron-Protokoll', ok: !checks[4].error, detail: checks[4].error?.message || `${checks[4].data?.length || 0} Aufgaben protokolliert` },
                    { name: 'E-Mail-Konfiguration', ok: !checks[6].error, detail: checks[6].error?.message || `${emailConfigured} Konten mit SMTP-Konfiguration` },
                ],
                jobs: checks[4].data || [],
                failedBackups: checks[5].data || [],
            });
        }

        if (section === 'usage') {
            const [users, roles, settings, snapshots, billing, access] = await Promise.all([
                authUsers(),
                supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role'),
                supabaseAdmin.from('settings').select('userId, companyData, accountSettings'),
                supabaseAdmin.from('admin_tenant_usage_snapshots').select('*').order('storage_bytes', { ascending: false }),
                supabaseAdmin.from('admin_tenant_billing').select('company_owner_id, plan_name'),
                supabaseAdmin.from('admin_tenant_access').select('company_owner_id, is_suspended'),
            ]);
            if (roles.error) throw roles.error;
            if (snapshots.error) throw snapshots.error;
            const userMap = new Map(users.map(user => [user.id, user]));
            const settingsMap = new Map((settings.data || []).map(item => [item.userId, item]));
            const snapshotMap = new Map((snapshots.data || []).map(item => [item.company_owner_id, item]));
            const billingMap = new Map((billing.data || []).map(item => [item.company_owner_id, item]));
            const accessMap = new Map((access.data || []).map(item => [item.company_owner_id, item]));
            const owners = (roles.data || []).filter(role => role.user_id === role.company_owner_id && role.role !== 'developer');
            return NextResponse.json(owners.map(role => {
                const user = userMap.get(role.user_id);
                const ownerSettings = settingsMap.get(role.user_id);
                return {
                    companyOwnerId: role.user_id,
                    companyName: ownerSettings?.companyData?.name || ownerSettings?.companyData?.companyName || ownerSettings?.accountSettings?.name || user?.email?.split('@')[0] || 'Ohne Name',
                    email: user?.email || '',
                    planName: billingMap.get(role.user_id)?.plan_name || 'Nicht konfiguriert',
                    suspended: accessMap.get(role.user_id)?.is_suspended || false,
                    snapshot: snapshotMap.get(role.user_id) || null,
                };
            }));
        }

        const [users, roles, settings, billing, sessions, access] = await Promise.all([
            authUsers(),
            supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role, status'),
            supabaseAdmin.from('settings').select('userId, companyData, accountSettings'),
            supabaseAdmin.from('admin_tenant_billing').select('*'),
            supabaseAdmin.from('admin_user_sessions').select('user_id, last_seen_at, revoked_at').order('last_seen_at', { ascending: false }),
            supabaseAdmin.from('admin_tenant_access').select('*'),
        ]);
        if (roles.error) throw roles.error;
        const roleMap = new Map((roles.data || []).map(role => [role.user_id, role]));
        const settingsMap = new Map((settings.data || []).map(item => [item.userId, item]));
        const billingMap = new Map((billing.data || []).map(item => [item.company_owner_id, item]));
        const lastSeenMap = new Map<string, string>();
        const accessMap = new Map((access.data || []).map(item => [item.company_owner_id, item]));
        for (const session of sessions.data || []) if (!lastSeenMap.has(session.user_id) && !session.revoked_at) lastSeenMap.set(session.user_id, session.last_seen_at);
        return NextResponse.json(users.map(user => {
            const role = roleMap.get(user.id);
            const ownerId = role?.company_owner_id || user.id;
            const ownerSettings = settingsMap.get(ownerId);
            return {
                id: user.id,
                companyOwnerId: ownerId,
                email: user.email || '',
                name: ownerSettings?.accountSettings?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ohne Name',
                companyName: ownerSettings?.companyData?.name || ownerSettings?.companyData?.companyName || '',
                role: role?.role || user.app_metadata?.role || 'admin',
                status: role?.status || 'active',
                createdAt: user.created_at,
                lastSignInAt: user.last_sign_in_at || null,
                lastSeenAt: lastSeenMap.get(user.id) || null,
                verified: !!user.email_confirmed_at,
                billing: billingMap.get(ownerId) || null,
                access: accessMap.get(ownerId) || null,
            };
        }));
    } catch (error) {
        console.error(`[AdminControlCenter:${section}]`, error);
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Serverfehler' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const parsed = billingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: 'Ungültige Abrechnungsdaten' }, { status: 400 });
    const value = parsed.data;
    const { error } = await supabaseAdmin.from('admin_tenant_billing').upsert({
        company_owner_id: value.companyOwnerId,
        plan_name: value.planName,
        billing_cycle: value.billingCycle,
        price_amount: value.priceAmount,
        payment_status: value.paymentStatus,
        trial_ends_at: value.trialEndsAt || null,
        last_payment_at: value.lastPaymentAt || null,
        next_payment_at: value.nextPaymentAt || null,
        internal_notes: value.internalNotes || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'company_owner_id' });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await supabaseAdmin.from('admin_audit_logs').insert({ developer_user_id: admin.userId, action: 'billing.updated', target_type: 'tenant', target_id: value.companyOwnerId, details: { planName: value.planName, paymentStatus: value.paymentStatus, priceAmount: value.priceAmount } });
    return NextResponse.json({ success: true });
}

const accessSchema = z.object({
    companyOwnerId: z.string().uuid(),
    suspended: z.boolean(),
    reason: z.string().trim().min(3).max(500).nullable().optional(),
});

export async function POST(request: Request) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const body = await request.json().catch(() => null);
    if (body?.action === 'refresh_usage') {
        const ownerId = z.string().uuid().safeParse(body.companyOwnerId);
        if (!ownerId.success) return NextResponse.json({ message: 'Ungültige Firmen-ID.' }, { status: 400 });
        try {
            const snapshot = await calculateTenantUsage(ownerId.data);
            await supabaseAdmin.from('admin_audit_logs').insert({ developer_user_id: admin.userId, action: 'usage.refreshed', target_type: 'tenant', target_id: ownerId.data, details: { calculationMs: snapshot.calculationMs } });
            return NextResponse.json({ success: true, snapshot });
        } catch (error) {
            return NextResponse.json({ message: error instanceof Error ? error.message : 'Aktualisierung fehlgeschlagen.' }, { status: 500 });
        }
    }
    const parsed = accessSchema.safeParse(body);
    if (!parsed.success || (parsed.data.suspended && !parsed.data.reason)) return NextResponse.json({ message: 'Bitte einen Sperrgrund angeben.' }, { status: 400 });
    if (parsed.data.companyOwnerId === admin.userId) return NextResponse.json({ message: 'Das eigene Entwicklerkonto kann nicht gesperrt werden.' }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('admin_tenant_access').upsert({
        company_owner_id: parsed.data.companyOwnerId,
        is_suspended: parsed.data.suspended,
        suspension_reason: parsed.data.suspended ? parsed.data.reason : null,
        suspended_at: parsed.data.suspended ? now : null,
        suspended_by: parsed.data.suspended ? admin.userId : null,
        updated_at: now,
    }, { onConflict: 'company_owner_id' });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    if (parsed.data.suspended) {
        await supabaseAdmin.from('employee_mobile_sessions').update({ revokedAt: now }).eq('userId', parsed.data.companyOwnerId).is('revokedAt', null);
        await supabaseAdmin.from('admin_user_sessions').update({ revoked_at: now }).eq('company_owner_id', parsed.data.companyOwnerId).is('revoked_at', null);
    }
    await supabaseAdmin.from('admin_audit_logs').insert({
        developer_user_id: admin.userId,
        action: parsed.data.suspended ? 'tenant.suspended' : 'tenant.unsuspended',
        target_type: 'tenant',
        target_id: parsed.data.companyOwnerId,
        details: { reason: parsed.data.reason || null },
    });
    return NextResponse.json({ success: true });
}

const sessionActionSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('revoke_session'), sessionId: z.string().uuid(), sessionType: z.enum(['web', 'mobile']) }),
    z.object({ action: z.literal('revoke_tenant_sessions'), companyOwnerId: z.string().uuid() }),
]);

export async function DELETE(request: Request) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    const parsed = sessionActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: 'Ungültige Sitzungsaktion.' }, { status: 400 });
    const now = new Date().toISOString();
    try {
        if (parsed.data.action === 'revoke_session') {
            const result = parsed.data.sessionType === 'web'
                ? await supabaseAdmin.from('admin_user_sessions').update({ revoked_at: now }).eq('id', parsed.data.sessionId)
                : await supabaseAdmin.from('employee_mobile_sessions').update({ revokedAt: now, updatedAt: now }).eq('id', parsed.data.sessionId);
            if (result.error) throw result.error;
            await supabaseAdmin.from('admin_audit_logs').insert({ developer_user_id: admin.userId, action: 'session.revoked', target_type: parsed.data.sessionType, target_id: parsed.data.sessionId, details: {} });
            return NextResponse.json({ success: true });
        }

        await supabaseAdmin.from('admin_user_sessions').update({ revoked_at: now }).eq('company_owner_id', parsed.data.companyOwnerId).is('revoked_at', null);
        await supabaseAdmin.from('employee_mobile_sessions').update({ revokedAt: now, updatedAt: now }).eq('userId', parsed.data.companyOwnerId).is('revokedAt', null);
        const { error } = await supabaseAdmin.from('admin_tenant_access').upsert({ company_owner_id: parsed.data.companyOwnerId, force_logout_after: now, updated_at: now }, { onConflict: 'company_owner_id' });
        if (error) throw error;
        await supabaseAdmin.from('admin_audit_logs').insert({ developer_user_id: admin.userId, action: 'tenant.sessions_revoked', target_type: 'tenant', target_id: parsed.data.companyOwnerId, details: {} });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Sitzung konnte nicht beendet werden.' }, { status: 500 });
    }
}
