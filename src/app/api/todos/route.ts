import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM todos WHERE userId = ? ORDER BY createdAt DESC').all(userId);
        return NextResponse.json(rows.map((r: any) => ({ ...r, completed: r.completed === 1 })));
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, todo } = await request.json();
        const { id, task, completed, priority, createdAt } = todo;

        const todoId = id || nanoid();
        const existing = db.prepare('SELECT id FROM todos WHERE id = ?').get(todoId);

        if (existing) {
            db.prepare('UPDATE todos SET task = ?, completed = ?, priority = ? WHERE id = ?')
                .run(task, completed ? 1 : 0, priority, todoId);
        } else {
            db.prepare('INSERT INTO todos (id, task, completed, priority, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)')
                .run(todoId, task, completed ? 1 : 0, priority, createdAt || new Date().toISOString(), userId);
        }
        return NextResponse.json({ success: true, id: todoId });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
