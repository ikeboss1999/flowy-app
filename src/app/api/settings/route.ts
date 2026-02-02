import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM settings WHERE userId = ?');
        const row = stmt.get(userId) as any;

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
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, type, data } = await request.json();

        if (!userId || !type || !data) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Check if user settings exist
        const exists = db.prepare('SELECT userId FROM settings WHERE userId = ?').get(userId);

        if (!exists) {
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

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
