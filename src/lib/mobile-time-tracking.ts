import { NextResponse } from 'next/server';
import { z } from 'zod';

export const timeEntryTypeSchema = z.enum(['WORK', 'BAD_WEATHER', 'WORK_BAD_WEATHER', 'VACATION', 'SICK', 'HOLIDAY', 'OFF']);

export const mobileTimeEntrySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default(''),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default(''),
    breakDuration: z.number().int().min(0).max(24 * 60).optional().default(0),
    type: timeEntryTypeSchema,
    projectId: z.string().min(1).optional().nullable(),
    location: z.string().trim().max(160).optional().nullable(),
    overtime: z.number().min(-24).max(24).optional().nullable(),
    duration: z.number().int().min(0).max(24 * 60).optional().nullable(),
    badWeatherDuration: z.number().int().min(0).max(24 * 60).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    clientOperationId: z.string().trim().max(120).optional().nullable(),
});

export const mobileTimeEntryPatchSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    breakDuration: z.number().int().min(0).max(24 * 60).optional(),
    type: timeEntryTypeSchema.optional(),
    projectId: z.string().min(1).optional().nullable(),
    location: z.string().trim().max(160).optional().nullable(),
    overtime: z.number().min(-24).max(24).optional().nullable(),
    duration: z.number().int().min(0).max(24 * 60).optional().nullable(),
    badWeatherDuration: z.number().int().min(0).max(24 * 60).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    clientOperationId: z.string().trim().max(120).optional().nullable(),
});

export function monthFromDate(date: string) {
    return date.slice(0, 7);
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
    const duration = input.duration ?? calculateDurationMinutes(input.startTime, input.endTime, input.breakDuration);
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
        overtime: input.overtime ?? 0,
        duration,
        badWeatherDuration: input.badWeatherDuration ?? 0,
    };
}
