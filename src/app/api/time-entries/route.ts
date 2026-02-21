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
            const { data: entries, error } = await client
                .from('time_entries')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(entries);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM time_entries WHERE userId = ?').all(userId);
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
        // Support both { entry: { ... } } and { ... }
        const entry = payload.entry || payload;
        const entryId = entry.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('time_entries')
                .upsert({
                    ...entry,
                    id: entryId,
                    userId, // Force userId
                    createdAt: entry.createdAt || now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO time_entries 
                (id, employeeId, date, startTime, endTime, duration, overtime, location, type, projectId, serviceId, description, userId, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                entryId, entry.employeeId, entry.date, entry.startTime, entry.endTime,
                entry.duration, entry.overtime, entry.location, entry.type,
                entry.projectId, entry.serviceId, entry.description, userId, entry.createdAt || now
            );

            // Silent Sync
            UnifiedDB.syncToCloud('time_entries', { ...entry, id: entryId, userId }, session);
        }

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
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('time_entries').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM time_entries WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM time_entries WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('TimeEntryAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('time_entries').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('TimeEntryAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Time entry delete failed', error);
                } else {
                    writeLog('TimeEntryAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
