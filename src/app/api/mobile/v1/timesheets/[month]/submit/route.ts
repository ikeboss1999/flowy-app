import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';
import { getTimesheetStatus, rejectLockedTimesheet } from '@/lib/mobile-time-tracking';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { month: string } }) {
    try {
        const auth = await requireMobileSession(request, 'timeTracking');
        if (!auth.ok) return auth.response;

        if (!/^\d{4}-\d{2}$/.test(params.month)) {
            return NextResponse.json({ error: 'Month must be YYYY-MM' }, { status: 400 });
        }

        const timesheet = await getTimesheetStatus(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            month: params.month,
        });
        const lockedResponse = rejectLockedTimesheet(timesheet);
        if (lockedResponse) return lockedResponse;

        const now = new Date().toISOString();
        const timesheetPayload = {
            id: timesheet?.id || `${auth.employeeId}-${params.month}`,
            userId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            month: params.month,
            status: 'submitted',
            finalizedAt: null,
            submittedAt: now,
        };

        const { data, error } = await auth.client
            .from('timesheets')
            .upsert(timesheetPayload)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, timesheet: data });
    } catch (error) {
        console.error('[MobileTimesheetSubmit] failed:', error);
        return NextResponse.json({ error: 'Failed to submit mobile timesheet' }, { status: 500 });
    }
}
