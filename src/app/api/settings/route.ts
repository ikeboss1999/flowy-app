import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('[API Settings] GET request for userId:', userId);

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM settings WHERE userId = ?');
        const row = stmt.get(userId) as any;
        console.log('[API Settings] DB Row found:', row ? 'Yes' : 'No');

        if (!row) {
            return NextResponse.json({
                companyData: null,
                accountSettings: null,
                invoiceSettings: null
            });
        }

        return NextResponse.json({
            companyData: row.companyData ? JSON.parse(row.companyData) : null,
            accountSettings: row.accountSettings ? JSON.parse(row.accountSettings) : null,
            invoiceSettings: row.invoiceSettings ? JSON.parse(row.invoiceSettings) : null
        });
    } catch (e) {
        console.error('[API Settings] GET Error:', e);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, type, data } = await request.json();
        console.log('[API Settings] POST request:', { userId, type, data });

        if (!userId || !type || !data) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Check if user settings exist
        const exists = db.prepare('SELECT userId FROM settings WHERE userId = ?').get(userId);

        if (!exists) {
            console.log('[API Settings] Creating new settings row for user');
            db.prepare('INSERT INTO settings (userId) VALUES (?)').run(userId);
        }

        const column = type === 'company' ? 'companyData' :
            type === 'account' ? 'accountSettings' :
                type === 'invoice' ? 'invoiceSettings' : null;

        if (!column) {
            return NextResponse.json({ error: 'Invalid settings type' }, { status: 400 });
        }

        const stmt = db.prepare(`UPDATE settings SET ${column} = ? WHERE userId = ?`);
        stmt.run(JSON.stringify(data), userId);
        console.log('[API Settings] Update successful');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[API Settings] POST Error:', e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
