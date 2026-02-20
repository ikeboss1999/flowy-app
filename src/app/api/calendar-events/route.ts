import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data: events, error } = await client
                .from('calendar_events')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(events);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM calendar_events WHERE userId = ?').all(userId);
            return NextResponse.json(rows);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        // Support both { event: { ... } } and { ... }
        const event = payload.event || payload;
        const eventId = event.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('calendar_events')
                .upsert({
                    ...event,
                    id: eventId,
                    userId, // Force userId
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO calendar_events 
                (id, title, startDate, endDate, isAllDay, type, color, projectId, description, location, attendees, startTime, endTime, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                eventId,
                event.title,
                event.startDate || event.start,
                event.endDate || event.end,
                (event.isAllDay || event.allDay) ? 1 : 0,
                event.type,
                event.color,
                event.projectId,
                event.description,
                event.location,
                JSON.stringify(event.attendees || []),
                event.startTime,
                event.endTime,
                event.createdAt || now,
                now,
                userId
            );

            // Prepare data for Cloud Sync
            const syncData = {
                ...event,
                id: eventId,
                userId,
                updatedAt: now,
                startDate: event.startDate || event.start,
                endDate: event.endDate || event.end,
                isAllDay: !!(event.isAllDay || event.allDay)
            };

            // Silent Sync
            UnifiedDB.syncToCloud('calendar_events', syncData, userId);
        }

        return NextResponse.json({ success: true, id: eventId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('calendar_events').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM calendar_events WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM calendar_events WHERE id = ? AND userId = ?').run(id, userId);

            // Silent Sync
            const client = supabaseAdmin || supabase;
            client.from('calendar_events').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) console.error('[BackgroundSync] Calendar event delete failed', error);
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
