export type CalendarEventType = 'work' | 'personal' | 'important';

export interface CalendarEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    date: string; // YYYY-MM-DD
    startTime?: string;
    endTime?: string;
    type: CalendarEventType;
    createdAt: string;
}
