import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';
import { getTimesheetStatus, monthRange } from '@/lib/mobile-time-tracking';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { month: string } }) {
    try {
        const auth = await requireMobileSession(request, 'timeTracking');
        if (!auth.ok) return auth.response;

        if (!/^\d{4}-\d{2}$/.test(params.month)) {
            return NextResponse.json({ error: 'Month must be YYYY-MM' }, { status: 400 });
        }
        const range = monthRange(params.month);

        const [timesheet, entriesResult] = await Promise.all([
            getTimesheetStatus(auth.client, {
                companyOwnerId: auth.companyOwnerId,
                employeeId: auth.employeeId,
                month: params.month,
            }),
            auth.client
                .from('time_entries')
                .select('id,duration,overtime,type,date')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', auth.employeeId)
                .gte('date', range.start)
                .lte('date', range.end),
        ]);

        if (entriesResult.error) throw entriesResult.error;

        const entries = entriesResult.data || [];
        const totalMinutes = entries.reduce((sum: number, entry: any) => sum + Number(entry.duration || 0), 0);
        const totalOvertime = entries.reduce((sum: number, entry: any) => sum + Number(entry.overtime || 0), 0);
        const workDays = new Set(entries.filter((entry: any) => Number(entry.duration || 0) > 0).map((entry: any) => entry.date)).size;

        return NextResponse.json({
            timesheet: timesheet || {
                id: `${auth.employeeId}-${params.month}`,
                employeeId: auth.employeeId,
                month: params.month,
                status: 'draft',
                finalizedAt: null,
            },
            summary: {
                entryCount: entries.length,
                totalMinutes,
                totalHours: Math.round((totalMinutes / 60) * 100) / 100,
                totalOvertime,
                workDays,
            },
        });
    } catch (error) {
        console.error('[MobileTimesheet] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile timesheet' }, { status: 500 });
    }
}
