export type TimeEntryType = 'WORK' | 'VACATION' | 'SICK' | 'HOLIDAY';

export interface TimeEntry {
    id: string;
    employeeId: string;
    date: string; // ISO String YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    breakDuration: number; // in minutes
    type: TimeEntryType;
    projectId?: string;
    location?: string;
    overtime?: number; // Manual override or extra hours
    duration?: number; // Calculated duration in minutes
    notes?: string;
    createdAt: string;
    userId?: string; // Owner of the entry
}

export interface TimeTrackingStats {
    totalHours: number;
    totalOvertime: number; // simplified
    daysWorked: number;
    vacationDays: number;
}

export interface TimesheetMeta {
    id: string;
    employeeId: string;
    month: string; // YYYY-MM
    status: 'draft' | 'finalized';
    finalizedAt?: string;
    userId?: string; // Owner of the timesheet
}
