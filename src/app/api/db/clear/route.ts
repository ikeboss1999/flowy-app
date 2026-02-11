import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        if (isWeb) {
            if (!userId) return NextResponse.json({ success: false, error: 'User ID required for cloud wipe' }, { status: 400 });

            const tables = ['invoices', 'customers', 'projects', 'employees', 'vehicles', 'settings', 'services', 'todos', 'calendar_events', 'time_entries', 'timesheets'];

            for (const table of tables) {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('userId', userId);

                if (error) console.error(`[DB Clear] Failed to clear ${table}:`, error);
            }

            return NextResponse.json({ success: true, message: "Cloud data wiped successfully" });
        } else {
            // Transaction to wipe all local data
            const wipe = sqliteDb.transaction(() => {
                sqliteDb.prepare("DELETE FROM projects").run();
                sqliteDb.prepare("DELETE FROM customers").run();
                sqliteDb.prepare("DELETE FROM invoices").run();
                sqliteDb.prepare("DELETE FROM settings").run();
                sqliteDb.prepare("DELETE FROM vehicles").run();
                sqliteDb.prepare("DELETE FROM employees").run();
                sqliteDb.prepare("DELETE FROM time_entries").run();
                sqliteDb.prepare("DELETE FROM timesheets").run();
                sqliteDb.prepare("DELETE FROM todos").run();
                sqliteDb.prepare("DELETE FROM calendar_events").run();
                sqliteDb.prepare("DELETE FROM services").run();
            });

            wipe();

            return NextResponse.json({ success: true, message: "Local database wiped successfully" });
        }
    } catch (error) {
        console.error("Wipe failed:", error);
        return NextResponse.json({ success: false, error: "Failed to wipe database" }, { status: 500 });
    }
}
