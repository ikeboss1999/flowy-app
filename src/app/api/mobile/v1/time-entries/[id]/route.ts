import { NextResponse } from 'next/server';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    calculateDurationMinutes,
    getTimesheetStatus,
    mobileTimeEntryPatchSchema,
    monthFromDate,
    rejectLockedTimesheet,
    validateMobileEntryDate,
    validateMobileEntryTimes,
    verifyAssignedProject,
} from '@/lib/mobile-time-tracking';

export const dynamic = 'force-dynamic';

async function getExistingEntry(client: any, params: { id: string; companyOwnerId: string; employeeId: string }) {
    const { data, error } = await client
        .from('time_entries')
        .select('*')
        .eq('id', params.id)
        .eq('userId', params.companyOwnerId)
        .eq('employeeId', params.employeeId)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'timeTracking');
        if (!auth.ok) return auth.response;

        const existing = await getExistingEntry(auth.client, {
            id: params.id,
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
        });
        if (!existing) return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });

        const parsed = await parseJsonBody(request, mobileTimeEntryPatchSchema);
        if (!parsed.ok) return parsed.response;

        const nextDate = parsed.data.date || existing.date;
        const dateValidation = validateMobileEntryDate(nextDate);
        if (dateValidation) return dateValidation;

        const startTime = parsed.data.startTime ?? existing.startTime;
        const endTime = parsed.data.endTime ?? existing.endTime;
        const breakDuration = parsed.data.breakDuration ?? existing.breakDuration ?? 0;
        const timeValidation = validateMobileEntryTimes(startTime, endTime, breakDuration);
        if (timeValidation) return timeValidation;

        const month = monthFromDate(nextDate);
        const timesheet = await getTimesheetStatus(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            month,
        });
        const lockedResponse = rejectLockedTimesheet(timesheet);
        if (lockedResponse) return lockedResponse;

        const existingMonth = monthFromDate(existing.date);
        if (existingMonth !== month) {
            const existingTimesheet = await getTimesheetStatus(auth.client, {
                companyOwnerId: auth.companyOwnerId,
                employeeId: auth.employeeId,
                month: existingMonth,
            });
            const existingLockedResponse = rejectLockedTimesheet(existingTimesheet);
            if (existingLockedResponse) return existingLockedResponse;
        }

        const nextProjectId = parsed.data.projectId !== undefined ? parsed.data.projectId : existing.projectId;
        const isProjectAssigned = await verifyAssignedProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: nextProjectId,
        });
        if (!isProjectAssigned) {
            return NextResponse.json({ error: 'Project is not assigned to this mobile employee' }, { status: 403 });
        }

        const updates: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(parsed.data)) {
            if (key === 'notes') continue;
            if (key === 'duration' || key === 'overtime' || key === 'badWeatherDuration') continue;
            if (value !== undefined) updates[key] = value;
        }

        if (parsed.data.notes !== undefined && parsed.data.location === undefined) {
            updates.location = parsed.data.notes || '';
        }

        if (updates.projectId === undefined && nextProjectId === null) updates.projectId = null;
        updates.duration = calculateDurationMinutes(startTime, endTime, breakDuration);
        updates.overtime = 0;
        updates.badWeatherDuration = (updates.type || existing.type) === 'BAD_WEATHER' ? updates.duration : 0;

        const { data, error } = await auth.client
            .from('time_entries')
            .update(updates)
            .eq('id', params.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .select()
            .single();

        if (error?.code === '23505') {
            return NextResponse.json({ error: 'Time entry already exists for this date' }, { status: 409 });
        }
        if (error) throw error;
        return NextResponse.json({ success: true, entry: data });
    } catch (error) {
        console.error('[MobileTimeEntry] PATCH failed:', error);
        return NextResponse.json({ error: 'Failed to update mobile time entry' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(_request, 'timeTracking');
        if (!auth.ok) return auth.response;

        const existing = await getExistingEntry(auth.client, {
            id: params.id,
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
        });
        if (!existing) return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });

        const timesheet = await getTimesheetStatus(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            month: monthFromDate(existing.date),
        });
        const lockedResponse = rejectLockedTimesheet(timesheet);
        if (lockedResponse) return lockedResponse;

        const { error } = await auth.client
            .from('time_entries')
            .delete()
            .eq('id', params.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[MobileTimeEntry] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to delete mobile time entry' }, { status: 500 });
    }
}
