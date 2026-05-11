"use client";

import useSWR from 'swr';
import { CalendarEvent } from '@/types/calendar';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useCalendarEvents() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/calendar-events?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<CalendarEvent[]>(key, fetcher);

    const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => {
        if (!user) return;
        const newEvent: CalendarEvent = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            ...eventData,
            createdAt: new Date().toISOString()
        };
        mutate([...data, newEvent], false);
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, event: newEvent })
            });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const updateEvent = async (id: string, eventData: Partial<CalendarEvent>) => {
        if (!user) return;
        const event = data.find(e => e.id === id);
        if (!event) return;
        const updatedEvent = { ...event, ...eventData };
        mutate(data.map(e => e.id === id ? updatedEvent : e), false);
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, event: updatedEvent })
            });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const deleteEvent = async (id: string) => {
        if (!user) return;
        mutate(data.filter(e => e.id !== id), false);
        try {
            await fetch(`/api/calendar-events?id=${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    return { events: data, addEvent, updateEvent, deleteEvent, isLoading };
}
