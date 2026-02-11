import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        if (isWeb) {
            const { data: events, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(events);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM calendar_events WHERE userId = ?').all(userId);
            return NextResponse.json(rows.map((r: any) => ({
                ...r,
                isAllDay: r.isAllDay === 1,
                attendees: r.attendees ? JSON.parse(r.attendees) : []
            })));
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, event } = await request.json();
        const { id, title, description, startDate, endDate, startTime, endTime, isAllDay, type, color, location, attendees, projectId, createdAt } = event;

        const eventId = id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const { error } = await supabase
                .from('calendar_events')
                .upsert({
                    id: eventId,
                    title,
                    description,
                    startDate,
                    endDate,
                    startTime,
                    endTime,
                    isAllDay: !!isAllDay,
                    type,
                    color,
                    location,
                    attendees,
                    projectId,
                    createdAt: createdAt || now,
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO calendar_events (id, title, description, startDate, endDate, startTime, endTime, isAllDay, type, color, location, attendees, projectId, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                eventId, title, description, startDate, endDate, startTime, endTime, isAllDay ? 1 : 0,
                type, color, location, JSON.stringify(attendees || []), projectId, createdAt || now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('calendar_events', { ...event, id: eventId }, userId);
        }

        return NextResponse.json({ success: true, id: eventId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('calendar_events').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);

            if (userId) {
                supabase.from('calendar_events').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Calendar event delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
