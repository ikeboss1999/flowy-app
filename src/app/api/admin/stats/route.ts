import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isMissingAdminTable(error: { code?: string; message?: string } | null) {
    return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message || ''));
}

export async function GET() {
    const startedAt = Date.now();
    try {
        const admin = await checkAdmin();
        if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });

        const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [usersResult, rolesResult, invoicesResult, customersResult, projectsResult, sessionsResult, billingResult, backupsResult] = await Promise.all([
            supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
            supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role, status'),
            supabaseAdmin.from('invoices').select('id, userId, totalAmount, status', { count: 'exact' }),
            supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('admin_user_sessions').select('id, user_id, company_owner_id, last_seen_at, app_source').gte('last_seen_at', activeSince).is('revoked_at', null),
            supabaseAdmin.from('admin_tenant_billing').select('*'),
            supabaseAdmin.from('account_backups').select('id, status, expires_at, file_count, total_bytes').order('created_at', { ascending: false }).limit(100),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (rolesResult.error) throw rolesResult.error;
        if (invoicesResult.error) throw invoicesResult.error;
        if (customersResult.error) throw customersResult.error;
        if (projectsResult.error) throw projectsResult.error;

        const users = usersResult.data.users || [];
        const roles = rolesResult.data || [];
        const ownerIds = new Set(roles.filter(role => role.user_id === role.company_owner_id && role.role !== 'developer').map(role => role.user_id));
        for (const user of users) {
            if (!roles.some(role => role.user_id === user.id) && user.app_metadata?.role !== 'developer') ownerIds.add(user.id);
        }
        const recentUsers = users
            .filter(user => ownerIds.has(user.id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6)
            .map(user => ({
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ohne Name',
                email: user.email || '',
                createdAt: user.created_at,
                lastSignInAt: user.last_sign_in_at,
                isNew: new Date(user.created_at) >= new Date(weekAgo),
            }));

        const paidInvoices = (invoicesResult.data || []).filter(invoice => invoice.status === 'bezahlt' || invoice.status === 'paid');
        const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
        const sessions = sessionsResult.error && isMissingAdminTable(sessionsResult.error) ? [] : (sessionsResult.data || []);
        const billing = billingResult.error && isMissingAdminTable(billingResult.error) ? [] : (billingResult.data || []);
        const backups = backupsResult.error && isMissingAdminTable(backupsResult.error) ? [] : (backupsResult.data || []);
        const monthlyRecurringRevenue = billing
            .filter(item => item.payment_status === 'paid' && item.billing_cycle !== 'free')
            .reduce((sum, item) => sum + (item.billing_cycle === 'yearly' ? Number(item.price_amount || 0) / 12 : Number(item.price_amount || 0)), 0);

        return NextResponse.json({
            generatedAt: new Date().toISOString(),
            responseTimeMs: Date.now() - startedAt,
            totals: {
                companies: ownerIds.size,
                authUsers: users.length,
                activeSessions: sessions.length,
                invoices: invoicesResult.count || 0,
                customers: customersResult.count || 0,
                projects: projectsResult.count || 0,
                documentRevenue: totalRevenue,
                monthlyRecurringRevenue,
            },
            billing: {
                configured: billing.length,
                paid: billing.filter(item => item.payment_status === 'paid').length,
                overdue: billing.filter(item => ['overdue', 'failed'].includes(item.payment_status)).length,
                trial: billing.filter(item => item.payment_status === 'trial').length,
                unknown: Math.max(0, ownerIds.size - billing.length) + billing.filter(item => item.payment_status === 'unknown').length,
            },
            backups: {
                ready: backups.filter(item => item.status === 'ready').length,
                failed: backups.filter(item => item.status === 'failed').length,
                expiringSoon: backups.filter(item => item.status === 'ready' && new Date(item.expires_at).getTime() - Date.now() < 7 * 86400000).length,
                totalBytes: backups.reduce((sum, item) => sum + Number(item.total_bytes || 0), 0),
            },
            recentUsers,
            activeSessions: sessions.slice(0, 8),
            health: {
                database: 'online',
                auth: 'online',
                backupConfiguration: backupsResult.error ? 'setup_required' : 'online',
                activityTracking: sessionsResult.error ? 'setup_required' : 'online',
            },
        });
    } catch (error) {
        console.error('Admin Stats GET error:', error);
        return NextResponse.json({ message: 'Serverfehler', detail: error instanceof Error ? error.message : undefined }, { status: 500 });
    }
}
