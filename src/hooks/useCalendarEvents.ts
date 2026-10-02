"use client";

import useSWR from 'swr';
import { CalendarEvent } from '@/types/calendar';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export function useCalendarEvents() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;

    const key = activeUserId ? `/api/calendar-events?userId=${activeUserId}` : null;
    const { data = [], isLoading, mutate } = useSWR<CalendarEvent[]>(key, fetcher, {
        revalidateOnMount: true,
        revalidateOnFocus: true,
    });

    const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => {
        if (!activeUserId) return;
        const newEvent: CalendarEvent = {
            id: Math.random().toString(36).substr(2, 9),
            userId: activeUserId,
            ...eventData,
            createdAt: new Date().toISOString()
        };
        mutate([...data, newEvent], false);
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, event: newEvent })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const updateEvent = async (id: string, eventData: Partial<CalendarEvent>) => {
        if (!activeUserId) return;
        const event = data.find(e => e.id === id);
        if (!event) return;
        const updatedEvent = { ...event, ...eventData };
        mutate(data.map(e => e.id === id ? updatedEvent : e), false);
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, event: updatedEvent })
            });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const deleteEvent = async (id: string) => {
        if (!activeUserId) return;
        mutate(data.filter(e => e.id !== id), false);
        try {
            await fetch(`/api/calendar-events?id=${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    return { events: data, addEvent, updateEvent, deleteEvent, isLoading };
}
