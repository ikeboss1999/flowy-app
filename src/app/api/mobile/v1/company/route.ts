import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        const { data, error } = await auth.client
            .from('settings')
            .select('companyData')
            .eq('userId', auth.companyOwnerId)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({
            company: data?.companyData || {},
        });
    } catch (error) {
        console.error('[MobileCompany] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile company data' }, { status: 500 });
    }
}
