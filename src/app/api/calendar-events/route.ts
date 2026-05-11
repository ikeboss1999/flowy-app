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
        const client = supabaseAdmin;
        if (!client) {
            console.error('[Calendar API GET] CRITICAL: supabaseAdmin is not configured.');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { data: events, error } = await client
            .from('calendar_events')
            .select('*')
            .eq('userId', userId);
        
        if (error) {
            console.error('[Calendar API GET] Supabase Error:', error);
            throw error;
        }
        
        return NextResponse.json(events || []);
    } catch (e: any) {
        console.error('[Calendar API GET] Server Error:', e);
        return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
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
        const event = payload.event || payload;
        const eventId = event.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin;
        if (!client) {
            console.error('[Calendar API] CRITICAL: supabaseAdmin is not configured. Service Role Key missing?');
            return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
        }

        const { error } = await client
            .from('calendar_events')
            .upsert({
                id: eventId,
                userId,
                title: event.title,
                description: event.description,
                startDate: event.startDate,
                endDate: event.endDate || event.startDate,
                startTime: event.startTime,
                endTime: event.endTime,
                isAllDay: event.isAllDay || false,
                type: event.type || 'work',
                location: event.location || '',
                color: event.color,
                attendees: event.attendees || [],
                projectId: event.projectId,
                updatedAt: now
            });
        
        if (error) {
            console.error('[Calendar API] Supabase Upsert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, id: eventId });
    } catch (e: any) {
        console.error('[Calendar API] Server Error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
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
        const { error } = await client.from('calendar_events').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
