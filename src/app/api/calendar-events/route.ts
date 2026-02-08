import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM calendar_events WHERE userId = ?').all(userId);
        return NextResponse.json(rows.map((r: any) => ({
            ...r,
            isAllDay: r.isAllDay === 1,
            attendees: r.attendees ? JSON.parse(r.attendees) : []
        })));
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, event } = await request.json();
        const { id, title, description, startDate, endDate, startTime, endTime, isAllDay, type, color, location, attendees, projectId, createdAt } = event;

        const eventId = id || nanoid();
        const existing = db.prepare('SELECT id FROM calendar_events WHERE id = ?').get(eventId);

        if (existing) {
            db.prepare(`
                UPDATE calendar_events SET 
                title = ?, description = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?, isAllDay = ?, 
                type = ?, color = ?, location = ?, attendees = ?, projectId = ?
                WHERE id = ?
            `).run(
                title, description, startDate, endDate, startTime, endTime, isAllDay ? 1 : 0,
                type, color, location, JSON.stringify(attendees), projectId, eventId
            );
        } else {
            db.prepare(`
                INSERT INTO calendar_events (id, title, description, startDate, endDate, startTime, endTime, isAllDay, type, color, location, attendees, projectId, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                eventId, title, description, startDate, endDate, startTime, endTime, isAllDay ? 1 : 0,
                type, color, location, JSON.stringify(attendees), projectId, createdAt || new Date().toISOString(), userId
            );
        }
        return NextResponse.json({ success: true, id: eventId });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
