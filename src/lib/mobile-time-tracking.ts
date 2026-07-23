import { NextResponse } from 'next/server';
import { z } from 'zod';

export const timeEntryTypeSchema = z.enum(['WORK', 'BAD_WEATHER', 'WORK_BAD_WEATHER', 'VACATION', 'SICK', 'HOLIDAY', 'OFF']);
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');
const mobileTimeSchema = z.union([hhmmSchema, z.literal('')]);

export const mobileTimeEntrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: mobileTimeSchema.optional().default(''),
    endTime: mobileTimeSchema.optional().default(''),
    breakDuration: z.number().int().min(0).max(24 * 60).optional().default(0),
    type: timeEntryTypeSchema,
    projectId: z.string().min(1).optional().nullable(),
    location: z.string().trim().max(160).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    clientOperationId: z.string().trim().max(120).optional().nullable(),
});

export const mobileTimeEntryPatchSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: mobileTimeSchema.optional(),
    endTime: mobileTimeSchema.optional(),
    breakDuration: z.number().int().min(0).max(24 * 60).optional(),
    type: timeEntryTypeSchema.optional(),
    projectId: z.string().min(1).optional().nullable(),
    location: z.string().trim().max(160).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    clientOperationId: z.string().trim().max(120).optional().nullable(),
});

export function monthFromDate(date: string) {
    return date.slice(0, 7);
}

export function monthRange(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return { start, end };
}

export function calculateDurationMinutes(startTime?: string, endTime?: string, breakDuration = 0) {
    if (!startTime || !endTime) return 0;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) return 0;

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    if (end <= start) return 0;
    return Math.max(0, end - start - breakDuration);
}

export function validateMobileEntryDate(date: string) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || date !== parsed.toISOString().slice(0, 10)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (parsed.getTime() > todayUtc.getTime()) {
        return NextResponse.json({ error: 'Future dates are not allowed' }, { status: 400 });
    }

    const oldestAllowed = new Date(todayUtc);
    oldestAllowed.setUTCMonth(oldestAllowed.getUTCMonth() - 2);
    if (parsed.getTime() < oldestAllowed.getTime()) {
        return NextResponse.json({ error: 'Date is outside the allowed mobile entry range' }, { status: 400 });
    }

    return null;
}

export function validateMobileEntryTimes(startTime?: string, endTime?: string, breakDuration = 0) {
    if (!startTime && !endTime) return null;
    if (!startTime || !endTime) {
        return NextResponse.json({ error: 'Start and end time are required together' }, { status: 400 });
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (end <= start) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    if (breakDuration >= end - start) {
        return NextResponse.json({ error: 'Break duration must be shorter than working time' }, { status: 400 });
    }

    return null;
}

export async function getTimesheetStatus(client: any, params: { companyOwnerId: string; employeeId: string; month: string }) {
    const { data, error } = await client
        .from('timesheets')
        .select('*')
        .eq('userId', params.companyOwnerId)
        .eq('employeeId', params.employeeId)
        .eq('month', params.month)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

export function rejectLockedTimesheet(timesheet: any) {
    if (timesheet && timesheet.status !== 'draft') {
        return NextResponse.json({ error: 'Timesheet is locked for this month' }, { status: 409 });
    }

    return null;
}

export async function verifyAssignedProject(client: any, params: { companyOwnerId: string; employeeId: string; projectId?: string | null }) {
    if (!params.projectId) return true;

    const { data, error } = await client
        .from('project_assignments')
        .select('id')
        .eq('userId', params.companyOwnerId)
        .eq('employeeId', params.employeeId)
        .eq('projectId', params.projectId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

export function normalizeEntryPayload(input: z.infer<typeof mobileTimeEntrySchema>, employeeId: string, companyOwnerId: string) {
    const duration = calculateDurationMinutes(input.startTime, input.endTime, input.breakDuration);
    const location = input.location || input.notes || '';

    return {
        employeeId,
        userId: companyOwnerId,
        date: input.date,
        startTime: input.startTime || '',
        endTime: input.endTime || '',
        breakDuration: input.breakDuration || 0,
        type: input.type,
        projectId: input.projectId || null,
        location,
        overtime: 0,
        duration,
        badWeatherDuration: input.type === 'BAD_WEATHER' ? duration : 0,
    };
}
