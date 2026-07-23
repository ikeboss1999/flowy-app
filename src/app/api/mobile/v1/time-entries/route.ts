import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    getTimesheetStatus,
    mobileTimeEntrySchema,
    monthFromDate,
    normalizeEntryPayload,
    rejectLockedTimesheet,
    verifyAssignedProject,
} from '@/lib/mobile-time-tracking';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request, 'timeTracking');
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json({ error: 'Query parameter month=YYYY-MM is required' }, { status: 400 });
        }

        const { data, error } = await auth.client
            .from('time_entries')
            .select('*')
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .gte('date', `${month}-01`)
            .lte('date', `${month}-31`)
            .order('date', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ entries: data || [] });
    } catch (error) {
        console.error('[MobileTimeEntries] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile time entries' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireMobileSession(request, 'timeTracking');
        if (!auth.ok) return auth.response;

        const parsed = await parseJsonBody(request, mobileTimeEntrySchema);
        if (!parsed.ok) return parsed.response;

        const month = monthFromDate(parsed.data.date);
        const timesheet = await getTimesheetStatus(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            month,
        });
        const lockedResponse = rejectLockedTimesheet(timesheet);
        if (lockedResponse) return lockedResponse;

        const isProjectAssigned = await verifyAssignedProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: parsed.data.projectId,
        });
        if (!isProjectAssigned) {
            return NextResponse.json({ error: 'Project is not assigned to this mobile employee' }, { status: 403 });
        }

        const now = new Date().toISOString();
        const entry = {
            ...normalizeEntryPayload(parsed.data, auth.employeeId, auth.companyOwnerId),
            id: nanoid(),
            createdAt: now,
        };

        const { data, error } = await auth.client
            .from('time_entries')
            .insert(entry)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, entry: data }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request body', issues: error.issues }, { status: 400 });
        }
        console.error('[MobileTimeEntries] POST failed:', error);
        return NextResponse.json(
            {
                error: 'Failed to create mobile time entry',
                details: process.env.NODE_ENV === 'production' ? undefined : error,
            },
            { status: 500 }
        );
    }
}
