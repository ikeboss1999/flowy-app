import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        if (isWeb) {
            const { data: entries, error } = await supabase
                .from('time_entries')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(entries);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM time_entries WHERE userId = ?').all(userId);
            return NextResponse.json(rows);
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, entry } = await request.json();
        const { id, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, createdAt, overtime, location } = entry;

        const entryId = id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const { error } = await supabase
                .from('time_entries')
                .upsert({
                    id: entryId,
                    employeeId,
                    date,
                    startTime,
                    endTime,
                    duration,
                    type,
                    projectId,
                    serviceId,
                    description,
                    overtime: overtime || 0,
                    location: location || '',
                    createdAt: createdAt || now,
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO time_entries (id, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, userId, createdAt, overtime, location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                entryId, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, userId, createdAt || now, overtime || 0, location || ''
            );

            // Silent Sync
            UnifiedDB.syncToCloud('time_entries', { ...entry, id: entryId }, userId);
        }

        return NextResponse.json({ success: true, id: entryId });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ message: 'Error saving entry', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('time_entries').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM time_entries WHERE id = ?').run(id);

            if (userId) {
                supabase.from('time_entries').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Time entry delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
