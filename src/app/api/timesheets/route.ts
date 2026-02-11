import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        if (isWeb) {
            const { data: timesheets, error } = await supabase
                .from('timesheets')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(timesheets);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM timesheets WHERE userId = ?').all(userId);
            return NextResponse.json(rows);
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, timesheet } = await request.json();
        const { id, employeeId, month, status, finalizedAt } = timesheet;

        if (isWeb) {
            const { error } = await supabase
                .from('timesheets')
                .upsert({
                    id,
                    employeeId,
                    month,
                    status,
                    finalizedAt,
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO timesheets (id, employeeId, month, status, finalizedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(id, employeeId, month, status, finalizedAt, userId);

            // Silent Sync
            UnifiedDB.syncToCloud('timesheets', timesheet, userId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('timesheets').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM timesheets WHERE id = ?').run(id);

            if (userId) {
                supabase.from('timesheets').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Timesheet delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
