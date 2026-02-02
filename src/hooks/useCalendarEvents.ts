"use client";

import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'flowy_calendar_events';

export function useCalendarEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadEvents = async () => {
            try {
                const response = await fetch(`/api/calendar-events?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setEvents(data);
                } else {
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const local: CalendarEvent[] = JSON.parse(saved).filter((e: any) => e.userId === user.id);
                            for (const item of local) {
                                await fetch('/api/calendar-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, event: item })
                                });
                            }
                            setEvents(local);
                        } catch (e) { console.error(e); }
                    }
                }
            } catch (e) { console.error(e); }
            setIsLoading(false);
        };
        loadEvents();
    }, [user, authLoading]);

    const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => {
        if (!user) return;
        const newEvent: CalendarEvent = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            ...eventData,
            createdAt: new Date().toISOString()
        };
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, event: newEvent })
            });
            setEvents(prev => [...prev, newEvent]);
        } catch (e) { console.error(e); }
    };

    const updateEvent = async (id: string, eventData: Partial<CalendarEvent>) => {
        if (!user) return;
        const event = events.find(e => e.id === id);
        if (!event) return;
        const updated = { ...event, ...eventData };
        try {
            await fetch('/api/calendar-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, event: updated })
            });
            setEvents(prev => prev.map(e => e.id === id ? updated : e));
        } catch (e) { console.error(e); }
    };

    const deleteEvent = async (id: string) => {
        if (!user) return;
        try {
            await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' });
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (e) { console.error(e); }
    };

    return { events, addEvent, updateEvent, deleteEvent, isLoading: isLoading || authLoading };
}
