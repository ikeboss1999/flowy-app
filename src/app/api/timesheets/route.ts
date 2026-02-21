import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';
import { writeLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data: timesheets, error } = await client
                .from('timesheets')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(timesheets);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM timesheets WHERE userId = ?').all(userId);
            return NextResponse.json(rows);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
        // Support both { timesheet: { ... } } and { ... }
        const timesheet = payload.timesheet || payload;
        const timesheetId = timesheet.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('timesheets')
                .upsert({
                    ...timesheet,
                    id: timesheetId,
                    userId, // Force userId
                    finalizedAt: timesheet.finalizedAt || now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO timesheets (id, employeeId, month, status, finalizedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                timesheetId, timesheet.employeeId, timesheet.month, timesheet.status,
                timesheet.finalizedAt || now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('timesheets', { ...timesheet, id: timesheetId, userId }, session);
        }

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
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('timesheets').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM timesheets WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM timesheets WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('TimesheetAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('timesheets').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('TimesheetAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Timesheet delete failed', error);
                } else {
                    writeLog('TimesheetAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
