import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

function nextMonth(month: string) {
    const [year, monthIndex] = month.split('-').map(Number);
    if (!year || !monthIndex) return null;
    const date = new Date(Date.UTC(year, monthIndex, 1));
    return date.toISOString().slice(0, 7);
}

export async function GET(request: Request) {
    const startedAt = performance.now();
    const session = await getUserSession();
    const userId = session?.companyOwnerId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const requestedMonths = [
            searchParams.get('month'),
            ...(searchParams.get('months') || '').split(','),
        ]
            .map((month) => month?.trim())
            .filter((month): month is string => !!month && /^\d{4}-\d{2}$/.test(month))
            .sort();
        const summary = searchParams.get('summary') === '1';

        const client = supabaseAdmin || supabase;
        let query = client
            .from('time_entries')
            .select(summary ? 'id,employeeId,date' : '*')
            .eq('userId', userId)
            .order('date', { ascending: false });

        if (requestedMonths.length > 0) {
            const minMonth = requestedMonths[0];
            const maxMonth = requestedMonths[requestedMonths.length - 1];
            const upperMonth = nextMonth(maxMonth);
            if (upperMonth) {
                query = query.gte('date', `${minMonth}-01`).lt('date', `${upperMonth}-01`);
            }
        }

        const { data: entries, error } = await query.limit(summary ? 5000 : 1000);
        if (error) throw error;
        logApiPerformance('/api/time-entries', startedAt, { payload: entries });
        return NextResponse.json(entries);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.companyOwnerId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();

        const entry = payload.entry || payload;
        const entryId = entry.id || nanoid();
        const now = new Date().toISOString();
        const month = String(entry.date || '').slice(0, 7);

        const client = supabaseAdmin || supabase;
        const { data: timesheet, error: timesheetError } = await client
            .from('timesheets')
            .select('status')
            .eq('employeeId', entry.employeeId)
            .eq('month', month)
            .eq('userId', userId)
            .maybeSingle();

        if (timesheetError) throw timesheetError;
        if (timesheet && timesheet.status !== 'draft') {
            return NextResponse.json({ error: 'Locked timesheets cannot be changed' }, { status: 409 });
        }

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
    const userId = session?.companyOwnerId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: entry, error: entryError } = await client
            .from('time_entries')
            .select('employeeId,date')
            .eq('id', id)
            .eq('userId', userId)
            .maybeSingle();

        if (entryError) throw entryError;
        if (entry) {
            const { data: timesheet, error: timesheetError } = await client
                .from('timesheets')
                .select('status')
                .eq('employeeId', entry.employeeId)
                .eq('month', String(entry.date).slice(0, 7))
                .eq('userId', userId)
                .maybeSingle();
            if (timesheetError) throw timesheetError;
            if (timesheet && timesheet.status !== 'draft') {
                return NextResponse.json({ error: 'Locked timesheets cannot be changed' }, { status: 409 });
            }
        }

        const { error } = await client.from('time_entries').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
