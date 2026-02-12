import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (isWeb) return NextResponse.json({ isWeb: true });

    try {
        // Check settings first as it's the primary user record
        const settings = sqliteDb.prepare('SELECT userId FROM settings LIMIT 1').get() as { userId: string } | undefined;
        if (settings?.userId) {
            return NextResponse.json({ userId: settings.userId });
        }

        // Check customers as a backup
        const customer = sqliteDb.prepare('SELECT userId FROM customers LIMIT 1').get() as { userId: string } | undefined;
        if (customer?.userId) {
            return NextResponse.json({ userId: customer.userId });
        }

        return NextResponse.json({ userId: null, message: 'Database is empty or unowned' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
