import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth-server';

export async function POST(request: Request) {
    const session = await getUserSession();

    let userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
        try {
            const body = await request.clone().json();
            userId = body.userId;
        } catch (e) { /* ignore */ }
    }

    // Ensure the requesting user can only wipe their own data
    if (session?.userId && userId && session.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID erforderlich' }, { status: 400 });
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
