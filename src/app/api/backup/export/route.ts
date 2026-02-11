import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const tables = ['projects', 'customers', 'invoices', 'settings', 'vehicles', 'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'];
        const data: any = {
            exportDate: new Date().toISOString(),
            version: '2.5', // Incremented version for hybrid support
            currentUserId: userId
        };

        if (isWeb) {
            for (const table of tables) {
                const { data: rows, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('userId', userId);

                if (error) {
                    console.warn(`[Export] Table ${table} fetch failed:`, error);
                    data[table] = [];
                } else {
                    data[table] = rows;
                }
            }
        } else {
            for (const table of tables) {
                try {
                    data[table] = sqliteDb.prepare(`SELECT * FROM ${table} WHERE userId = ?`).all(userId);
                } catch (e) {
                    console.warn(`[Export] Local Table ${table} fetch failed:`, e);
                    data[table] = [];
                }
            }
        }

        const totalRows = tables.reduce((acc, table) => acc + (data[table]?.length || 0), 0);
        console.log(`[Export] Successful: ${totalRows} rows collected.`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Backup export failed:', error);
        return NextResponse.json({ message: 'Backup export failed' }, { status: 500 });
    }
}
