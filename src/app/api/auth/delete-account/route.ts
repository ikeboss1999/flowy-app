import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { wipeAccount } from '@/lib/account-wipe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let sessionUserId = '';
        let requestedUserId = '';

        const token = cookies().get('session_token')?.value;
        if (token) {
            const decoded = await verifySessionToken(token);
            if (decoded?.userId) sessionUserId = decoded.userId;
        }

        try {
            const body = await req.json();
            requestedUserId = body.userId || '';
        } catch (e) {
            // Body is optional; the session token is authoritative.
        }

        if (!sessionUserId || sessionUserId.length < 5) {
            return NextResponse.json({ message: 'Ungueltige oder fehlende Benutzer-ID' }, { status: 400 });
        }

        if (requestedUserId && requestedUserId !== sessionUserId) {
            return NextResponse.json({ message: 'Benutzer-ID stimmt nicht mit der aktuellen Sitzung ueberein.' }, { status: 403 });
        }

        const result = await wipeAccount(sessionUserId);

        if (!result.success) {
            return NextResponse.json({ error: result.message, details: result.details }, { status: 500 });
        }

        cookies().delete('session_token');

        return NextResponse.json({
            success: true,
            message: result.message
        });
    } catch (error: any) {
        console.error('[AccountDeletion] Fatal error:', error);
        return NextResponse.json({ message: 'Fehler beim Loeschen des Kontos: ' + error.message }, { status: 500 });
    }
}
