import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        if (isWeb) {
            if (!userId) return NextResponse.json({ isEmpty: true, recordCount: 0 });

            const tables = ['invoices', 'customers', 'projects', 'employees', 'vehicles', 'settings', 'services', 'todos', 'calendar_events', 'time_entries', 'timesheets'];
            let totalCount = 0;

            for (const table of tables) {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                    .eq('userId', userId);

                if (!error && count) {
                    totalCount += count;
                }
            }

            return NextResponse.json({
                isEmpty: totalCount === 0,
                recordCount: totalCount
            });
        } else {
            // Check main local tables for ANY data
            const counts = sqliteDb.prepare(`
                SELECT 
                    (SELECT COUNT(*) FROM invoices) +
                    (SELECT COUNT(*) FROM customers) +
                    (SELECT COUNT(*) FROM projects) +
                    (SELECT COUNT(*) FROM employees) +
                    (SELECT COUNT(*) FROM vehicles) +
                    (SELECT COUNT(*) FROM settings) +
                    (SELECT COUNT(*) FROM services) +
                    (SELECT COUNT(*) FROM todos) +
                    (SELECT COUNT(*) FROM calendar_events) +
                    (SELECT COUNT(*) FROM time_entries) +
                    (SELECT COUNT(*) FROM timesheets) as total_records
            `).get() as { total_records: number };

            return NextResponse.json({
                isEmpty: !counts || counts.total_records === 0,
                recordCount: counts?.total_records || 0
            });
        }
    } catch (error) {
        console.error("Status check failed:", error);
        return NextResponse.json({ isEmpty: false, error: "Failed to check status" }, { status: 500 });
    }
}
