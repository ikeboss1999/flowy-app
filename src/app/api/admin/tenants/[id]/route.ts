import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function publicCompanyData(value: Record<string, unknown> | null | undefined) {
    if (!value) return null;
    return {
        companyName: value.companyName || '', email: value.email || '', phone: value.phone || '', website: value.website || '',
        street: value.street || '', zipCode: value.zipCode || '', city: value.city || '', state: value.state || '', country: value.country || '',
        ceoFirstName: value.ceoFirstName || '', ceoLastName: value.ceoLastName || '', vatId: value.vatId || '',
        commercialRegisterNumber: value.commercialRegisterNumber || '', commercialCourt: value.commercialCourt || '',
    };
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 });
    try {
        const { data: owner, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(params.id);
        if (ownerError || !owner.user) return NextResponse.json({ message: 'Firmenkonto nicht gefunden.' }, { status: 404 });

        const [roles, settings, billing, access, usage, webSessions, mobileSessions, backups, audits, invoices] = await Promise.all([
            supabaseAdmin.from('user_roles').select('user_id, company_owner_id, role, status, permissions').eq('company_owner_id', params.id),
            supabaseAdmin.from('settings').select('userId, companyData, accountSettings, createdAt, updatedAt').eq('userId', params.id).maybeSingle(),
            supabaseAdmin.from('admin_tenant_billing').select('*').eq('company_owner_id', params.id).maybeSingle(),
            supabaseAdmin.from('admin_tenant_access').select('*').eq('company_owner_id', params.id).maybeSingle(),
            supabaseAdmin.from('admin_tenant_usage_snapshots').select('*').eq('company_owner_id', params.id).maybeSingle(),
            supabaseAdmin.from('admin_user_sessions').select('id,user_id,app_source,user_agent,created_at,last_seen_at,revoked_at').eq('company_owner_id', params.id).order('last_seen_at', { ascending: false }).limit(20),
            supabaseAdmin.from('employee_mobile_sessions').select('id,employeeId,platform,deviceName,appVersion,createdAt,lastSeenAt,revokedAt,expiresAt').eq('userId', params.id).order('lastSeenAt', { ascending: false }).limit(20),
            supabaseAdmin.from('account_backups').select('id,status,created_at,expires_at,file_count,total_bytes').eq('company_owner_id', params.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('admin_audit_logs').select('id,action,target_type,target_id,details,created_at,developer_user_id').eq('target_id', params.id).order('created_at', { ascending: false }).limit(30),
            supabaseAdmin.from('invoices').select('totalAmount,status,issueDate').eq('userId', params.id).limit(5000),
        ]);
        if (roles.error) throw roles.error;
        const authUsers = [];
        for (const role of roles.data || []) {
            const { data } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
            authUsers.push({
                id: role.user_id, email: data.user?.email || '', name: data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'Ohne Name',
                role: role.role, status: role.status, createdAt: data.user?.created_at || null, lastSignInAt: data.user?.last_sign_in_at || null,
            });
        }
        if (!authUsers.some(user => user.id === params.id)) authUsers.unshift({ id: params.id, email: owner.user.email || '', name: owner.user.user_metadata?.full_name || owner.user.email?.split('@')[0] || 'Ohne Name', role: 'admin', status: 'active', createdAt: owner.user.created_at, lastSignInAt: owner.user.last_sign_in_at || null });

        const paidInvoices = (invoices.data || []).filter(invoice => invoice.status === 'paid' || invoice.status === 'bezahlt');
        const openInvoices = (invoices.data || []).filter(invoice => ['pending', 'overdue', 'offen', 'fällig'].includes(invoice.status));
        return NextResponse.json({
            owner: { id: owner.user.id, email: owner.user.email || '', name: settings.data?.accountSettings?.name || owner.user.user_metadata?.full_name || owner.user.email?.split('@')[0] || 'Ohne Name', createdAt: owner.user.created_at, lastSignInAt: owner.user.last_sign_in_at || null, verified: !!owner.user.email_confirmed_at },
            company: publicCompanyData(settings.data?.companyData),
            onboardingCompleted: !!settings.data?.accountSettings?.onboardingCompleted,
            users: authUsers,
            billing: billing.data || null,
            access: access.data || null,
            usage: usage.data || null,
            sessions: { web: webSessions.data || [], mobile: mobileSessions.data || [] },
            backups: backups.data || [],
            audits: audits.data || [],
            documents: { invoices: invoices.data?.length || 0, paidRevenue: paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0), openAmount: openInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0) },
        });
    } catch (error) {
        console.error('[AdminTenantDetail]', error);
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Mandant konnte nicht geladen werden.' }, { status: 500 });
    }
}
