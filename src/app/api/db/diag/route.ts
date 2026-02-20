import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import sqliteDb from '@/lib/sqlite';
import { isWeb } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = cookies();
        const sessionToken = (await cookieStore).get('session_token')?.value;
        const sbAccessToken = (await cookieStore).get('sb-access-token')?.value;

        // Try a tiny DB query
        let dbStatus = 'unknown';
        let userCount = 0;
        try {
            const row = sqliteDb.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
            dbStatus = 'connected';
            userCount = row.count;
        } catch (e: any) {
            dbStatus = `error: ${e.message}`;
        }

        return NextResponse.json({
            status: 'Diagnostic Report',
            timestamp: new Date().toISOString(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                isWeb: isWeb,
                platform: process.platform,
                cwd: process.cwd()
            },
            auth: {
                hasSessionToken: !!sessionToken,
                sessionTokenPreview: sessionToken ? `${sessionToken.substring(0, 10)}...` : null,
                hasSbAccessToken: !!sbAccessToken,
                sbAccessTokenPreview: sbAccessToken ? `${sbAccessToken.substring(0, 10)}...` : null,
                allCookies: (await cookieStore).getAll().map(c => c.name)
            },
            database: {
                status: dbStatus,
                settingsCount: userCount
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
