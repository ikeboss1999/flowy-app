import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
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
        const client = supabaseAdmin || supabase;
        const { data: entries, error } = await client
            .from('time_entries')
            .select('*')
            .eq('userId', userId)
            .order('date', { ascending: false })
            .limit(1000);
        if (error) throw error;
        return NextResponse.json(entries);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();

    try {
        const payload = await request.json();

        let userId = session?.userId;
        if (!userId) userId = payload.userId;
        if (!userId && payload.entry) userId = payload.entry.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const entry = payload.entry || payload;
        const entryId = entry.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('time_entries')
            .upsert({
                ...entry,
                id: entryId,
                userId,
                createdAt: entry.createdAt || now
            });
        if (error) throw error;

        return NextResponse.json({ success: true, id: entryId });
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
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('time_entries').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
