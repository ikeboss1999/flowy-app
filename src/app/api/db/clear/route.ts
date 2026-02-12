import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';

export async function POST(request: Request) {
    let userId = new URL(request.url).searchParams.get('userId');

    // Also check body for userId
    if (!userId) {
        try {
            const body = await request.clone().json();
            userId = body.userId;
        } catch (e) { /* ignore */ }
    }

    try {
        // ALWAYS wipe local if not strictly web
        if (!isWeb) {
            console.log("[DB Clear] Wiping ALL local SQLite tables...");
            const wipe = sqliteDb.transaction(() => {
                const tables = ['projects', 'customers', 'invoices', 'settings', 'vehicles', 'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'];
                for (const t of tables) {
                    try { sqliteDb.prepare(`DELETE FROM ${t}`).run(); } catch (e) { }
                }
            });
            wipe();
        }

        // If userId is known, also wipe Cloud tables
        if (userId) {
            console.log(`[DB Clear] Wiping cloud tables for user ${userId}...`);
            const tables = ['invoices', 'customers', 'projects', 'employees', 'vehicles', 'settings', 'services', 'todos', 'calendar_events', 'time_entries', 'timesheets'];

            for (const table of tables) {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('userId', userId);

                if (error) console.error(`[DB Clear] Failed to clear cloud table ${table}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            message: userId ? "Lokale und Cloud-Daten gelöscht." : "Lokale Daten gelöscht. (Cloud wurde übersprungen da keine UserID)"
        });
    } catch (error) {
        console.error("Wipe failed:", error);
        return NextResponse.json({ success: false, error: "Failed to wipe database" }, { status: 500 });
    }
}
