import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireApiSession();
    if (!auth.ok) return auth.response;
    const userId = auth.actorUserId;

    try {
        const client = supabaseAdmin || supabase;
        const { data: todos, error } = await client
            .from('todos')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false })
            .limit(200);
        if (error) throw error;
        return NextResponse.json(todos);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireApiSession();
    if (!auth.ok) return auth.response;
    const userId = auth.actorUserId;

    try {
        const payload = await request.json();
        const todo = payload.todo || payload;
        const todoId = todo.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('todos')
            .upsert({
                ...todo,
                id: todoId,
                userId,
                createdAt: todo.createdAt || now
            });
        if (error) throw error;

        return NextResponse.json({ success: true, id: todoId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireApiSession();
    if (!auth.ok) return auth.response;
    const userId = auth.actorUserId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('todos').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
