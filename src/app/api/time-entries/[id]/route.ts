import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const session = await getUserSession();
    const userId = session?.companyOwnerId;
    const { id } = params;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
            if (timesheet?.status === 'finalized') {
                return NextResponse.json({ error: 'Finalized timesheets cannot be changed' }, { status: 409 });
            }
        }

        const { error } = await client.from('time_entries').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
