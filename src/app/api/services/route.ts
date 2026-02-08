import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM services WHERE userId = ?').all(userId);
        return NextResponse.json(rows.map((row: any) => ({
            ...row,
            title: row.name // Map DB name back to Frontend title
        })));
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, service } = await request.json();
        const { id, title, description, category, price, unit } = service;

        const serviceId = id || nanoid();
        const existing = db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);

        if (existing) {
            db.prepare('UPDATE services SET name = ?, description = ?, category = ?, price = ?, unit = ? WHERE id = ?')
                .run(title, description, category, price, unit, serviceId);
        } else {
            db.prepare('INSERT INTO services (id, name, description, category, price, unit, userId) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(serviceId, title, description, category, price, unit, userId);
        }
        return NextResponse.json({ success: true, id: serviceId });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
