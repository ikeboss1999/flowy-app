import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth-server';

export async function POST(request: Request) {
    const session = await getUserSession();

    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'employee') {
        return NextResponse.json({ success: false, error: 'Mitarbeiter sind nicht berechtigt, diese Aktion auszuführen' }, { status: 403 });
    }

    let userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
        try {
            const body = await request.clone().json();
            userId = body.userId;
        } catch (e) { /* ignore */ }
    }

    if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID erforderlich' }, { status: 400 });
    }

    // Ensure the requesting user can only wipe their own data
    if (session.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    try {
        const tables = ['invoices', 'customers', 'projects', 'employees', 'vehicles', 'settings', 'services', 'todos', 'calendar_events', 'time_entries', 'timesheets'];

        for (const table of tables) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('userId', userId);

            if (error) console.error(`[DB Clear] Failed to clear ${table}:`, error);
        }

        return NextResponse.json({ success: true, message: 'Daten gelöscht.' });
    } catch (error) {
        console.error('Wipe failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to wipe database' }, { status: 500 });
    }
}
