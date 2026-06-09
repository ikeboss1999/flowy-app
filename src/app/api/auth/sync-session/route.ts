import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const accessToken = body.access_token;

        if (!accessToken) {
            return NextResponse.json({ error: 'No token provided' }, { status: 400 });
        }

        // Lazy imports so any module-init errors are caught by try-catch
        const { supabaseAdmin } = await import('@/lib/supabase-admin');
        const { supabase } = await import('@/lib/supabase');
        const { createSessionToken } = await import('@/lib/auth');

        const client = supabaseAdmin || supabase;
        const { data: { user }, error } = await client.auth.getUser(accessToken);

        if (error || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const sessionToken = await createSessionToken({
            userId: user.id,
            email: user.email || '',
            role: 'owner'
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/'
        });

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[SyncSession] Error:', message);
        return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
    }
}
