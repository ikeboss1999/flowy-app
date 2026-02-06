import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM time_entries WHERE userId = ?').all(userId);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, entry } = await request.json();
        const { id, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, createdAt, overtime, location } = entry;

        const entryId = id || nanoid();
        const existing = db.prepare('SELECT id FROM time_entries WHERE id = ?').get(entryId);

        if (existing) {
            db.prepare(`
                UPDATE time_entries SET 
                employeeId = ?, date = ?, startTime = ?, endTime = ?, duration = ?, 
                type = ?, projectId = ?, serviceId = ?, description = ?, overtime = ?, location = ?
                WHERE id = ?
            `).run(
                employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, overtime || 0, location || '', entryId
            );
        } else {
            db.prepare(`
                INSERT INTO time_entries (id, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, userId, createdAt, overtime, location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                entryId, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, userId, createdAt || new Date().toISOString(), overtime || 0, location || ''
            );
        }
        return NextResponse.json({ success: true, id: entryId });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ message: 'Error saving entry', details: error.message }, { status: 500 });
    }
}
