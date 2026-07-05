import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { wipeAccount } from '@/lib/account-wipe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let userId = '';

        const token = cookies().get('session_token')?.value;
        if (token) {
            const decoded = await verifySessionToken(token);
            if (decoded?.userId) userId = decoded.userId;
        }

        if (!userId) {
            try {
                const body = await req.json();
                userId = body.userId;
            } catch (e) { /* ignore */ }
        }

        // CRITICAL SAFETY CHECK: Never delete without a valid userId
        if (!userId || userId.length < 5) {
            return NextResponse.json({ message: 'Ungültige oder fehlende Benutzer-ID' }, { status: 400 });
        }

        const result = await wipeAccount(userId);

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
        return NextResponse.json({ message: 'Fehler beim Löschen des Kontos: ' + error.message }, { status: 500 });
    }
}
