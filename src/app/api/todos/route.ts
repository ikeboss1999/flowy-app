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
            const { data: todos, error } = await supabase
                .from('todos')
                .select('*')
                .eq('userId', userId)
                .order('createdAt', { ascending: false });
            if (error) throw error;
            return NextResponse.json(todos);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM todos WHERE userId = ? ORDER BY createdAt DESC').all(userId);
            return NextResponse.json(rows.map((r: any) => ({ ...r, completed: r.completed === 1 })));
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, todo } = await request.json();
        const { id, task, completed, priority, createdAt } = todo;

        const todoId = id || nanoid();

        if (isWeb) {
            const { error } = await supabase
                .from('todos')
                .upsert({
                    id: todoId,
                    task,
                    completed: !!completed,
                    priority,
                    createdAt: createdAt || new Date().toISOString(),
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO todos (id, task, completed, priority, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(todoId, task, completed ? 1 : 0, priority, createdAt || new Date().toISOString(), userId);

            // Silent Sync
            UnifiedDB.syncToCloud('todos', { ...todo, id: todoId }, userId);
        }

        return NextResponse.json({ success: true, id: todoId });
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
            const { error } = await supabase.from('todos').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM todos WHERE id = ?').run(id);

            if (userId) {
                supabase.from('todos').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Todo delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
