import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { wipeAccount } from '@/lib/account-wipe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let sessionUserId = '';
        let requestedUserId = '';
        let confirmation = '';
        let pin = '';

        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;
        if (token) {
            const decoded = await verifySessionToken(token);
            if (decoded?.userId) sessionUserId = decoded.userId;
        }

        try {
            const body = await req.json();
            requestedUserId = body.userId || '';
            confirmation = body.confirmation || '';
            pin = body.pin || '';
        } catch (e) {
            // Body is optional; the session token is authoritative.
        }

        if (!sessionUserId || sessionUserId.length < 5) {
            return NextResponse.json({ message: 'Ungueltige oder fehlende Benutzer-ID' }, { status: 400 });
        }

        if (requestedUserId && requestedUserId !== sessionUserId) {
            return NextResponse.json({ message: 'Benutzer-ID stimmt nicht mit der aktuellen Sitzung ueberein.' }, { status: 403 });
        }

        if (confirmation !== 'LÖSCHEN') {
            return NextResponse.json({ message: 'Die Löschbestätigung ist ungültig.' }, { status: 400 });
        }

        const { supabaseAdmin } = await import('@/lib/supabase-admin');
        if (!supabaseAdmin) return NextResponse.json({ message: 'Serverkonfiguration unvollständig.' }, { status: 500 });
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('accountSettings')
            .eq('userId', sessionUserId)
            .maybeSingle();
        if (settingsError) return NextResponse.json({ message: 'PIN konnte nicht geprüft werden.' }, { status: 500 });
        const savedPin = settings?.accountSettings?.pinCode;
        if (!savedPin || pin !== savedPin) {
            return NextResponse.json({ message: savedPin ? 'PIN ist nicht korrekt.' : 'Bitte legen Sie vor der Kontolöschung einen PIN fest.' }, { status: 403 });
        }

        const result = await wipeAccount(sessionUserId);

        if (!result.success) {
            return NextResponse.json({ error: result.message, details: result.details }, { status: 500 });
        }

        cookieStore.delete('session_token');

        return NextResponse.json({
            success: true,
            message: result.message,
            backupId: result.backupId,
            backupExpiresAt: result.backupExpiresAt,
        });
    } catch (error: any) {
        console.error('[AccountDeletion] Fatal error:', error);
        return NextResponse.json({ message: 'Fehler beim Loeschen des Kontos: ' + error.message }, { status: 500 });
    }
}
