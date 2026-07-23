import { NextResponse } from 'next/server';
import { requireMobileSession, sanitizeMobileEmployee } from '@/lib/mobile-auth';
import { getTimesheetStatus } from '@/lib/mobile-time-tracking';

export const dynamic = 'force-dynamic';

function toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date) {
    return date.toISOString().slice(0, 7);
}

function startOfIsoWeek(date: Date) {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() - day + 1);
    return copy;
}

function endOfIsoWeek(date: Date) {
    const start = startOfIsoWeek(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return end;
}

function expectedWeeklyMinutes(weeklySchedule: any) {
    if (!weeklySchedule) return null;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours = days.reduce((sum, day) => {
        const entry = weeklySchedule[day];
        return sum + (entry?.enabled ? Number(entry.hours || 0) : 0);
    }, 0);
    return Math.round(hours * 60);
}

function buildTimeStatus(todayEntry: any) {
    if (!todayEntry) {
        return {
            state: 'missing',
            label: 'Noch keine Zeit erfasst',
            entry: null,
        };
    }

    if (todayEntry.startTime && !todayEntry.endTime) {
        return {
            state: 'running',
            label: 'Arbeitszeit laeuft',
            entry: todayEntry,
        };
    }

    return {
        state: 'recorded',
        label: 'Zeit erfasst',
        entry: todayEntry,
    };
}

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const requestedDate = searchParams.get('date');
        const today = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
            ? new Date(`${requestedDate}T00:00:00.000Z`)
            : new Date();
        const todayKey = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : toDateKey(today);
        const month = toMonthKey(today);
        const weekStart = toDateKey(startOfIsoWeek(today));
        const weekEnd = toDateKey(endOfIsoWeek(today));
        const permissions = auth.payload.permissions;

        const timeTrackingEnabled = !!permissions.timeTracking;
        const documentsEnabled = !!permissions.documents;
        const projectDiaryEnabled = !!permissions.projectDiary;

        const [
            employee,
            todayEntriesResult,
            weekEntriesResult,
            timesheet,
            assignmentsResult,
            documentsResult,
            receiptsResult,
        ] = await Promise.all([
            sanitizeMobileEmployee(auth.employee, auth.client, auth.companyOwnerId),
            timeTrackingEnabled
                ? auth.client
                    .from('time_entries')
                    .select('*')
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', auth.employeeId)
                    .eq('date', todayKey)
                    .order('createdAt', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            timeTrackingEnabled
                ? auth.client
                    .from('time_entries')
                    .select('id,date,duration,overtime,type')
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', auth.employeeId)
                    .gte('date', weekStart)
                    .lte('date', weekEnd)
                : Promise.resolve({ data: [], error: null }),
            timeTrackingEnabled
                ? getTimesheetStatus(auth.client, {
                    companyOwnerId: auth.companyOwnerId,
                    employeeId: auth.employeeId,
                    month,
                })
                : Promise.resolve(null),
            projectDiaryEnabled
                ? auth.client
                    .from('project_assignments')
                    .select('*')
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', auth.employeeId)
                    .eq('status', 'active')
                    .order('createdAt', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            documentsEnabled
                ? auth.client
                    .from('employee_documents')
                    .select('id,name,folderId,mimeType,fileSize,readRequired,createdAt,updatedAt')
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', auth.employeeId)
                    .eq('isShared', true)
                    .order('createdAt', { ascending: false })
                    .limit(5)
                : Promise.resolve({ data: [], error: null }),
            documentsEnabled
                ? auth.client
                    .from('document_receipts')
                    .select('documentId,readAt')
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', auth.employeeId)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (todayEntriesResult.error) throw todayEntriesResult.error;
        if (weekEntriesResult.error) throw weekEntriesResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;
        if (documentsResult.error) throw documentsResult.error;
        if (receiptsResult.error) throw receiptsResult.error;

        const assignments = assignmentsResult.data || [];
        const projectIds = assignments.map((assignment: any) => assignment.projectId);
        let projects: any[] = [];

        if (projectIds.length > 0) {
            const { data, error } = await auth.client
                .from('projects')
                .select('id,projectNumber,name,description,status,address,startDate,endDate')
                .eq('userId', auth.companyOwnerId)
                .eq('status', 'active')
                .in('id', projectIds);

            if (error) throw error;
            projects = data || [];
        }

        const assignmentByProjectId = new Map(assignments.map((assignment: any) => [assignment.projectId, assignment]));
        const assignedProjects = projects.map((project: any) => {
            const assignment: any = assignmentByProjectId.get(project.id);
            return {
                id: project.id,
                name: project.name,
                projectNumber: project.projectNumber,
                description: project.description,
                address: project.address,
                assignment: assignment ? {
                    id: assignment.id,
                    task: assignment.task,
                    startDate: assignment.startDate,
                    endDate: assignment.endDate,
                } : null,
            };
        });

        const todayEntry = (todayEntriesResult.data || [])[0] || null;
        const weekEntries = weekEntriesResult.data || [];
        const weekMinutes = weekEntries.reduce((sum: number, entry: any) => sum + Number(entry.duration || 0), 0);
        const weekOvertime = weekEntries.reduce((sum: number, entry: any) => sum + Number(entry.overtime || 0), 0);
        const expectedMinutes = expectedWeeklyMinutes(auth.employee.weeklySchedule);
        const receiptsByDocumentId = new Map((receiptsResult.data || []).map((receipt: any) => [receipt.documentId, receipt.readAt]));
        const documents = (documentsResult.data || []).map((document: any) => ({
            ...document,
            readAt: receiptsByDocumentId.get(document.id) || null,
        }));
        const unreadDocuments = documents.filter((document: any) => !document.readAt);
        const requiredUnreadDocuments = unreadDocuments.filter((document: any) => document.readRequired);
        const notices = [
            timeTrackingEnabled && !todayEntry ? {
                type: 'missing_time',
                severity: 'info',
                message: 'Fuer heute ist noch keine Arbeitszeit erfasst.',
            } : null,
            documentsEnabled && requiredUnreadDocuments.length > 0 ? {
                type: 'required_documents',
                severity: 'warning',
                message: `${requiredUnreadDocuments.length} Dokument(e) muessen noch gelesen werden.`,
            } : null,
            projectDiaryEnabled && assignedProjects.length === 0 ? {
                type: 'no_project_assignment',
                severity: 'info',
                message: 'Aktuell ist kein Projekt zugewiesen.',
            } : null,
        ].filter(Boolean);

        const employeeForDashboard = {
            ...employee,
            appAccess: {
                ...employee.appAccess,
                permissions,
            },
        };

        return NextResponse.json({
            date: todayKey,
            employee: employeeForDashboard,
            permissions,
            timeTracking: timeTrackingEnabled ? {
                today: buildTimeStatus(todayEntry),
                week: {
                    startDate: weekStart,
                    endDate: weekEnd,
                    totalMinutes: weekMinutes,
                    totalHours: Math.round((weekMinutes / 60) * 100) / 100,
                    expectedMinutes,
                    expectedHours: expectedMinutes === null ? null : Math.round((expectedMinutes / 60) * 100) / 100,
                    progress: expectedMinutes ? Math.min(1, weekMinutes / expectedMinutes) : null,
                    overtimeMinutes: weekOvertime,
                    entryCount: weekEntries.length,
                },
                timesheet: timesheet || {
                    id: `${auth.employeeId}-${month}`,
                    employeeId: auth.employeeId,
                    month,
                    status: 'draft',
                    finalizedAt: null,
                },
            } : null,
            projects: projectDiaryEnabled ? {
                assignments: assignedProjects,
                todayAssignment: assignedProjects[0] || null,
                count: assignedProjects.length,
            } : null,
            documents: documentsEnabled ? {
                recent: documents,
                unreadCount: unreadDocuments.length,
                requiredUnreadCount: requiredUnreadDocuments.length,
            } : null,
            notices,
        });
    } catch (error) {
        console.error('[MobileDashboard] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile dashboard' }, { status: 500 });
    }
}
