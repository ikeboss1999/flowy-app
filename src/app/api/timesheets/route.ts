import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM timesheets WHERE userId = ?').all(userId);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, timesheet } = await request.json();
        const { id, employeeId, month, status, finalizedAt } = timesheet;

        const existing = db.prepare('SELECT id FROM timesheets WHERE id = ?').get(id);

        if (existing) {
            db.prepare('UPDATE timesheets SET status = ?, finalizedAt = ? WHERE id = ?').run(status, finalizedAt, id);
        } else {
            db.prepare('INSERT INTO timesheets (id, employeeId, month, status, finalizedAt, userId) VALUES (?, ?, ?, ?, ?, ?)')
                .run(id, employeeId, month, status, finalizedAt, userId);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
