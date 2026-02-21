import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';
import { writeLog } from '@/lib/logger';

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
            const { data: todos, error } = await client
                .from('todos')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(todos);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM todos WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                completed: !!r.completed
            }));
            return NextResponse.json(data);
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
        // Support both { todo: { ... } } and { ... }
        const todo = payload.todo || payload;
        const todoId = todo.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('todos')
                .upsert({
                    ...todo,
                    id: todoId,
                    userId, // Force userId
                    createdAt: todo.createdAt || now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO todos (id, task, completed, priority, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                todoId, todo.task, todo.completed ? 1 : 0, todo.priority,
                todo.createdAt || now, now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('todos', { ...todo, id: todoId, userId, updatedAt: now }, session);
        }

        return NextResponse.json({ success: true, id: todoId });
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
            const { error } = await client.from('todos').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM todos WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM todos WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('TodoAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('todos').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('TodoAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Todo delete failed', error);
                } else {
                    writeLog('TodoAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
