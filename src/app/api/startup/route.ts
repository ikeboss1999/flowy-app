import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

type CountResult = {
    count?: number | null;
    error?: { message?: string } | null;
};

const safeCount = async (query: PromiseLike<CountResult>) => {
    const result = await query;
    if (result.error) {
        console.warn('[StartupAPI] Count failed:', result.error.message);
        return 0;
    }
    return result.count || 0;
};

export async function GET() {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const client = supabaseAdmin || supabase;

    try {
        const settingsPromise = client
            .from('settings')
            .select('*')
            .eq('userId', companyOwnerId)
            .maybeSingle();

        const accountSettingsPromise = session.role === 'employee'
            ? client
                .from('settings')
                .select('accountSettings')
                .eq('userId', session.userId)
                .maybeSingle()
            : Promise.resolve(null);

        const invoiceDraftsPromise = hasPermission(session, 'invoices_read')
            ? safeCount(client
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('userId', companyOwnerId)
                .eq('status', 'draft')
                .gte('issueDate', startDate)
                .lte('issueDate', endDate))
            : Promise.resolve(0);

        const overdueInvoicesPromise = hasPermission(session, 'invoices_read')
            ? safeCount(client
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('userId', companyOwnerId)
                .eq('status', 'overdue')
                .gte('issueDate', startDate)
                .lte('issueDate', endDate))
            : Promise.resolve(0);

        const openOffersPromise = hasPermission(session, 'offers_read')
            ? safeCount(client
                .from('offers')
                .select('id', { count: 'exact', head: true })
                .eq('userId', companyOwnerId)
                .eq('status', 'sent')
                .gte('issueDate', startDate)
                .lte('issueDate', endDate))
            : Promise.resolve(0);

        const employeesPromise = hasPermission(session, 'employees_read')
            ? safeCount(client
                .from('employees')
                .select('id', { count: 'exact', head: true })
                .eq('userId', companyOwnerId))
            : Promise.resolve(0);

        const activeProjectsPromise = hasPermission(session, 'projects_read')
            ? safeCount(client
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('userId', companyOwnerId)
                .neq('status', 'completed')
                .neq('status', 'archived'))
            : Promise.resolve(0);

        const [
            settingsResult,
            accountSettingsResult,
            invoiceDrafts,
            overdueInvoices,
            openOffers,
            employees,
            activeProjects,
        ] = await Promise.all([
            settingsPromise,
            accountSettingsPromise,
            invoiceDraftsPromise,
            overdueInvoicesPromise,
            openOffersPromise,
            employeesPromise,
            activeProjectsPromise,
        ]);

        if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
            throw settingsResult.error;
        }

        const settingsData = settingsResult.data as any;
        const companyData = settingsData?.companyData || settingsData?.companydata || {};
        const personalAccountSettings = (accountSettingsResult as any)?.data?.accountSettings || (accountSettingsResult as any)?.data?.accountsettings || {};
        const ownerAccountSettings = settingsData?.accountSettings || settingsData?.accountsettings || {};
        const accountSettings = session.role === 'employee'
            ? {
                ...personalAccountSettings,
                name: personalAccountSettings.name || session.name || session.email?.split('@')[0] || 'Benutzer',
            }
            : ownerAccountSettings;

        const payload = {
            company: {
                companyName: companyData.companyName || 'FlowY',
                logo: companyData.logo || null,
                zipCode: companyData.zipCode || '',
                city: companyData.city || '',
            },
            account: {
                name: accountSettings.name || 'Benutzer',
            },
            status: {
                invoiceDrafts,
                overdueInvoices,
                openOffers,
                activeProjects,
                employees,
            },
        };

        logApiPerformance('/api/startup', startedAt, { payload });
        return NextResponse.json(payload);
    } catch (error) {
        console.error('[StartupAPI] GET failed:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
