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
        const { data: timesheets, error } = await client
            .from('timesheets')
            .select('*')
            .eq('userId', userId);
        if (error) throw error;
        return NextResponse.json(timesheets);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();

    try {
        const payload = await request.json();
        const timesheet = payload.timesheet || payload;

        let userId = session?.userId;
        if (!userId) userId = payload.userId;
        if (!userId && timesheet) userId = timesheet.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const timesheetId = timesheet.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('timesheets')
            .upsert({
                ...timesheet,
                id: timesheetId,
                userId,
                finalizedAt: timesheet.finalizedAt || now
            });
        if (error) throw error;

        return NextResponse.json({ success: true, id: timesheetId });
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
        const { error } = await client.from('timesheets').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
