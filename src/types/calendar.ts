export type CalendarEventType = 'work' | 'personal' | 'important';

export interface CalendarEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
    type: CalendarEventType;
    color?: string;
    location?: string;
    attendees?: string[];
    projectId?: string;
    createdAt: string;
}
