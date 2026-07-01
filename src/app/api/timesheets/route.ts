import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.companyOwnerId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const timesheet = payload.timesheet || payload;

        const timesheetId = timesheet.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { data: existing, error: existingError } = await client
            .from('timesheets')
            .select('*')
            .eq('id', timesheetId)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existing?.status === 'finalized' && timesheet.status === 'draft' && session.role !== 'admin' && session.role !== 'developer') {
            return NextResponse.json({ error: 'Only admins can reopen finalized timesheets' }, { status: 403 });
        }

        const { error } = await client
            .from('timesheets')
            .upsert({
                ...timesheet,
                id: timesheetId,
                userId: companyOwnerId,
                finalizedAt: timesheet.status === 'finalized' ? (timesheet.finalizedAt || now) : null
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
    const userId = session?.companyOwnerId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session?.role !== 'admin' && session?.role !== 'developer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
