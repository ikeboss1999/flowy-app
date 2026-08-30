import { NextResponse } from 'next/server';
import { refreshAllTenantUsage } from '@/lib/admin-usage';
import { runTrackedSystemJob } from '@/lib/admin-system-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        return NextResponse.json({ success: true, ...(await runTrackedSystemJob('tenant-usage-refresh', refreshAllTenantUsage)) });
    } catch (error) {
        console.error('[AdminUsageCron]', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Usage refresh failed' }, { status: 500 });
    }
}
