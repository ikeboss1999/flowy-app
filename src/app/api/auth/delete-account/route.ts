import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import sqliteDb from '@/lib/sqlite';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const token = cookies().get('session_token')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 });
        }

        const decoded = await verifySessionToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ message: 'Ungültiges Token' }, { status: 401 });
        }

        const userId = decoded.userId;

        // 1. Delete data from SQLite
        const tables = ['customers', 'invoices', 'projects', 'settings', 'todos']; // Added todos just in case
        for (const table of tables) {
            try {
                const stmt = sqliteDb.prepare(`DELETE FROM ${table} WHERE userId = ?`);
                stmt.run(userId);
            } catch (e) {
                console.warn(`Table ${table} deletion failed or does not exist:`, e);
            }
        }

        // 2. Delete user from JSON DB
        const deleted = db.deleteUser(userId);

        if (!deleted) {
            console.warn(`User ${userId} not found in JSON DB during deletion.`);
        }

        // 3. Clear auth cookie
        cookies().delete('session_token');

        return NextResponse.json({ success: true, message: 'Konto und alle Daten wurden erfolgreich gelöscht.' });
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { message: 'Fehler beim Löschen des Kontos' },
            { status: 500 }
        );
    }
}
