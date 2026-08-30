import { NextResponse } from 'next/server';
import { purgeExpiredAccountBackups } from '@/lib/account-backup';
import { runTrackedSystemJob } from '@/lib/admin-system-jobs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');
    if (!expected || authorization !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await runTrackedSystemJob('account-backup-cleanup', async () => ({ purged: await purgeExpiredAccountBackups() }));
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[AccountBackupCleanup] failed:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Cleanup failed' }, { status: 500 });
    }
}
